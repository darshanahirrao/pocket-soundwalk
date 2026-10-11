# Verification, 11 October 2026

This is measured technical evidence, not a competition submission or an award.

## Passed Locally

- 64 Node tests: input size/type/duration/value gates, quiet/clipped audio,
  uncertain/cross-category ties, speech-versus-bird distinction, confirmation,
  untrusted/duplicate storage, exports without audio and interval wall time.
- Production Vite build succeeds. `node --check src/main.js` succeeds.
  `npm audit --audit-level=moderate` reports zero vulnerabilities after updating
  Transformers.js to the verified official4.3.1 release.
- Actual pinned q8 AST inference on the public-domain garden WAV: Node/CPU ranks
  Bird vocalization highest (score0.3383). Zero samples rank Silence highest.
  This is a smoke test on one known sample, not an accuracy benchmark.
- Actual native-browser WASM worker inference: Possible birdsong; measured
  inference5.4s after model loading, top score0.349. CPU/WASM outputs differ
  slightly; no universal performance or accuracy claim.
- A real silence WAV is decoded and rejected before inference. A real HTML
  file upload is rejected with the correct audio-file error.
- Browser journal save labels the entry Sample test / not outdoors. An actual
  JSON download contains the test note and ten model scores but no audio.
  Saved entry persists after reload. Delete confirmation and Keep note work;
  no permanent deletion was performed during QA.
- Interval starts at02:00; pause after actual elapsed time shows01:50;
  reset returns02:00. No invented outdoor walk or location is involved.
- Native visual checks at1280px,390px and320px: illustration decoded, no page
  horizontal overflow or offscreen visible controls. At320px the Listen,
  Walk, Journal and disclosure dialog were inspected. Heading spacing fixed;
  font sizes are static, with wrapping rather than viewport scaling.
- Native runtime logs showed no warning/error at the successful inference.
  The model loads only after Identify sound; no audio/note upload endpoint or
  analytics exists in the app code. Model assets still use the network.

## Publication Gate

The initial publication gate is now passed (11 October UTC):

- Public MIT source: https://github.com/darshanahirrao/pocket-soundwalk .
  Initial73d6a74; workflow-prerequisite fix2f8d45e changes no application code.
- [Hosted CI38115690227](https://github.com/darshanahirrao/pocket-soundwalk/actions/runs/38115690227)
  passes tests, audit, real model smoke, build and Pages deployment. The initial
  run38115609398 correctly stopped on a missing ffmpeg executable; setup now
  explicitly installs it. No gate was bypassed or test disabled.
- Hosted CPU/model evidence ranks Bird vocalization at0.3470 and Silence at
  0.6372 for zero input; measured inference-pair time2.02s. Only smoke evidence,
  not scientific accuracy or a timing guarantee.
- Actual published demo: https://darshanahirrao.github.io/pocket-soundwalk/ .
  Native deployed WASM classification returned Possible birdsong, score0.349,
  measured5.3s after loading. Real sample/waveform/illustration decoded;
  no runtime errors/warnings. Public1280/390/320px review shows no page overflow.
- Local390px text-contrast checks pass68 elements across Listen/Walk/Journal,
  with no failures. Actual JSON and Markdown downloads both inspected; no audio.
- Unmodified native deployed captures are in `public/screenshots/`. These are
  actual app evidence; the separate garden artwork remains illustrative only.

DEV account sign-in terms approval is requested and unanswered. No account or
competition entry has been created by this run. Final contest publication/rules
approval will be required at that action. Deadline:12Oct06:59UTC /12:29IST.
No DEV article/account/competition entry is verified. No award or payment.

## Remaining Limits

No outdoor field test, real microphone permission/recording test, physical
mobile-device performance test or offline-availability test. Small-screen review
uses the native browser's responsive viewport, not a real phone.

The90.8MB weights plus runtime assets can be heavy on slow/low-memory devices.
Cancel/retry/manual notes are provided; host/model availability is not guaranteed.
The input gates are conservative heuristics, not scientific calibration. Model
classes are broad, not species or danger identification. Storage-disabled handling
is implemented but not artificially forced through browser security settings.

Full license notices and native-generated artwork/sample provenance are retained.
No API key, paid inference service, paid hosting or payment method is used.
