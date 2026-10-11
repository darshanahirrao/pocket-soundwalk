import { CLIP_SECONDS, SAMPLE_RATE } from "./model-config.js";
import { inspectAudio, MIN_SECONDS } from "./core.js";

export async function decodeClip(blob) {
  const context = new AudioContext();
  let decoded;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    await context.close();
  }
  if (decoded.duration < MIN_SECONDS)
    throw new Error("Record at least 2 seconds of audio.");
  if (decoded.duration > 60)
    throw new Error(
      "Choose a clip no longer than 60 seconds. Only the first 10 seconds are analyzed.",
    );
  const seconds = Math.min(CLIP_SECONDS, decoded.duration);
  const samples = Math.floor(seconds * SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, samples, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0, 0, seconds);
  const rendered = await offline.startRendering();
  const audio = rendered.getChannelData(0).slice();
  return {
    audio,
    inspection: inspectAudio(audio),
    originalSeconds: decoded.duration,
  };
}
