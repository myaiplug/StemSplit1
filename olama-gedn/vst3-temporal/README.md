# Temporal Portal VST3 Conversion System

This folder contains a full conversion pipeline from the frontend in [temporal.html](../temporal.html) to a distributable VST3 plugin for Windows.

## What this system provides

- JUCE+CMake VST3 plugin project
- Web-based plugin UI that loads the shipped Temporal frontend page
- Native DSP core with automatable plugin parameters
- Windows installer packaging via Inno Setup
- Build and packaging scripts

## Quick start

1. Build plugin:

```powershell
cd vst3-temporal
./build.ps1 -Config Release
```

2. Build installer:

```powershell
cd vst3-temporal/installer
./build-installer.ps1 -Config Release
```

3. Install the generated `TemporalPortalVST3-Setup.exe`.

## Important implementation note

The Temporal frontend assets are embedded into the plugin binary and extracted at runtime into `%TEMP%/TemporalPortalVST3/ui`, then loaded in the plugin WebView.

The native DSP is implemented in C++ and maps to the same control model as the web UI (`Time Shift`, `Pitch Bend`, `Key`, `Detune`, `Sauce`, `Wet/Dry`, `Output`, `Engine`).

## Structure

- `CMakeLists.txt`: JUCE VST3 project
- `Source/`: plugin processor/editor implementation
- `assets/`: copied frontend assets from root project
- `installer/`: Inno Setup script and packaging helper
- `docs/`: architecture and build docs
