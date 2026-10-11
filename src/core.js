import { CLIP_SECONDS, MAX_FILE_BYTES, SAMPLE_RATE } from "./model-config.js";

export const JOURNAL_KEY = "pocket-soundwalk.journal.v1";
export const MIN_SECONDS = 2;
export const MAX_ENTRIES = 100;

export function validateFile(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0)
    throw new Error("Choose a nonempty audio file.");
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Choose a file smaller than 20 MB.");
  if (
    !/^audio\//.test(file.type ?? "") &&
    !/\.(wav|mp3|ogg|m4a|webm|flac|aac)$/i.test(file.name ?? "")
  ) {
    throw new Error(
      "Choose a WAV, MP3, Ogg, M4A, WebM, FLAC or AAC audio file.",
    );
  }
}

export function inspectAudio(samples, sampleRate = SAMPLE_RATE) {
  if (
    !(samples instanceof Float32Array) ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0
  ) {
    throw new Error("The decoded audio is not usable.");
  }
  if (samples.length < MIN_SECONDS * sampleRate)
    throw new Error("Record at least 2 seconds of audio.");
  if (samples.length > CLIP_SECONDS * sampleRate)
    throw new Error("Only the first 10 seconds may be analyzed.");
  let energy = 0;
  let peak = 0;
  let clipped = 0;
  for (const value of samples) {
    if (!Number.isFinite(value) || Math.abs(value) > 1.01)
      throw new Error("Audio contains invalid sample values.");
    energy += value * value;
    peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) >= 0.999) clipped += 1;
  }
  const rms = Math.sqrt(energy / samples.length);
  return {
    seconds: samples.length / sampleRate,
    rms,
    peak,
    quiet: rms < 0.003,
    clipped: clipped / samples.length > 0.01,
  };
}

export function waveform(samples, bins = 70) {
  if (
    !(samples instanceof Float32Array) ||
    !Number.isInteger(bins) ||
    bins < 1 ||
    bins > 500
  )
    return [];
  const result = [];
  for (let i = 0; i < bins; i += 1) {
    let peak = 0;
    const from = Math.floor((i * samples.length) / bins);
    const to = Math.floor(((i + 1) * samples.length) / bins);
    for (let j = from; j < to; j += 1)
      peak = Math.max(peak, Math.abs(samples[j]));
    result.push(Math.min(1, peak));
  }
  return result;
}

const groups = [
  ["Birdsong", /^(Bird|Bird vocalization, bird call, bird song|Chirp, tweet)$/],
  [
    "Water",
    /^(Water|Stream|Waterfall|Rain|Rain on surface|Waves, surf|Ocean|Gurgling)$/,
  ],
  ["Wind", /^(Wind|Wind noise \(microphone\)|Rustling leaves|Rustle)$/],
  ["Insects", /^(Insect|Cricket|Mosquito|Fly, housefly|Bee, wasp, etc\.)$/],
  [
    "Traffic",
    /^(Traffic noise, roadway noise|Car|Motor vehicle \(road\)|Truck|Bus|Motorcycle)$/,
  ],
  [
    "Voices",
    /^(Speech|Conversation|Narration, monologue|Child speech, kid speaking|Chatter)$/,
  ],
  ["Music", /^(Music|Musical instrument|Singing)$/],
];

