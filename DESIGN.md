# Pocket Soundwalk

New project started 11 October 2026 IST for DEV's Touch Grass challenge.
No old project or repository is being reused as an entry.

## Audience and Promise

A person taking a short walk who wants to notice sounds, not scroll a feed.
Observe first; AI suggests broad sound classes only after a short recording.
The human decides what belongs in the journal. No species identification,
danger detection, field-research accuracy or outdoor test is claimed.

## Screen Plan

1. An unframed listening workspace with the real sound sample, local upload,
   optional microphone recording, model status and one primary listen action.
2. A two-minute screen-away listening interval with pause/reset and a plain
   observation form; no reward counters, map permissions or artificial streaks.
3. A local field journal with provenance, delete and export controls.
   A separate disclosure dialog carries exact model, asset and privacy facts.

## Visual System

White and pale cool-gray surfaces, ink #202921, forest #235341, coral #a13225
for a small secondary accent, yellow #f4d456 only as a nontext highlight.
No gradients, decorative orbs, floating page-section cards or negative tracking.
System sans for body, Georgia for restrained titles; 16px body, 24-36px titles.
Spacing 8/16/24/32/48px; tools 4px radius, repeated journal items 6px maximum.
44px minimum controls; visible keyboard focus; stable waveform and result space.
Native Lucide icons, real labels for forms, tabs for the three views.

## States and Evidence

Empty, loading/download progress, recording, decoded audio, actual inference,
quiet/unknown, decode error, worker failure, blocked mic, journal persistence
failure, delete confirmation and small-screen states must be implemented.
No model download before an intentional classify click. Explicit first-use
90.8MB weight download; recordings stay local. Assets are illustrative and the
demo sample is labeled public-domain, not our own field recording.

## QA Gates

Node tests, production build, genuine model inference, invalid/silent input,
desktop/390px/320px native browser review, no clipping or console errors, visible
image asset, functional journal/export/delete, network privacy inspection.
Native DEV account and final publication must wait for their respective terms
approvals. Publishing source/demo does not mean a submitted competition entry.
