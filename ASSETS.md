# Assets and Provenance

- `public/assets/garden.wav`: first10s of ezwa's public-domain
  [Birds singing in garden](https://commons.wikimedia.org/wiki/File:Birds_singing_in_garden.ogg).
  Converted with ffmpeg to16kHz mono WAV. This is not our field recording.
- `public/assets/garden-illustration.png`: native built-in ImageGen,11Oct2026.
  Inspected visually: clear two birds, grass/path, no text/false data. Illustrative
  only. No CLI/API fallback, no new paid service or API key.

## Final Image Prompt

Use case: illustration-story. Asset type: small landscape header and article
cover for Pocket Soundwalk, an open-source private audio-listening tool. Primary
request: a crisp editorial linocut-style illustration of a small garden seen at
walking height, two ordinary songbirds on a branch, tall grass at the bottom and
a quiet footpath. Flat printed shapes with subtle paper texture, restrained
forest green, coral accents, clean white negative space and bright yellow details.
Wide landscape3:2 composition. Clear recognizable birds and plants, no humans,
no phone, no fake data, no charts, no letters or text, no logos, no gradients, no
glowing effects, no decorative orbs. This is visibly illustrated artwork, not
evidence of a real field outing.

The90.8MB q8 AST weight file is fetched from a pinned Hugging Face revision;
it is not committed. See `public/THIRD_PARTY_NOTICES.txt`.

## Actual App Captures

`public/screenshots/live-inference.png` and `mobile-inference.png` are unmodified
native screenshots of the published GitHub Pages app on11October2026, with real
WASM model results. These are separate from the generated garden illustration.
No field recording/trip, fake interface or human participation is asserted.
