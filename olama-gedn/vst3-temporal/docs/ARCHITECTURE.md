# Architecture

## Goal

Convert the existing frontend plugin page (`temporal.html`) into a DAW-loadable VST3 plugin while preserving visual identity.

## Layers

1. UI layer
- Hosted by `juce::WebBrowserComponent`
- Uses embedded BinaryData assets extracted at runtime to temp storage, then loads `temporal.html`

2. DSP layer
- Implemented in `Source/PluginProcessor.cpp`
- Uses JUCE DSP primitives:
  - low/high shelf EQ
  - compressor
  - chorus modulation
  - reverb
  - wet/dry mix
  - output gain stage

3. Parameter layer
- `juce::AudioProcessorValueTreeState`
- Automation-ready parameters
- Saved/restored in plugin state

5. Bridge layer
- JS -> C++: `temporal.html` emits `juce://set?param=...&value=...` on control changes
- C++ -> JS: editor timer pushes APVTS values into `window.__temporalBridge.applyFromHost(...)`
- This keeps DAW automation and web controls synchronized

4. Packaging layer
- Inno Setup installer script (`installer/TemporalPortalPlugin.iss`)
- Stages built `.vst3` and copies frontend assets into bundle resources

## Runtime asset resolution

The editor extracts embedded assets (`temporal.html`, `rubberband-worker.js`, `soundtouch-worklet.js`) to:

- `%TEMP%/TemporalPortalVST3/ui`

and loads the HTML via `file://` URL from that folder.

## Notes

- This system preserves the exact frontend page visual shell by loading the same HTML file.
- DSP behavior is implemented natively in C++ for DAW audio processing and host automation.
