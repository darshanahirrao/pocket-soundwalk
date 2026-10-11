import "./style.css";
import {
  createIcons,
  AudioLines,
  Info,
  Headphones,
  Footprints,
  NotebookPen,
  ArrowUpRight,
  Mic,
  Upload,
  Bird,
  ScanLine,
  X,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Square,
} from "lucide";
import {
  JOURNAL_KEY,
  addEntry,
  createEntry,
  exportJournal,
  interpret,
  loadEntries,
  remainingSeconds,
  validateFile,
  waveform,
} from "./core.js";
import { decodeClip } from "./audio.js";

const icons = {
  AudioLines,
  Info,
  Headphones,
  Footprints,
  NotebookPen,
  ArrowUpRight,
  Mic,
  Upload,
  Bird,
  ScanLine,
  X,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Square,
};
const refreshIcons = () => createIcons({ icons });
const $ = (id) => document.getElementById(id);
const textNode = (tag, text, className) => {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};
let clip = null;
let audioUrl = null;
let modelResults = [];
let worker = null;
let busy = false;
let preparing = false;
let nextJobId = 0;
let activeJobId = null;
let entries = [];
let storageAvailable = true;
let pendingDeleteId = null;
let recorder = null;
let recordingStream = null;
let recordingTimeout = null;
let timerState = { endAt: null, pausedSeconds: 120 };

function setStatus(text, error = false) {
  $("model-status").textContent = text;
  $("model-status").classList.toggle("error", error);
}

function setBusy(value) {
  busy = value;
  $("analyze-button").disabled =
    value || preparing || recorder !== null || clip === null;
  for (const id of ["sample-button", "record-button", "audio-file"])
    $(id).disabled = value || preparing;
  $("cancel-button").hidden = !value;
  $("model-progress").hidden = !value;
}

function setView(name, focus = false) {
  for (const tab of document.querySelectorAll("[role=tab]")) {
    const selected = tab.dataset.view === name;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(tab.getAttribute("aria-controls")).hidden = !selected;
    if (selected && focus) tab.focus();
  }
}
for (const tab of document.querySelectorAll("[role=tab]")) {
  tab.addEventListener("click", () => setView(tab.dataset.view));
  tab.addEventListener("keydown", (event) => {
    const views = ["listen", "walk", "journal"];
    const index = views.indexOf(tab.dataset.view);
    let next;
    if (event.key === "ArrowRight") next = views[(index + 1) % views.length];
    if (event.key === "ArrowLeft") next = views[(index + 2) % views.length];
    if (event.key === "Home") next = views[0];
    if (event.key === "End") next = views[2];
    if (next) {
      event.preventDefault();
      setView(next, true);
    }
  });
}
$("walk-shortcut").addEventListener("click", () => setView("walk", true));
$("about-button").addEventListener("click", () =>
  $("about-dialog").showModal(),
);
$("about-close").addEventListener("click", () => $("about-dialog").close());

async function prepareClip(blob, name, source) {
  preparing = true;
  setBusy(false);
  setStatus("Decoding audio locally...");
  try {
    const decoded = await decodeClip(blob);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(blob);
    clip = { ...decoded, name, source };
    modelResults = [];
    $("audio-player").src = audioUrl;
    $("audio-player").hidden = false;
    $("clip-name").textContent = name;
    $("clip-duration").textContent =
      decoded.inspection.seconds.toFixed(1) + " s";
    const sourceLabel =
      source === "sample"
        ? "Public-domain sample / ezwa / not our field recording."
        : source === "microphone"
          ? "Microphone clip / kept on this device."
          : "Local file / kept on this device.";
    $("clip-provenance").textContent =
      sourceLabel +
      (decoded.originalSeconds > 10.1 ? " First 10 seconds analyzed." : "");
    $("waveform").replaceChildren(
      ...waveform(decoded.audio).map((value) => {
        const span = document.createElement("span");
        span.style.height = `${Math.max(2, Math.sqrt(value) * 62)}px`;
        return span;
      }),
    );
    $("result-title").textContent = "Sound suggestions";
    $("result-note").textContent =
      "No result yet. Scores will be suggestions, not certainty.";
    $("results").replaceChildren();
    $("inference-time").textContent = "";
    $("listen-confirm").checked = false;
    $("listen-form-status").textContent = "";
    setStatus(
      decoded.inspection.quiet
        ? "This clip is very quiet; no sound identification will be made."
        : "Clip ready.",
    );
  } catch (error) {
    setStatus(
      error.message || "This audio could not be decoded. Try WAV or MP3.",
      true,
    );
  } finally {
    preparing = false;
    setBusy(false);
  }
}

