# Conversion Scope

## What is exact

- The frontend shell is the same `temporal.html` page copied from the web app.
- UI design language, control labels, and interaction style are preserved.
- Frontend assets are embedded in the plugin binary and extracted at runtime, so deployment is self-contained.

## What is native

- DAW audio processing is handled by native C++ DSP code.
- Plugin automation/state are host-native via VST3 parameters.

## Current engine mapping

- `Basic`: native DSP path
- `SoundTouch (Pro)`, `Rubberband (WASM)`, `Paulstretch`, `Granular`: currently represented in parameter model and UI, with DSP behavior consolidated into the native path in this version

## Extension points

- Add per-engine DSP implementations inside `updateDSPFromParameters()` and `processBlock()`.
- Add bidirectional UI-to-parameter bridge between `WebBrowserComponent` and APVTS if deep sync is needed.
