# Pocket Soundwalk

A short listening interval and a private field journal, with real on-device
sound suggestions. New project started 11 October 2026 for DEV's **Touch Grass**
open-source AI challenge. Not yet entered; publication approval is pending.

## Run

```sh
npm ci
npm test
npm run dev -- --port 8874
```

Production: `npm run build` and `npm run preview -- --port 8874`.
The public static app is intended for GitHub Pages at
https://darshanahirrao.github.io/pocket-soundwalk/ . Deployment status is recorded
in `QA.md`; an intended URL alone is not proof of publication.

## Actual AI, Not a Hardcoded Demo

An Audio Spectrogram Transformer (AST) runs in a dedicated browser worker using
Transformers.js 4.3.1 and ONNX Runtime/WASM. The model is
[`Xenova/ast-finetuned-audioset-10-10-0.4593`](https://huggingface.co/Xenova/ast-finetuned-audioset-10-10-0.4593),
pinned to revision `249a1fbf0286b40e7f1ed687a8ae396997bf7dc6`, q8 weights.
The upstream [MIT model card](https://huggingface.co/MIT/ast-finetuned-audioset-10-10-0.4593)
declares BSD-3-Clause. Full attribution and license notice are in
`public/THIRD_PARTY_NOTICES.txt`.

The first intentional analysis downloads 90.8 MB of weights plus runtime assets.
No paid inference API, account, API key, payment method or backend is required.
Recordings are decoded/resampled locally with the browser's AudioContext and
OfflineAudioContext. Only the first 10 seconds are analyzed; 2 seconds minimum,
60 seconds decoded-duration maximum and 20 MB file-size maximum.

Quiet and clipped input is rejected before model inference. Broad suggestions
require a minimum score and reject near-ties across distinct sound groups.
These are conservative product gates, **not validated accuracy thresholds**.
Raw ranked scores remain visible; they are not calibrated probabilities.
There is no species identification, danger detection or research-grade claim.

## Observe Before Accepting a Guess

- Two-minute listening interval uses elapsed wall time, not JS tick counts.
  Pause/reset are available; the user need not watch the countdown.
- A human-confirmed note is distinct from the model's suggestions. No automatic
  prefilled observations, wildlife claims, streaks or location tracking.
- Garden tests are labeled **sample test / not outdoors** in the journal and
  exports. Manual notes, uploads and microphone clips have separate provenance.
- Notes and optional scores are saved locally. Audio is never persisted by the
  app. JSON/Markdown exports omit audio; delete has a consequence confirmation.
- If storage is blocked, the UI warns that notes are temporary and export works.

## Privacy Boundaries

No audio, notes or precise location are uploaded by this application. Public
model files are downloaded from Hugging Face/delivery hosts; the host and those
services still see ordinary connection metadata. There is no analytics script.
Microphone access is requested only after the user clicks Record. No permission
is automatically granted or background recording started.

Model/browser caches may help subsequent loads, but **offline availability is
not guaranteed**. A first-use download can be slow or fail; cancellation,
retry and manual notes remain available. Device performance varies.

## Reproducible Evidence

`npm test` covers input gates, uncertain/speech outcomes, duplicate/untrusted
storage, human confirmation, note/export validation and timer behavior. CI also
executes the real model against the checked-in public-domain sample and zero
samples, then publishes only if tests/audit/model/build pass.

To run the same real-model check locally (ffmpeg required):

```sh
mkdir -p artifacts
ffmpeg -hide_banner -loglevel error -i public/assets/garden.wav -f f32le artifacts/garden.f32
npm run check:model
```

The model check's JSON is measured evidence, not a dataset benchmark or an
accuracy estimate. Native browser QA also runs the actual WASM worker.
See `QA.md` for what passed and what remains unverified.

## Assets, Assistance and Limits

The garden clip is public-domain audio by ezwa, not our field recording. The
garden illustration was generated with native ImageGen, not a field photograph.
Provenance and the image prompt are in `ASSETS.md`. Lucide provides tool icons.

The project was designed, implemented and tested with coding-agent assistance.
No outdoor field outing or live-microphone performance is verified yet. No cash
award, accepted paid assignment or actual income is claimed.

Application source: MIT. Third-party assets/model retain their own notices.
