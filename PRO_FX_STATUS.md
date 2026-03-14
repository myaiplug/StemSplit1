# Pro FX Rack Status

This document tracks the implementation status of the audio effects in the Pro FX Rack system.

## Current Effect Modules

| Effect        |      ID       | Wired (UI) | Functional (Backend) | Grade | Notes |
| :---               | :---     | :---:   | :---: | :---: | :--- |
| **Pro Gate**       | `gate`   | ✅            | ✅                            | 100%  | Full params mapped: Threshold, Ratio, Attack, Release. Uses `pedalboard.NoiseGate`. |
| **Studio Comp**    | `comp`   | ✅ | ✅                            | 90%   | Threshold, Ratio, Attack, Release mapped. `makeup` gain added. `mix` parameter is currently ignored by backend (needs parallel processing or dry/wet mix implementation). |
| **3-Band EQ**      | `eq`     | ✅ | ✅                            | 85%    Low/High Shelf + Peak Mid. Frequencies are fixed (Low 200Hz, High 5kHz) in backend unless parameterized. UI sends `freq_mid`, which IS used. Good basic EQ. |
| **Analog Warmth**  | `sat`    | ✅ | ⚠️                            | 50%   | Wired to `Distortion` plugin. `mix` parameter is ignored. Only `drive` works. Needs a proper saturation algorithm or wet/dry mix. |
| **Space Designer** | `reverb` | ✅ | ✅                            | 95%   | Room Size, Damping, Width, Wet/Dry Mix all mapped to `pedalboard.Reverb`. Excellent quality. |
| **Stereo Widener** | `width`  | ✅ | ❌                            | 0%    | UI exists but backend implementation is missing (`pass` in `apply_fx.py`). Needs custom MS processing or delay-based widening logic. |

## Feature Grades

- **UI Integration**: 100% (Pagination, Tabs, Preset System working)
- **VST Hosting**: 80% (Loading works, but no UI for VST parameters yet)
- **Preset System**: 100% (JSON-based presets apply correctly)
- **Audio Engine**: 90% (Pedalboard is stable and high-quality)

---

## Suggested Preset Improvements & Workflows

### 1. New Effect Suggestions
| Effect | Description | Priority | Implementation Strategy |
| :--- | :--- | :---: | :--- |
| **Delay / Echo** | Simple tape delay or digital echo | High | Use `pedalboard.Delay`. Params: Time, Feedback, Mix. |
| **Limiter** | Output ceiling protection | Med | Use `pedalboard.Limiter`. Params: Threshold (Ceiling). |
| **Chorus** | Thickening / widening | Med | Use `pedalboard.Chorus`. Params: Rate, Depth, Mix, Voices. |
| **Phaser** | Sweeping modulation | Low | Use `pedalboard.Phaser`. Params: Rate, Depth, Feedback, Mix. |
| **High Pass Filter** | Cleanup muddy low end | High | Use `HighpassFilter`. Params: Frequency (Hz). Essential for vocals. |

### 2. Workflow Optimizations
- **Chain Reordering**: Allow dragging effects to change their order in the chain (currently fixed order in `activeModules` array).
- **VST GUI**: Button to open the native VST plugin editor window (Pedalboard allows `plugin.show_editor()`? - *Note: Pedalboard handles audio processing, typically headless. Opening editor might require a different approach or is not supported in this headless script context.*).
- **Bypass All**: A master toggle to bypass all effects for A/B comparison.
- **Save User Presets**: Allow users to save their current knob settings as a named preset to a local JSON file.

### 3. Proposed Presets Table

| Preset Name | Target Stem | Effects Chain | Description |
| :--- | :--- | :--- | :--- |
| **"Vocal Air"** | Vocals | HPF (100Hz) -> Excel (High Shelf +2dB) -> Comp (Light) -> Reverb (Plate) | Adds brightness and space to vocals without mud. |
| **"Drum Slam"** | Drums | Gate (Tight) -> Comp (Heavy, Slow Attack) -> Saturation (10%) | Makes drums punchy and aggressive. |
| **"Bass Focus"** | Bass | Comp (Medium) -> Mono-maker (Width 0%) -> EQ (Low Boost) | Centers bass frequency and solidifies the low end. |
| **"Lofi Keys"** | Piano/Other | HPF (200Hz) -> LPF (3kHz) -> Saturation (Heavy) -> Wobble (Chorus) | Vintage, degraded tape sound. |
| **"Guitar Wide"** | Guitar | EQ (Mid Boost) -> Chorus -> Stereo Width (150%) | Makes guitars sound huge and wide. |

---

## Action Plan (Next Steps)

1.  **Fix Stereo Widener**: Implement logic in `apply_fx.py` (e.g., using Mid-Side processing or a delay trick).
2.  **Fix Saturation Mix**: Implement a dry/wet blend for the saturation effect.
3.  **Add Delay Module**: Add the Delay effect to the `StemFXMenu` and backend.
4.  **Implement Limiter**: Add a Limiter at the end of the chain by default or as a module.
