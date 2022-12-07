// Video Editing
let editly = import('editly');
const extractAudio = require('ffmpeg-extract-audio');
const { getVideoDurationInSeconds } = require('get-video-duration');

// Tiktok Splash Detection
const extractFrames = require('ffmpeg-extract-frames');
const pixels = require('image-pixels');

// File Management
const fs = require('fs-extra');

// Editing Spec
let TIKTOK_AUDIO_DESYNC = 1 / 30;
const TIKTOK_AVAILABLE_DESYNCS = { SPLASH: 1 / 30, NOSPLASH: 4 / 30 };
const TIKTOK_WATERMARK_DURATION = 4;
const TIKTOK_SPLASH_RGB = [14, 14, 26];
const EDIT_SPEC = require('./resource/editspec.json');

function updateEditSpec(SONG_ID, duration) {
	if(TIKTOK_AUDIO_DESYNC === TIKTOK_AVAILABLE_DESYNCS.SPLASH) duration -= TIKTOK_WATERMARK_DURATION;

	EDIT_SPEC.clips[0].layers[0].path = `./input/${SONG_ID}.mp4`;
	EDIT_SPEC.clips[0].layers[0].cutTo = duration;
	EDIT_SPEC.outPath = `output/${SONG_ID}.mp4`;
	EDIT_SPEC.audioTracks[0].start = TIKTOK_AUDIO_DESYNC; // Set the desync offset
}
async function generateVideo(SONG_ID, duration) {
	updateEditSpec(SONG_ID, duration);
	await editly(EDIT_SPEC);
}

async function getAudioFile(SONG_ID) {
	await extractAudio({
		input: `input/${SONG_ID}.mp4`,
		output: 'resource/current.mp3'
	});
}

async function checkForTiktokSplash(SONG_ID, duration) {
	await extractFrames({
		input: `./input/${SONG_ID}.mp4`,
		output: './resource/frame.jpg',
		offsets: [
			(duration - TIKTOK_WATERMARK_DURATION / 2) * 1000
		]
	});

	// Load the pixel data of the saved frame
	const { data, width, height } = await pixels('./resource/frame.jpg');


	let splashPixelCount = 0;
	let notSplashPixelCount = 0;
	for (let a = 0; a < data.length; a += 4) {
		if (data[a] === TIKTOK_SPLASH_RGB[0] && data[a + 1] === TIKTOK_SPLASH_RGB[1] && data[a + 2] === TIKTOK_SPLASH_RGB[2]) splashPixelCount++;
		else notSplashPixelCount++;
	}

	// If the tiktok splash RGBA makes up more than 85% of the screen we can safely assume it's the tiktok watermark splash screen
	if (0.85 < splashPixelCount / (data.length / 4)) return true;
	else return false;
}

function cleanup() {
	fs.rmSync('resource/current.mp3');
	fs.rmSync('resource/frame.jpg');
}

async function processSong(SONG_ID) {
	await new Promise(async resolve => {
		await getAudioFile(SONG_ID);

		// From a local path...
		getVideoDurationInSeconds(`./input/${SONG_ID}.mp4`).then(async (duration) => {
			// Check if we have a splash screen at the end of the video
			const hasSplashScreenToRemove = await checkForTiktokSplash(SONG_ID, duration);
			if (hasSplashScreenToRemove) {
				console.log(`SPLASH: ${SONG_ID}`);
				TIKTOK_AUDIO_DESYNC = TIKTOK_AVAILABLE_DESYNCS.SPLASH;
			} else {
				console.log(`NO: ${SONG_ID}`);
				TIKTOK_AUDIO_DESYNC = TIKTOK_AVAILABLE_DESYNCS.NOSPLASH;
			}

			// Generate the video
			await generateVideo(SONG_ID, duration);

			return resolve();
		});
	});
}

async function init() {
	editly = (await editly).default;
	EDIT_SPEC.clips = [{ layers: [{ type: 'video', path: `./input/PLACEHOLDER.mp4`, resizeMode: 'cover' }] }];
}

async function run() {
	await init();

	fs.ensureDirSync('output');

	const files = fs.readdirSync('input');
	for(const file of files){
		const SONG_ID = file.split('.mp4')[0];
		console.log(`PROCESSING: ${SONG_ID}`);
		await processSong(SONG_ID);
		cleanup();
	}

	console.log("DONE!");
}
run();