import test from "node:test";
import assert from "node:assert/strict";
import {
  addEntry,
  cleanResults,
  createEntry,
  exportJournal,
  inspectAudio,
  interpret,
  loadEntries,
  remainingSeconds,
  validateFile,
  waveform,
} from "../src/core.js";

const audio = (value = 0.05, seconds = 10) =>
  new Float32Array(seconds * 16000).fill(value);
const entryInput = {
  id: "test-note-1",
  now: "2026-10-11T05:20:00Z",
  observation: "A test observation of the licensed clip.",
  place: "",
  confirmed: true,
  source: "sample",
  results: [{ label: "Bird", score: 0.3 }],
};

for (const extension of ["wav", "mp3", "ogg", "m4a", "webm", "flac", "aac"]) {
  test(`accepts ${extension} without MIME information`, () =>
    assert.doesNotThrow(() =>
      validateFile({ name: `x.${extension}`, size: 100, type: "" }),
    ));
}
for (const [name, file] of Object.entries({
  missing: null,
  empty: { size: 0, type: "audio/wav" },
  oversized: { size: 20971521, type: "audio/wav" },
  html: { size: 100, type: "text/html", name: "x.html" },
  infinite: { size: Infinity, type: "audio/wav" },
})) {
  test(`rejects ${name} file`, () => assert.throws(() => validateFile(file)));
}
test("accepts maximum file boundary", () =>
  assert.doesNotThrow(() =>
    validateFile({ size: 20971520, type: "audio/wav" }),
  ));
test("quiet gate catches zero samples", () =>
  assert.equal(inspectAudio(audio(0)).quiet, true));
test("quiet gate catches subthreshold level", () =>
  assert.equal(inspectAudio(audio(0.001)).quiet, true));
test("quiet gate preserves ordinary level", () =>
  assert.equal(inspectAudio(audio()).quiet, false));
test("clipping gate catches sustained saturation", () =>
  assert.equal(inspectAudio(audio(1)).clipped, true));
test("isolated saturated sample does not reject whole clip", () => {
  const x = audio();
  x[0] = 1;
  assert.equal(inspectAudio(x).clipped, false);
});
test("inspection includes accurate duration and RMS", () => {
  const value = inspectAudio(audio(0.05, 2));
  assert.equal(value.seconds, 2);
  assert.ok(Math.abs(value.rms - 0.05) < 1e-6);
});
for (const [name, values] of Object.entries({
  short: audio(0, 1),
  long: audio(0, 11),
  nan: new Float32Array(32000).fill(NaN),
  outOfRange: audio(2),
  ordinaryArray: [0, 1],
})) {
  test(`rejects ${name} audio`, () =>
    assert.throws(() => inspectAudio(values)));
}
test("rejects invalid sample rate", () =>
  assert.throws(() => inspectAudio(audio(), 0)));
test("waveform has a fixed bin count", () => {
  const value = waveform(audio(), 70);
  assert.equal(value.length, 70);
  assert.ok(value.every((v) => v > 0 && v <= 1));
});
test("empty waveform remains bounded", () =>
  assert.deepEqual(waveform(new Float32Array(), 2), [0, 0]));
test("waveform rejects excessive/invalid bin counts", () => {
  assert.deepEqual(waveform(audio(), 10000), []);
  assert.deepEqual(waveform([], 10), []);
});
test("results are validated, sorted and deduplicated", () => {
  assert.deepEqual(
    cleanResults([
      { label: "Bird", score: 0.3 },
      { label: "Rain", score: 0.4 },
      { label: "Bird", score: 0.9 },
      { label: "bad", score: NaN },
      { label: "bad", score: 2 },
    ]),
    [
      { label: "Rain", score: 0.4 },
      { label: "Bird", score: 0.3 },
    ],
  );
});
test("invalid result shape is rejected", () =>
  assert.throws(() => cleanResults(null)));
test("results cannot grow beyond ten classes", () =>
  assert.equal(
    cleanResults(
      Array.from({ length: 20 }, (_, i) => ({ label: String(i), score: 0.5 })),
    ).length,
    10,
  ));
test("bird lead becomes a qualified broad suggestion", () =>
  assert.equal(
    interpret(
      [
        { label: "Bird vocalization, bird call, bird song", score: 0.338 },
        { label: "Environmental noise", score: 0.23 },
      ],
      inspectAudio(audio()),
    ).title,
    "Possible birdsong",
  ));
test("speech is not mislabeled as wildlife", () =>
  assert.equal(
    interpret(
      [
        { label: "Speech", score: 0.8 },
        { label: "Bird", score: 0.1 },
      ],
      inspectAudio(audio()),
    ).suggestion,
    "Voices",
  ));
test("low model score remains uncertain", () =>
  assert.equal(
    interpret([{ label: "Bird", score: 0.1 }], inspectAudio(audio()))
      .suggestion,
    null,
  ));
test("silence result remains uncertain even with loud input", () =>
  assert.equal(
    interpret([{ label: "Silence", score: 0.8 }], inspectAudio(audio())).kind,
    "uncertain",
  ));
