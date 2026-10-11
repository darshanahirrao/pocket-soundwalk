import { pipeline, env } from "@huggingface/transformers";
import { MODEL_ID, MODEL_REVISION } from "./model-config.js";
import { inspectAudio } from "./core.js";

env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let classifier;
let busy = false;
self.onmessage = async ({ data }) => {
  if (data.type !== "classify" || busy) return;
  busy = true;
  const send = (type, rest = {}) =>
    self.postMessage({ type, id: data.id, ...rest });
  try {
    const audio = new Float32Array(data.audio);
    const inspection = inspectAudio(audio);
    if (inspection.quiet || inspection.clipped) {
      send("result", { results: [], inspection, seconds: 0 });
      return;
    }
    if (!classifier) {
      send("status", { text: "Downloading the local model..." });
      classifier = await pipeline("audio-classification", MODEL_ID, {
        revision: MODEL_REVISION,
        dtype: "q8",
        device: "wasm",
        progress_callback: (progress) => {
          if (progress.status === "progress")
            send("progress", {
              file: progress.file,
              progress: progress.progress,
            });
          else if (progress.status === "ready")
            send("status", { text: "Model loaded. Listening..." });
        },
      });
    }
    send("status", { text: "Analyzing on this device..." });
    const start = performance.now();
    const results = await classifier(audio, { top_k: 10 });
    send("result", {
      results,
      inspection,
      seconds: (performance.now() - start) / 1000,
    });
  } catch (error) {
    classifier = undefined;
    send("error", {
      text: error instanceof Error ? error.message : "Local inference failed.",
    });
  } finally {
    busy = false;
  }
};