export function cleanResults(results) {
  if (!Array.isArray(results))
    throw new Error("No model results were returned. Try another clip.");
  const seen = new Set();
  return results
    .filter((r) => {
      if (
        !r ||
        typeof r.label !== "string" ||
        r.label.length > 150 ||
        !Number.isFinite(r.score) ||
        r.score < 0 ||
        r.score > 1 ||
        seen.has(r.label)
      )
        return false;
      seen.add(r.label);
      return true;
    })
    .map(({ label, score }) => ({ label, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function interpret(results, inspection) {
  const ranked = cleanResults(results);
  if (inspection.quiet)
    return {
      title: "Too quiet to suggest",
      kind: "quiet",
      suggestion: null,
      ranked: [],
    };
  if (inspection.clipped)
    return {
      title: "Clipped audio; try again",
      kind: "clipped",
      suggestion: null,
      ranked,
    };
  const top = ranked[0];
  if (!top || top.score < 0.12 || top.label === "Silence")
    return {
      title: "Not sure what this is",
      kind: "uncertain",
      suggestion: null,
      ranked,
    };
  const group = groups.find(([, pattern]) => pattern.test(top.label));
  if (!group)
    return {
      title: "Mixed or unfamiliar sounds",
      kind: "uncertain",
      suggestion: null,
      ranked,
    };
  const conflicting = ranked.find((r) =>
    groups.some(
      ([name, pattern]) => name !== group[0] && pattern.test(r.label),
    ),
  );
  if (conflicting && top.score - conflicting.score < 0.03)
    return {
      title: "Several sounds; listen again",
      kind: "uncertain",
      suggestion: null,
      ranked,
    };
  return {
    title: `Possible ${group[0].toLowerCase()}`,
    kind: "suggestion",
    suggestion: group[0],
    ranked,
  };
}

export function createEntry({
  id,
  now,
  observation,
  place,
  confirmed,
  source,
  results = [],
}) {
  const text = String(observation ?? "").trim();
  if (text.length < 3 || text.length > 500)
    throw new Error("Write an observation between 3 and 500 characters.");
  if (confirmed !== true)
    throw new Error("Confirm that this is your own observation before saving.");
  if (!["sample", "upload", "microphone", "manual"].includes(source))
    throw new Error("Unknown observation source.");
  if (typeof id !== "string" || !id || id.length > 80)
    throw new Error("The journal entry needs an ID.");
  const date = new Date(now);
  if (!Number.isFinite(date.getTime()))
    throw new Error("The observation needs a valid date.");
  return {
    id,
    observedAt: date.toISOString(),
    observation: text,
    place: String(place ?? "")
      .trim()
      .slice(0, 80),
    source,
    confirmed: true,
    results: cleanResults(results),
  };
}

export function loadEntries(raw) {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set();
    return data.slice(0, MAX_ENTRIES).flatMap((item) => {
      try {
        const entry = createEntry({ ...item, now: item.observedAt });
        if (seen.has(entry.id)) return [];
        seen.add(entry.id);
        return [entry];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export function addEntry(entries, entry) {
  if (entries.length >= MAX_ENTRIES)
    throw new Error(
      "The journal is full (100 entries). Export it before removing an entry.",
    );
  return [entry, ...entries.filter((item) => item.id !== entry.id)];
}

export function exportJournal(entries, format = "json") {
  const safe = loadEntries(JSON.stringify(entries));
  const notice =
    "Human-confirmed notes; model scores are suggestions, not calibrated probabilities. No audio is stored in this export.";
  if (format === "json")
    return (
      JSON.stringify({ schemaVersion: 1, notice, entries: safe }, null, 2) +
      "\n"
    );
  if (format !== "markdown") throw new Error("Unsupported export format.");
  const plain = (text) =>
    String(text)
      .replace(/[\r\n]+/g, " ")
      .replace(/[<>&`*_\[\]#!|\\]/g, (char) => `\\${char}`);
  return (
    "# Pocket Soundwalk Journal\n\n" +
    notice +
    "\n\n" +
    safe
      .map((entry) => {
        const scores = entry.results
          .map((r) => `- ${plain(r.label)}: ${r.score.toFixed(3)}`)
          .join("\n");
        return `## ${entry.observedAt}\n\n${plain(entry.observation)}\n\nPlace: ${plain(entry.place || "Not recorded")}\nSource: ${entry.source === "sample" ? "Public-domain sample test (not an outdoor observation)" : entry.source}\n\n${scores ? "Model scores:\n" + scores + "\n" : ""}`;
      })
      .join("\n")
  );
}

export function remainingSeconds({ endAt, pausedSeconds }, now) {
  if (endAt === null) return Math.max(0, Math.ceil(pausedSeconds));
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}