$("sample-button").addEventListener("click", async () => {
  preparing = true;
  setBusy(false);
  setStatus("Opening the public-domain garden sample...");
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}assets/garden.wav`,
    );
    if (!response.ok)
      throw new Error(
        "The sample could not be opened. Choose a local audio file.",
      );
    await prepareClip(
      await response.blob(),
      "Garden / public-domain sample",
      "sample",
    );
  } catch (error) {
    preparing = false;
    setBusy(false);
    setStatus(error.message, true);
  }
});
$("audio-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    validateFile(file);
    await prepareClip(file, file.name, "upload");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    event.target.value = "";
  }
});

function showResults(results, inspection, seconds) {
  modelResults = results;
  const interpreted = interpret(results, inspection);
  $("result-title").textContent = interpreted.title;
  $("result-note").textContent =
    interpreted.kind === "suggestion"
      ? "Model scores, not probabilities. Your ears have the final say."
      : interpreted.kind === "quiet"
        ? "No model call was made for this quiet input."
        : interpreted.kind === "clipped"
          ? "No model call was made. Try a quieter recording level."
          : "No reliable broad category. Keep your own observation instead.";
  $("results").replaceChildren(
    ...interpreted.ranked.slice(0, 5).map((result) => {
      const li = document.createElement("li");
      li.append(
        textNode("span", result.label),
        textNode("span", result.score.toFixed(3), "score"),
      );
      return li;
    }),
  );
  $("inference-time").textContent =
    seconds > 0 ? seconds.toFixed(1) + " s / local" : "Input gate";
  $("listen-confirm").checked = false;
  setStatus("Finished. Nothing was uploaded.");
}

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
  });
  worker.onmessage = ({ data }) => {
    if (data.id !== activeJobId) return;
    if (data.type === "status") setStatus(data.text);
    else if (data.type === "progress") {
      const progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
      $("model-progress").value = progress;
      setStatus(`Downloading ${data.file} / ${Math.round(progress)}%`);
    } else if (data.type === "result") {
      try {
        showResults(data.results, data.inspection, data.seconds);
      } catch (error) {
        setStatus(error.message, true);
      }
      setBusy(false);
      $("model-download").textContent =
        data.seconds > 0
          ? "Model loaded in this session. No paid inference service."
          : "Input checked locally, without downloading model weights.";
    } else if (data.type === "error") {
      setStatus(
        "Local model failed. Cancel/retry, or save a manual note. " + data.text,
        true,
      );
      setBusy(false);
      worker?.terminate();
      worker = null;
    }
  };
  worker.onerror = () => {
    setStatus("The local worker stopped. Retry, or save a manual note.", true);
    setBusy(false);
    worker?.terminate();
    worker = null;
  };
  return worker;
}
$("analyze-button").addEventListener("click", () => {
  if (!clip || busy || preparing || recorder) return;
  if (clip.inspection.quiet || clip.inspection.clipped) {
    showResults([], clip.inspection, 0);
    return;
  }
  setBusy(true);
  $("model-progress").value = 0;
  setStatus("Starting local analysis...");
  try {
    activeJobId = ++nextJobId;
    const copy = clip.audio.slice();
    getWorker().postMessage(
      { type: "classify", audio: copy.buffer, id: activeJobId },
      [copy.buffer],
    );
  } catch (error) {
    setStatus(error.message, true);
    setBusy(false);
  }
});
$("cancel-button").addEventListener("click", () => {
  worker?.terminate();
  worker = null;
  activeJobId = null;
  setBusy(false);
  setStatus("Analysis canceled. Your clip is still here.");
});

function stopRecording() {
  clearTimeout(recordingTimeout);
  if (recorder?.state === "recording") recorder.stop();
  recordingStream?.getTracks().forEach((track) => track.stop());
  recordingStream = null;
}
$("record-button").addEventListener("click", async () => {
  if (recorder) {
    stopRecording();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setStatus(
      "Recording is unavailable in this browser. Open a local audio file instead.",
      true,
    );
    return;
  }
  preparing = true;
  setBusy(false);
  setStatus("Waiting for microphone permission...");
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const chunks = [];
    recorder = new MediaRecorder(recordingStream);
    const mimeType = recorder.mimeType;
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      recorder = null;
      $("record-button").innerHTML = '<i data-lucide="mic"></i>Record';
      $("record-button").removeAttribute("aria-pressed");
      refreshIcons();
      $("sample-button").disabled = false;
      $("audio-file").disabled = false;
      await prepareClip(
        new Blob(chunks, { type: mimeType }),
        "Microphone / local clip",
        "microphone",
      );
    };
    recorder.start();
    preparing = false;
    $("record-button").disabled = false;
    $("record-button").innerHTML = '<i data-lucide="square"></i>Stop recording';
    $("record-button").setAttribute("aria-pressed", "true");
    refreshIcons();
    setStatus("Recording up to 10 seconds...");
    recordingTimeout = setTimeout(stopRecording, 10000);
  } catch (error) {
    recordingStream?.getTracks().forEach((track) => track.stop());
    recordingStream = null;
    recorder = null;
    preparing = false;
    setBusy(false);
    setStatus(
      error.name === "NotAllowedError"
        ? "Microphone permission was declined. Open an audio file instead."
        : "Recording failed. Open an audio file instead.",
      true,
    );
  }
});

function saveJournal() {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  renderJournal();
}
function renderJournal() {
  $("journal-count").textContent = String(entries.length);
  $("export-button").disabled = entries.length === 0;
  $("storage-note").textContent = storageAvailable
    ? "Notes saved in this browser. Audio is not saved."
    : "Browser storage is unavailable. Notes are temporary: export before closing this page.";
  if (!entries.length) {
    const empty = textNode("div", "", "empty-journal");
    empty.append(
      textNode("h3", "A quiet page, for now."),
      textNode("p", "No saved observations.", "meta"),
    );
    const button = textNode("button", "Add a field note", "text-button");
    button.addEventListener("click", () => setView("walk", true));
    empty.append(button);
    $("journal-entries").replaceChildren(empty);
    return;
  }
  $("journal-entries").replaceChildren(
    ...entries.map((entry) => {
      const article = document.createElement("article");
      article.className = "journal-entry";
      const date = document.createElement("div");
      const time = textNode(
        "time",
        new Date(entry.observedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      time.dateTime = entry.observedAt;
      date.append(
        time,
        textNode(
          "span",
          entry.source === "sample"
            ? "Sample test / not outdoors"
            : entry.source === "manual"
              ? "Manual observation"
              : "Audio-assisted note",
          "entry-source",
        ),
      );
      const body = textNode("div", "", "entry-body");
      body.append(textNode("p", entry.observation));
      if (entry.place) body.append(textNode("p", entry.place, "meta"));
      if (entry.results.length) {
        const details = document.createElement("details");
        const list = document.createElement("ul");
        list.append(
          ...entry.results.map((r) =>
            textNode("li", `${r.label} / ${r.score.toFixed(3)}`),
          ),
        );
        details.append(
          textNode("summary", "Model suggestions / not probabilities"),
          list,
        );
        body.append(details);
      }
      const remove = document.createElement("button");
      remove.className = "icon-button";
      remove.title = "Delete field note";
      remove.setAttribute(
        "aria-label",
        "Delete field note from " + time.textContent,
      );
      remove.innerHTML = '<i data-lucide="trash-2"></i>';
      remove.addEventListener("click", () => {
        pendingDeleteId = entry.id;
        $("delete-dialog").showModal();
      });
      article.append(date, body, remove);
      return article;
    }),
  );
  refreshIcons();
}

function addNote(event, view) {
  event.preventDefault();
  const status = $(view + "-form-status");
  try {
    const entry = createEntry({
      id: crypto.randomUUID(),
      now: new Date(),
      observation: $(view + "-observation").value,
      place: view === "walk" ? $("walk-place").value : "",
      confirmed: $(view + "-confirm").checked,
      source: view === "listen" ? (clip?.source ?? "manual") : "manual",
      results: view === "listen" ? modelResults : [],
    });
    entries = addEntry(entries, entry);
    saveJournal();
    event.target.reset();
    status.textContent = storageAvailable
      ? "Field note saved."
      : "Note kept temporarily. Export it before closing.";
    status.classList.remove("error");
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}
$("listen-note").addEventListener("submit", (event) =>
  addNote(event, "listen"),
);
$("walk-note").addEventListener("submit", (event) => addNote(event, "walk"));
$("delete-cancel").addEventListener("click", () => {
  pendingDeleteId = null;
  $("delete-dialog").close();
});
$("delete-confirm").addEventListener("click", () => {
  entries = entries.filter((entry) => entry.id !== pendingDeleteId);
  pendingDeleteId = null;
  saveJournal();
  $("delete-dialog").close();
});
$("delete-dialog").addEventListener("close", () => {
  pendingDeleteId = null;
});
$("export-button").addEventListener("click", () => {
  if (!entries.length) return;
  const format = $("export-format").value;
  const url = URL.createObjectURL(
    new Blob([exportJournal(entries, format)], {
      type: format === "json" ? "application/json" : "text/markdown",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `soundwalk-journal-${new Date().toISOString().slice(0, 10)}.${format === "json" ? "json" : "md"}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  $("journal-status").textContent = "Journal exported without audio.";
});

