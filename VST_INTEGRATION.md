# PRO VST Integration: Real-Time Preview & Processing

This document details the newly implemented VST integration for StemSplit PRO.

## Features
1. **Real-Time Preview**: Click the Play icon next to a VST to open its native GUI and hear the effect applied to the stem in real-time. Loops seamlessly.
2. **State Capture**: Tweaks made in the VST GUI (knobs, presets) are captured automatically.
3. **High-Fidelity Rendering**: When you click "APPLY FX", the exact state from the preview is used to render the final audio file using high-quality offline processing.

## How it Works
1. **Preview Mode**:
   - Launches `scripts/preview_vst.py`.
   - Uses `pedalboard` to host the VST and `sounddevice` for low-latency audio streaming.
   - Captures the plugin's internal state as a binary blob (base64 encoded) and sends it to the app every second.

2. **Application**:
   - The captured state is passed to `scripts/apply_fx.py`.
   - The script restores the plugin state precisely before processing the full file.

## Requirements
- Python Package: `sounddevice` (install via `pip install -r requirements.txt`)
- Python Package: `pedalboard`

## Troubleshooting
- If no audio is heard during preview, ensure your system's default output device is correct.
- If VST GUI doesn't open, ensure the plugin path is correct and valid (VST3 recommended).
- "Preview Failed": Check the console logs for Python errors.
