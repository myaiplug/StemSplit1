# Build and Install

## Prerequisites

- Visual Studio 2022 with C++ Desktop workload
- CMake 3.22+
- Git (for JUCE fetch)
- Inno Setup 6 (for installer)

## Build VST3

```powershell
cd vst3-temporal
./build.ps1 -Config Release
```

Expected output:

- `vst3-temporal/build/TemporalPortal_artefacts/Release/VST3/*.vst3`

## Engine signature smoke test

Run the deterministic engine-distinctness check from the workspace root:

```powershell
npm run test:vst3-engines
```

This validates that all slowdown engines produce distinct output signatures.

Run full profile coverage (Generic/Ableton/FL Studio/Reaper):

```powershell
npm run test:vst3-engines:profiles
```

This fails if any DAW voicing profile collapses engine separation.

## Create installer

```powershell
cd vst3-temporal/installer
./build-installer.ps1 -Config Release
```

If Inno Setup is installed at the default path, this creates:

- `vst3-temporal/installer/TemporalPortalVST3-Setup.exe`

If Inno Setup is not installed, the script still stages files in:

- `vst3-temporal/installer/stage/Temporal Portal.vst3`

You can manually copy that bundle into:

- `C:/Program Files/Common Files/VST3/`

## Verify in DAW

1. Rescan plugin paths in your DAW.
2. Load `Temporal Portal`.
3. Confirm UI appears and audio passes.
4. Automate `Wet Dry` and `Output` to confirm host parameter binding.
