async function loadSoundTouch() {
  const candidates = [
    new URL('./vendor/soundtouchjs/soundtouch.js', import.meta.url).toString(),
    'https://unpkg.com/soundtouchjs@0.2.1/dist/soundtouch.js'
  ];

  let lastErr;
  for (const url of candidates) {
    try {
      const mod = await import(url);
      if (mod && typeof mod.SoundTouch === 'function') return mod.SoundTouch;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to load SoundTouch module');
}

(async () => {
  const SoundTouch = await loadSoundTouch();

  class SoundTouchProcessor extends AudioWorkletProcessor {
    constructor() {
      super();

      this.st = new SoundTouch();
    this.st.tempo = 1;
    this.st.pitchSemitones = 0;

    this._in = null;
    this._out = null;
    this._channels = 2;

    // Underflow smoothing
    this._lastL = 0;
    this._lastR = 0;
    this._targetTempo = 1;
    this._targetPitch = 0;
    this._fadeSamples = 0;

      this.port.onmessage = (e) => {
        const msg = e.data || {};
        if (typeof msg.tempo === 'number' && isFinite(msg.tempo) && msg.tempo > 0) {
          this._targetTempo = Math.min(4, Math.max(0.25, msg.tempo));
          this._fadeSamples = 64;
        }
        if (typeof msg.pitchSemitones === 'number' && isFinite(msg.pitchSemitones)) {
          this._targetPitch = Math.max(-24, Math.min(24, msg.pitchSemitones));
          this._fadeSamples = 64;
        }
        if (msg.reset === true) {
          try { this.st.clear(); } catch {}
        }
      };
    }

  _ensureBuffers(frames) {
    // Keep a bit of headroom to reduce realloc churn.
    const needed = Math.max(frames, 1024) * 2;
    if (!this._in || this._in.length !== needed) this._in = new Float32Array(needed);
    if (!this._out || this._out.length !== needed) this._out = new Float32Array(needed);
  }

    process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const outL = output[0];
    const outR = output[1] || output[0];
    const frames = outL.length;

    this._ensureBuffers(frames);

    // Apply parameter changes at block boundaries
    this.st.tempo = this._targetTempo;
    this.st.pitchSemitones = this._targetPitch;

    const inL = (input && input[0]) ? input[0] : null;
    const inR = (input && input[1]) ? input[1] : null;

    // Interleave input (duplicate mono to stereo)
    for (let i = 0; i < frames; i++) {
      const l = inL ? inL[i] : 0;
      const r = inR ? inR[i] : (inL ? inL[i] : 0);
      this._in[i * 2] = l;
      this._in[i * 2 + 1] = r;
    }

    // Feed soundtouch
    this.st.inputBuffer.putSamples(this._in, 0, frames);
    this.st.process();

    const available = this.st.outputBuffer.frameCount;
    const toRead = Math.min(frames, available);

    if (toRead > 0) {
      this.st.outputBuffer.receiveSamples(this._out, toRead);
    }

    // De-interleave to output
    for (let i = 0; i < frames; i++) {
      if (i < toRead) {
        let l = this._out[i * 2];
        let r = this._out[i * 2 + 1];

        // Very short fade to reduce clicks when changing parameters.
        if (this._fadeSamples > 0) {
          const a = 1 - (this._fadeSamples / 64);
          l = this._lastL * (1 - a) + l * a;
          r = this._lastR * (1 - a) + r * a;
          this._fadeSamples -= 1;
        }

        outL[i] = l;
        outR[i] = r;
        this._lastL = l;
        this._lastR = r;
      } else {
        // If SoundTouch underflows, hold last sample instead of dropping to zero.
        outL[i] = this._lastL;
        outR[i] = this._lastR;
      }
    }

      return true;
    }
  }

  registerProcessor('soundtouch-processor', SoundTouchProcessor);
})();
