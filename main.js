// Video Editing
let editly = import('editly');
const extractAudio = require('ffmpeg-extract-audio');
const { getVideoDurationInSeconds } = require('get-video-duration');

// File Management
const fs = require('fs-extra');

// Editing Spec
const TIKTOK_AUDIO_DESYNC = 1 / 30;
const TIKTOK_WATERMARK_DURATION = 4;
const EDIT_SPEC = require('./resource/editspec.json');

function updateEditSpec(SONG_ID) {
	EDIT_SPEC.clips = [
		{ layers: [{ type: 'video', path: `./input/${SONG_ID}.mp4`, resizeMode: 'cover' }] }
	];
	EDIT_SPEC.outPath = `output/${SONG_ID}.mp4`;
}

async function getAudioFile(SONG_ID) {
	await extractAudio({
		input: `input/${SONG_ID}.mp4`,
		output: 'resource/current.mp3'
	});
}

async function checkForTiktokSplash(duration) {
	await extractFrames({
		input: 'media/1.mp4',
		output: './screenshot-%i.jpg',
		offsets: [
			1000,
			2000,
			3500
		]
	})
}

async function processSong(SONG_ID) {
	await new Promise(async resolve => {
		await getAudioFile(SONG_ID);
		updateEditSpec(SONG_ID);

		// From a local path...
		getVideoDurationInSeconds(`./input/${SONG_ID}.mp4`).then(async (duration) => {
			console.log(duration);
			// await checkForTiktokSplash(duration);


			// Edit the video
			// EDIT_SPEC.clips[0].layers[0].cutTo = duration - TIKTOK_WATERMARK_DURATION;
			// await editly(EDIT_SPEC);

			fs.rmSync('resource/current.mp3');

			resolve();
		});
	});
}

async function init() {
	EDIT_SPEC.audioTracks[0].start = TIKTOK_AUDIO_DESYNC; // Set the desync offset
	editly = (await editly).default;
}

async function run() {
	await init();

	fs.ensureDirSync('output');

	// const files = fs.readdirSync('input');
	// for(const file of files){
	// 	const SONG_ID = file.split('.mp4')[0];
	// 	console.log(SONG_ID);
	// 	await processSong(SONG_ID);
	// }

	const SONG_ID = "v09044g40000ce84fg3c77uaj3m40ho0";
	await processSong(SONG_ID);
	// const SONG_ID = 'v09044g40000ce3bqgrc77u2htivur7g';
	console.log("DONE!");
}
run();