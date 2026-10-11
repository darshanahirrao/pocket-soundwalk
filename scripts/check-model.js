import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pipeline, env } from "@huggingface/transformers";
import assert from "node:assert/strict";
import { MODEL_ID, MODEL_REVISION } from "../src/model-config.js";

env.cacheDir = "./.cache/models";
const raw = await readFile(new URL("../artifacts/garden.f32", import.meta.url));
const audio = new Float32Array(
  raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
);
const start = performance.now();
const classify = await pipeline("audio-classification", MODEL_ID, {
  revision: MODEL_REVISION,
  dtype: "q8",
  device: "cpu",
});
const loadedAt = performance.now();
const garden = await classify(audio, { top_k: 10 });
const silence = await classify(new Float32Array(160000), { top_k: 5 });
assert.match(garden[0].label, /Bird|Chirp/);
assert.ok(garden[0].score >= 0.12);
assert.equal(silence[0].label, "Silence");
const result = {
  measuredAt: new Date().toISOString(),
  model: MODEL_ID,
  revision: MODEL_REVISION,
  dtype: "q8",
  transformersVersion: "4.3.1",
  device: "cpu",
  sample: "First 10 seconds of public-domain Birds singing in garden by ezwa",
  inputSamples: audio.length,
  modelLoadSeconds: (loadedAt - start) / 1000,
  inferencePairSeconds: (performance.now() - loadedAt) / 1000,
  garden,
  silence,
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/model-feasibility.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
await classify.dispose();
