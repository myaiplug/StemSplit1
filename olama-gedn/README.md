# NoDAW — MyAiPlug Audio Studio (MVP)

Local-first audio preview + WAV/MP3 export in the browser, with a tiny backend for preset persistence.

## Run

```pwsh
npm install
npm run offline
```

This starts the local server and auto-opens the app in your browser.

Optional:

```pwsh
npm start
node offline.js --port 8001
node offline.js --no-open
```

## Time/Pitch engines

- `Fast (SoundTouch)`
- `Quality (RubberBand)`

## RubberBand license note

`rubberband-wasm` wraps the Rubber Band library, which is **GPL**. If you distribute this app, you must comply with GPL terms or obtain a commercial Rubber Band license.

## API (optional)

- `GET /api/health`
- `GET /api/presets`
- `POST /api/presets` body: `{ "name": "My Preset", "params": { ... } }`
- `DELETE /api/presets/:name`

## VST3 Conversion System

A full Windows VST3 conversion scaffold for `temporal.html` now lives in `vst3-temporal/`.

- Entry docs: `vst3-temporal/README.md`
- Architecture: `vst3-temporal/docs/ARCHITECTURE.md`
- Build and installer steps: `vst3-temporal/docs/BUILD_AND_INSTALL.md`
- Engine signature smoke test: `npm run test:vst3-engines`
- Cross-profile engine smoke test: `npm run test:vst3-engines:profiles`

## Trio Pages

- Landing page: `landing.html`
- Temporal portal: `temporal.html`
- VST3 scaffold root: `vst3-temporal/`

## Diff Engine Designs

- Classic: `engine-classic.html`
- Clean Slow: `engine-clean-slow.html`
- Granular Drift: `engine-granular-drift.html`
- Rubber Drag: `engine-rubber-drag.html`
- Stretch Haze: `engine-stretch-haze.html`
