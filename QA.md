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

Public source, hosted CI/model smoke, GitHub Pages and deployed native-browser
validation are not yet verified at the time of this initial QA note. Record
their exact links below after successful publication; never infer deployment
from a planned URL.

DEV account sign-in terms approval is requested and unanswered. No account or
competition entry has been created by this run. Final contest publication/rules
approval will be required at that action. Deadline:12Oct06:59UTC /12:29IST.

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
