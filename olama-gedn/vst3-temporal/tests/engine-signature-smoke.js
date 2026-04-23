/*
  Engine signature smoke test.
  Validates that each slowdown engine produces a distinct output signature.
*/

function mulberry32(seed) {
  return function rand() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function softClip(x) {
  return Math.tanh(x);
}

function generateInput(sampleRate, seconds) {
  const n = Math.floor(sampleRate * seconds);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = mulberry32(123456);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const toneA = Math.sin(2 * Math.PI * 110 * t) * 0.45;
    const toneB = Math.sin(2 * Math.PI * 220 * t) * 0.27;
    const toneC = Math.sin(2 * Math.PI * 330 * t) * 0.18;
    const noise = (rand() * 2 - 1) * 0.04;
    left[i] = toneA + toneB + toneC + noise;
    right[i] = toneA * 0.95 + toneB * 1.03 + toneC * 0.92 + noise * 0.95;
  }

  return [left, right];
}

function applyEnginePost(channels, engineIndex, dawProfile, slowAmount, sauceAmount, sampleRate) {
  const numCh = channels.length;
  const n = channels[0].length;
  const out = channels.map(ch => new Float32Array(ch));

  if (engineIndex === 0) return out;

  const smearState = [0, 0];
  let granularPhase = 0;

  if (engineIndex === 1) {
    const mix = 0.06 * slowAmount;
    for (let ch = 0; ch < numCh; ch++) {
      let prev = smearState[Math.min(ch, 1)];
      const x = out[ch];
      for (let i = 0; i < n; i++) {
        const v = x[i] * (1 - mix) + prev * mix;
        prev = v;
        x[i] = v;
      }
    }
    return out;
  }

  if (engineIndex === 2) {
    let satDrive = 1 + slowAmount * 1.3 + sauceAmount * 0.8;
    if (dawProfile === 1) satDrive *= 0.92;
    else if (dawProfile === 2) satDrive *= 1.10;
    else if (dawProfile === 3) satDrive *= 0.98;

    for (let ch = 0; ch < numCh; ch++) {
      const x = out[ch];
      for (let i = 0; i < n; i++) {
        x[i] = softClip(x[i] * satDrive) * (0.8 + 0.2 * (1 - slowAmount));
      }
    }
    return out;
  }

  if (engineIndex === 3) {
    const smear = 0.14 + slowAmount * 0.26;
    for (let ch = 0; ch < numCh; ch++) {
      let prev = smearState[Math.min(ch, 1)];
      const x = out[ch];
      for (let i = 0; i < n; i++) {
        const v = x[i] * (1 - smear) + prev * smear;
        prev = v;
        x[i] = v;
      }
    }
    return out;
  }

  if (engineIndex === 4) {
    let hz = 4 + (1 - slowAmount) * 5;
    if (dawProfile === 1) hz *= 0.9;
    else if (dawProfile === 2) hz *= 1.1;

    const inc = (Math.PI * 2 * hz) / sampleRate;
    for (let i = 0; i < n; i++) {
      const env = 0.62 + 0.38 * Math.pow(Math.sin(granularPhase), 2);
      granularPhase += inc;
      if (granularPhase > Math.PI * 2) granularPhase -= Math.PI * 2;
      for (let ch = 0; ch < numCh; ch++) out[ch][i] *= env;
    }
  }

  return out;
}

function signature(channels) {
  const l = channels[0];
  const r = channels[1];
  const n = l.length;
  let energy = 0;
  let absMean = 0;
  let zc = 0;
  let corr = 0;
  let prev = l[0];

  for (let i = 0; i < n; i++) {
    const v = 0.5 * (l[i] + r[i]);
    energy += v * v;
    absMean += Math.abs(v);
    if ((prev >= 0 && v < 0) || (prev < 0 && v >= 0)) zc++;
    prev = v;
    corr += l[i] * r[i];
  }

  const rms = Math.sqrt(energy / n);
  const zcr = zc / n;
  const am = absMean / n;
  const c = corr / n;

  return { rms, zcr, am, c };
}

function distance(a, b) {
  return Math.abs(a.rms - b.rms) * 4.0
    + Math.abs(a.zcr - b.zcr) * 20.0
    + Math.abs(a.am - b.am) * 5.0
    + Math.abs(a.c - b.c) * 6.0;
}

const PROFILE_NAMES = ["Generic", "Ableton", "FL Studio", "Reaper"];

function runForProfile(dawProfile, threshold = 0.008) {
  const sampleRate = 48000;
  const inBuf = generateInput(sampleRate, 2.25);
  const slowAmount = 0.7;
  const sauce = 0.45;

  const names = ["Classic", "Clean Slow", "Rubber Drag", "Stretch Haze", "Granular Drift"];
  const sigs = [];
  const profileName = PROFILE_NAMES[dawProfile] || `Profile ${dawProfile}`;

  console.log(`Profile: ${profileName}`);

  for (let i = 0; i < names.length; i++) {
    const out = applyEnginePost(inBuf, i, dawProfile, slowAmount, sauce, sampleRate);
    sigs.push(signature(out));
  }

  console.log("Engine signatures:");
  for (let i = 0; i < names.length; i++) {
    const s = sigs[i];
    console.log(`${i}: ${names[i]} | rms=${s.rms.toFixed(6)} zcr=${s.zcr.toFixed(6)} am=${s.am.toFixed(6)} c=${s.c.toFixed(6)}`);
  }

  let minDist = Number.POSITIVE_INFINITY;
  const pairs = [];
  for (let i = 0; i < sigs.length; i++) {
    for (let j = i + 1; j < sigs.length; j++) {
      const d = distance(sigs[i], sigs[j]);
      minDist = Math.min(minDist, d);
      pairs.push(`${names[i]} vs ${names[j]}: ${d.toFixed(6)}`);
    }
  }

  console.log("Pair distances:");
  for (const p of pairs) console.log(`- ${p}`);

  if (minDist < threshold) {
    console.error(`FAIL: engine signatures are too similar (min distance ${minDist.toFixed(6)})`);
    return { pass: false, minDist };
  }

  console.log(`PASS: engine signatures are distinct (min distance ${minDist.toFixed(6)})`);
  return { pass: true, minDist };
}

function run() {
  const runAllProfiles = process.argv.includes("--all-profiles");

  if (!runAllProfiles) {
    const result = runForProfile(0);
    if (!result.pass) process.exit(1);
    return;
  }

  let globalMin = Number.POSITIVE_INFINITY;
  let failed = false;
  for (let profileIndex = 0; profileIndex < PROFILE_NAMES.length; profileIndex++) {
    const result = runForProfile(profileIndex);
    globalMin = Math.min(globalMin, result.minDist);
    if (!result.pass) failed = true;
    if (profileIndex < PROFILE_NAMES.length - 1) console.log("---");
  }

  if (failed) {
    console.error(`FAIL: at least one DAW profile collapsed engine separation (global min ${globalMin.toFixed(6)})`);
    process.exit(1);
  }

  console.log(`PASS: all DAW profiles preserve engine separation (global min ${globalMin.toFixed(6)})`);
}

run();