function renderTimer() {
  const remaining = remainingSeconds(timerState, Date.now());
  $("timer").textContent =
    `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const running = timerState.endAt !== null && remaining > 0;
  const icon = running ? "pause" : "play";
  const label = running
    ? "Pause interval"
    : remaining === 0
      ? "Start again"
      : timerState.pausedSeconds < 120
        ? "Resume interval"
        : "Start interval";
  if ($("timer-toggle").dataset.state !== label) {
    $("timer-toggle").innerHTML =
      `<i data-lucide="${icon}"></i><span>${label}</span>`;
    $("timer-toggle").dataset.state = label;
    refreshIcons();
  }
  if (timerState.endAt !== null && remaining === 0) {
    timerState = { endAt: null, pausedSeconds: 0 };
    $("timer-status").textContent =
      "The interval is complete. What did you notice?";
  }
}
$("timer-toggle").addEventListener("click", () => {
  const remaining = remainingSeconds(timerState, Date.now());
  if (timerState.endAt !== null && remaining > 0) {
    timerState = { endAt: null, pausedSeconds: remaining };
    $("timer-status").textContent = "Interval paused.";
  } else {
    timerState = {
      endAt: Date.now() + (remaining || 120) * 1000,
      pausedSeconds: remaining || 120,
    };
    $("timer-status").textContent =
      "Listening interval started. No screen needed.";
  }
  renderTimer();
});
$("timer-reset").addEventListener("click", () => {
  timerState = { endAt: null, pausedSeconds: 120 };
  $("timer-status").textContent = "Two minutes. No screen needed.";
  renderTimer();
});
setInterval(renderTimer, 500);
document.addEventListener("visibilitychange", renderTimer);

try {
  entries = loadEntries(localStorage.getItem(JOURNAL_KEY));
} catch {
  storageAvailable = false;
}
refreshIcons();
renderJournal();
renderTimer();
window.addEventListener("pagehide", () => {
  stopRecording();
  worker?.terminate();
  worker = null;
  activeJobId = null;
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    setBusy(false);
    setStatus("Ready to analyze again.");
  }
});