test("conflicting sound classes remain uncertain", () =>
  assert.equal(
    interpret(
      [
        { label: "Bird", score: 0.31 },
        { label: "Traffic noise, roadway noise", score: 0.3 },
      ],
      inspectAudio(audio()),
    ).kind,
    "uncertain",
  ));
test("related bird classes do not become a false conflict", () =>
  assert.equal(
    interpret(
      [
        { label: "Bird", score: 0.31 },
        { label: "Chirp, tweet", score: 0.3 },
      ],
      inspectAudio(audio()),
    ).suggestion,
    "Birdsong",
  ));
test("generic environment is not forced into nature", () =>
  assert.equal(
    interpret(
      [{ label: "Environmental noise", score: 0.9 }],
      inspectAudio(audio()),
    ).kind,
    "uncertain",
  ));
test("quiet input discards tempting model output", () =>
  assert.equal(
    interpret([{ label: "Bird", score: 1 }], inspectAudio(audio(0))).ranked
      .length,
    0,
  ));
test("clipping never becomes a confident observation", () =>
  assert.equal(
    interpret([{ label: "Bird", score: 1 }], inspectAudio(audio(1))).kind,
    "clipped",
  ));
test("valid entry retains sample provenance", () => {
  const value = createEntry(entryInput);
  assert.equal(value.source, "sample");
  assert.equal(value.observedAt, "2026-10-11T05:20:00.000Z");
});
for (const [name, override] of Object.entries({
  noConfirmation: { confirmed: false },
  empty: { observation: "" },
  long: { observation: "x".repeat(501) },
  unknownSource: { source: "field-proven" },
  date: { now: "bad" },
  id: { id: "" },
})) {
  test(`entry rejects ${name}`, () =>
    assert.throws(() => createEntry({ ...entryInput, ...override })));
}
test("place label is trimmed and bounded", () =>
  assert.equal(
    createEntry({ ...entryInput, place: "x".repeat(100) }).place.length,
    80,
  ));
test("truthy strings cannot fake observation confirmation", () =>
  assert.throws(() => createEntry({ ...entryInput, confirmed: "false" })));
test("invalid persisted confirmation is discarded", () =>
  assert.deepEqual(
    loadEntries(
      JSON.stringify([{ ...createEntry(entryInput), confirmed: "true" }]),
    ),
    [],
  ));
test("raw audio and extra private metadata do not enter journal", () => {
  const value = createEntry({
    ...entryInput,
    audio: "not-to-store",
    latitude: 18,
  });
  assert.equal("audio" in value, false);
  assert.equal("latitude" in value, false);
});
test("broken storage JSON gives an empty safe journal", () =>
  assert.deepEqual(loadEntries("{"), []));
test("untrusted storage shapes are ignored", () =>
  assert.deepEqual(loadEntries('{"entries":[]}'), []));
test("malformed and duplicate entries are filtered", () => {
  const value = createEntry(entryInput);
  assert.equal(loadEntries(JSON.stringify([value, {}, value])).length, 1);
});
test("maximum journal count is enforced", () =>
  assert.throws(() =>
    addEntry(
      new Array(100).fill(createEntry(entryInput)),
      createEntry({ ...entryInput, id: "new" }),
    ),
  ));
test("new notes are newest first", () =>
  assert.equal(
    addEntry(
      [createEntry(entryInput)],
      createEntry({ ...entryInput, id: "new" }),
    )[0].id,
    "new",
  ));
test("JSON export is parseable and has no audio", () => {
  const value = JSON.parse(exportJournal([createEntry(entryInput)]));
  assert.equal(value.entries.length, 1);
  assert.ok(value.notice.includes("No audio"));
});
test("Markdown export discloses sample, not outdoor evidence", () =>
  assert.ok(
    exportJournal([createEntry(entryInput)], "markdown").includes(
      "not an outdoor observation",
    ),
  ));
test("Markdown metacharacters cannot become injected links/HTML", () => {
  const result = exportJournal(
    [
      createEntry({
        ...entryInput,
        observation: "<script>alert(1)</script> [fake](https://bad.test)",
      }),
    ],
    "markdown",
  );
  assert.ok(result.includes("\\<script\\>"));
  assert.ok(result.includes("\\[fake\\]"));
});
test("unsupported export format rejected", () =>
  assert.throws(() => exportJournal([], "exe")));
test("interval tracks wall time, not number of JS ticks", () =>
  assert.equal(
    remainingSeconds({ endAt: 121000, pausedSeconds: 120 }, 71000),
    50,
  ));
test("paused interval stays fixed", () =>
  assert.equal(
    remainingSeconds({ endAt: null, pausedSeconds: 50 }, 1000000),
    50,
  ));
test("finished interval stays at zero", () =>
  assert.equal(remainingSeconds({ endAt: 1000, pausedSeconds: 1 }, 10000), 0));
test("remaining seconds rounds upwards", () =>
  assert.equal(remainingSeconds({ endAt: 1501, pausedSeconds: 1 }, 1000), 1));
