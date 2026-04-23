/*
  RubberBand worker wrapper for offline time-stretch/pitch-shift.
  Loads rubberband-wasm from /vendor/rubberband-wasm.
*/

/* global rubberband */

let rbApi = null;
let readyPromise = null;

function normalizeBase(u) {
  return String(u || '').replace(/\/+$/, '');
}

function getVendorBase() {
  try {
    const url = new URL(self.location.href);
    const base = url.searchParams.get('vendorBase');
    if (base) return normalizeBase(base);
  } catch {}
  return '/vendor/rubberband-wasm';
}

const VENDOR_BASE = getVendorBase();

async function ensureReady() {
  if (rbApi) return rbApi;
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    // Load UMD bundle
    importScripts(`${VENDOR_BASE}/index.umd.min.js`);

    // Compile WASM
    let module;
    if (WebAssembly.compileStreaming) {
      module = await WebAssembly.compileStreaming(fetch(`${VENDOR_BASE}/rubberband.wasm`));
    } else {
      const buf = await (await fetch(`${VENDOR_BASE}/rubberband.wasm`)).arrayBuffer();
      module = await WebAssembly.compile(buf);
    }

    rbApi = await rubberband.RubberBandInterface.initialize(module);
    return rbApi;
  })();

  return readyPromise;
}

function buildHighQualityOptions({ formantPreserve }) {
  const O = (rubberband && rubberband.RubberBandOption) ? rubberband.RubberBandOption : null;
  if (!O) return 0;

  // Offline, highest-quality bias.
  let opt = 0;
  opt |= O.RubberBandOptionProcessOffline;
  opt |= O.RubberBandOptionStretchPrecise;
  opt |= O.RubberBandOptionTransientsMixed;
  opt |= O.RubberBandOptionDetectorCompound;
  opt |= O.RubberBandOptionPhaseIndependent;
  opt |= O.RubberBandOptionWindowLong;
  opt |= O.RubberBandOptionSmoothingOn;
  opt |= O.RubberBandOptionPitchHighQuality;
  opt |= O.RubberBandOptionChannelsTogether;
  opt |= O.RubberBandOptionEngineFiner;

  if (formantPreserve) {
    opt |= O.RubberBandOptionFormantPreserved;
  }

  return opt;
}

function toTimeRatio(timeStretchPct) {
  const pct = Number(timeStretchPct);
  if (!isFinite(pct) || pct <= 0) return 1;
  // UI semantics: timeStretchPct is a *duration* percentage (110% => longer/slower).
  // RubberBand's set_time_ratio is effectively inverted relative to that semantic,
  // so we pass 100/pct to achieve the expected behavior.
  return 100 / pct;
}

function toPitchScale(pitchSemitones) {
  const semi = Number(pitchSemitones);
  if (!isFinite(semi)) return 1;
  return Math.pow(2, semi / 12);
}

self.onmessage = async (e) => {
  try {
    const msg = e.data || {};
    if (msg && msg.type === 'ping') {
      await ensureReady();
      self.postMessage({ type: 'pong' });
      return;
    }

    const api = await ensureReady();
    const { channelBuffers, sampleRate, pitchSemitones, timeStretchPct, formantPreserve, options } = msg;

    if (!Array.isArray(channelBuffers) || channelBuffers.length < 1) {
      self.postMessage({ error: 'Invalid channelBuffers' });
      return;
    }

    const channels = channelBuffers.length;
    const inLen = channelBuffers[0].length;

    const pitch = toPitchScale(pitchSemitones);
    const timeRatio = toTimeRatio(timeStretchPct);

    // For buffer sizing we follow UI semantics (duration multiplier).
    const uiDurationRatio = (() => {
      const pct = Number(timeStretchPct);
      if (!isFinite(pct) || pct <= 0) return 1;
      return pct / 100;
    })();

    // Options: favor quality by default in this worker.
    const opt = (options && typeof options === 'number') ? options : buildHighQualityOptions({ formantPreserve: !!formantPreserve });

    // Output buffers (growable; rubberband output length can differ slightly from the ideal ratio)
    let outputSamples = Math.max(1, Math.ceil(inLen * uiDurationRatio));
    let outputBuffers = channelBuffers.map(() => new Float32Array(outputSamples));
    const ensureCapacity = (needed) => {
      if (needed <= outputSamples) return;
      outputSamples = Math.max(needed, Math.ceil(outputSamples * 1.25));
      outputBuffers = outputBuffers.map((buf) => {
        const grown = new Float32Array(outputSamples);
        grown.set(buf);
        return grown;
      });
    };

    const rbState = api.rubberband_new(sampleRate, channels, opt, 1, 1);
    api.rubberband_set_pitch_scale(rbState, pitch);
    api.rubberband_set_time_ratio(rbState, timeRatio);

    // Formant handling (for vocals, etc.)
    try {
      if (formantPreserve) {
        api.rubberband_set_formant_scale(rbState, 1);
      } else {
        api.rubberband_set_formant_scale(rbState, pitch);
      }
    } catch {
      // some builds may not expose formant_scale; ignore
    }

    const samplesRequired = api.rubberband_get_samples_required(rbState);

    const channelArrayPtr = api.malloc(channels * 4);
    const channelDataPtr = [];
    for (let ch = 0; ch < channels; ch++) {
      const bufferPtr = api.malloc(samplesRequired * 4);
      channelDataPtr.push(bufferPtr);
      api.memWritePtr(channelArrayPtr + ch * 4, bufferPtr);
    }

    api.rubberband_set_expected_input_duration(rbState, inLen);

    // Study
    let read = 0;
    while (read < inLen) {
      const remaining = Math.min(samplesRequired, inLen - read);
      for (let ch = 0; ch < channels; ch++) {
        api.memWrite(channelDataPtr[ch], channelBuffers[ch].subarray(read, read + remaining));
      }
      read += remaining;
      const isFinal = read >= inLen;
      api.rubberband_study(rbState, channelArrayPtr, remaining, isFinal ? 1 : 0);
    }

    // Process
    read = 0;
    let write = 0;

    const tryRetrieve = (final) => {
      while (true) {
        const available = api.rubberband_available(rbState);
        if (available < 1) break;
        if (!final && available < samplesRequired) break;
        const recv = api.rubberband_retrieve(rbState, channelArrayPtr, Math.min(samplesRequired, available));

        ensureCapacity(write + recv);
        for (let ch = 0; ch < channels; ch++) {
          outputBuffers[ch].set(api.memReadF32(channelDataPtr[ch], recv), write);
        }
        write += recv;
      }
    };

    while (read < inLen) {
      const remaining = Math.min(samplesRequired, inLen - read);
      for (let ch = 0; ch < channels; ch++) {
        api.memWrite(channelDataPtr[ch], channelBuffers[ch].subarray(read, read + remaining));
      }
      read += remaining;
      const isFinal = read >= inLen;
      api.rubberband_process(rbState, channelArrayPtr, remaining, isFinal ? 1 : 0);
      tryRetrieve(false);
    }

    tryRetrieve(true);

    // Cleanup
    for (const ptr of channelDataPtr) api.free(ptr);
    api.free(channelArrayPtr);
    api.rubberband_delete(rbState);

    // Trim output to actual written length
    const trimmed = outputBuffers.map((buf) => (write === buf.length ? buf : buf.subarray(0, write)));
    self.postMessage({ channelBuffers: trimmed, sampleRate });
  } catch (err) {
    self.postMessage({ error: err && err.message ? err.message : String(err) });
  }
};
