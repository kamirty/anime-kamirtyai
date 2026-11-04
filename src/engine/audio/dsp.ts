/** Tiny seeded DSP kit: every sound in the studio is synthesised here, so videos carry no third-party audio. */

export const SR = 48000;

export function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const len = (sec: number) => Math.max(1, Math.round(sec * SR));

export function noise(sec: number, seed: number): Float32Array {
  const r = rng(seed);
  const out = new Float32Array(len(sec));
  for (let i = 0; i < out.length; i++) out[i] = r() * 2 - 1;
  return out;
}

export function lowpass(x: Float32Array, fc: number): Float32Array {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  const y = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    s += a * (x[i] - s);
    y[i] = s;
  }
  return y;
}

export function highpass(x: Float32Array, fc: number): Float32Array {
  const lp = lowpass(x, fc);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] - lp[i];
  return y;
}

/** RBJ band-pass, constant 0 dB peak. */
export function bandpass(x: Float32Array, fc: number, q = 1): Float32Array {
  const w = (2 * Math.PI * fc) / SR;
  const alpha = Math.sin(w) / (2 * q);
  const b0 = alpha, b2 = -alpha, a0 = 1 + alpha, a1 = -2 * Math.cos(w), a2 = 1 - alpha;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** Time-varying band-pass (state variable filter) for sweeps. */
export function sweep(x: Float32Array, fc: (t: number) => number, q = 1.3): Float32Array {
  const y = new Float32Array(x.length);
  let low = 0, band = 0;
  const damp = 1 / q;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(fc(i / SR), SR / 6.5)) / SR);
    low += f * band;
    const high = x[i] - low - damp * band;
    band += f * high;
    y[i] = band;
  }
  return y;
}

export function normalize(x: Float32Array): Float32Array {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] /= m;
  return x;
}

export function env(x: Float32Array, f: (t: number) => number): Float32Array {
  for (let i = 0; i < x.length; i++) x[i] *= f(i / SR);
  return x;
}

export function osc(sec: number, freq: (t: number) => number, shape: 'sine' | 'saw' = 'sine'): Float32Array {
  const y = new Float32Array(len(sec));
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    ph += freq(i / SR) / SR;
    const p = ph - Math.floor(ph);
    y[i] = shape === 'sine' ? Math.sin(2 * Math.PI * p) : 2 * p - 1;
  }
  return y;
}

// ── instruments ──
export function kick(f0 = 120, f1 = 42, sec = 0.7, tau = 0.28, click = 0.4, seed = 1): Float32Array {
  const y = osc(sec, (t) => f1 + (f0 - f1) * Math.exp(-t / 0.045));
  env(y, (t) => Math.exp(-t / tau));
  const c = highpass(noise(sec, seed), 1500);
  for (let i = 0; i < y.length; i++) y[i] += c[i] * Math.exp(-i / SR / 0.004) * click;
  return normalize(y);
}

export function dum(seed = 2): Float32Array {
  const sec = 0.6;
  const y = osc(sec, (t) => 70 + 40 * Math.exp(-t / 0.03));
  const h = osc(sec, (t) => 2.3 * (70 + 40 * Math.exp(-t / 0.03)));
  const nz = bandpass(noise(sec, seed), 600, 0.8);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] = y[i] * Math.exp(-t / 0.22) + 0.35 * h[i] * Math.exp(-t / 0.08) + 0.5 * nz[i] * Math.exp(-t / 0.02);
  }
  return normalize(y);
}

export function tak(seed = 3): Float32Array {
  const sec = 0.25;
  const y = osc(sec, (t) => 240 + 80 * Math.exp(-t / 0.01));
  const nz = bandpass(noise(sec, seed), 2200, 0.7);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] = y[i] * Math.exp(-t / 0.06) + 0.9 * nz[i] * Math.exp(-t / 0.025);
  }
  return normalize(y);
}

export function clap(seed = 4): Float32Array {
  const sec = 0.3;
  const nz = bandpass(noise(sec, seed), 1700, 0.9);
  for (let i = 0; i < nz.length; i++) {
    const t = i / SR;
    let e = 0;
    for (const o of [0, 0.011, 0.023]) if (t >= o) e += Math.exp(-(t - o) / 0.006);
    if (t >= 0.03) e += 0.5 * Math.exp(-(t - 0.03) / 0.07);
    nz[i] *= e;
  }
  return normalize(nz);
}

export function jingle(seed = 5): Float32Array {
  const sec = 0.18;
  const y = highpass(noise(sec, seed), 6000);
  const r = rng(seed);
  const fr = [0, 1, 2, 3].map(() => 7000 + r() * 4000);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    let s = y[i];
    for (const f of fr) s += 0.15 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.05);
    y[i] = s * Math.exp(-t / 0.045);
  }
  return normalize(y);
}

export function bell(f: number, sec = 2.2): Float32Array {
  const y = new Float32Array(len(sec));
  const parts: [number, number, number][] = [[1, 1, 1.2], [2, 0.45, 0.8], [2.76, 0.35, 0.5], [4.07, 0.2, 0.3], [5.4, 0.12, 0.2]];
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [r, a, tau] of parts) s += a * Math.sin(2 * Math.PI * f * r * t) * Math.exp(-t / tau);
    y[i] = s * Math.min(1, t / 0.002);
  }
  return normalize(y);
}

export function whoosh(sec: number, f0: number, f1: number, peak: number, seed = 6, q = 1.4): Float32Array {
  const y = sweep(noise(sec, seed), (t) => f0 * Math.pow(f1 / f0, t / sec), q);
  env(y, (t) => (t < peak ? Math.pow(t / peak, 2.2) : Math.exp(-(t - peak) / (0.18 * (sec - peak) + 0.02))));
  return normalize(y);
}

export function shing(sec = 1.6, seed = 7): Float32Array {
  const y = new Float32Array(len(sec));
  const parts: [number, number, number][] = [[2350, 1, 0.9], [3170, 0.8, 0.7], [4410, 0.6, 0.5], [5980, 0.45, 0.35], [7340, 0.3, 0.25], [1180, 0.5, 0.6]];
  const nz = highpass(noise(sec, seed), 3000);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [f, a, tau] of parts) s += a * Math.sin(2 * Math.PI * f * t * (1 + 0.002 * Math.sin(2 * Math.PI * 6 * t))) * Math.exp(-t / tau);
    y[i] = s + nz[i] * Math.exp(-t / 0.03) * 2;
  }
  return normalize(y);
}

export function riser(sec: number, f0: number, f1: number, seed = 8): Float32Array {
  const y = new Float32Array(len(sec));
  let ph = 0;
  let tph = 0;
  const sh = highpass(noise(sec, seed), 4000);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const p = t / sec;
    ph += (f0 * Math.pow(f1 / f0, p)) / SR;
    tph += (3 + 14 * p * p) / SR;
    let s = 0;
    for (let k = 1; k <= 6; k++) s += Math.sin(2 * Math.PI * k * ph) / k;
    const trem = 0.65 + 0.35 * Math.sin(2 * Math.PI * tph);
    y[i] = (s * trem + sh[i] * p * p * 0.8) * Math.pow(p, 1.6);
  }
  return normalize(y);
}

export function tinkles(sec: number, count: number, seed = 9): Float32Array {
  const out = new Float32Array(len(sec));
  const r = rng(seed);
  for (let k = 0; k < count; k++) {
    const st = -Math.log(1 - r()) * 0.35;
    if (st > sec - 0.3) continue;
    const f = 2800 + r() * 6500;
    const dd = 0.04 + r() * 0.22;
    const n = len(dd);
    const i0 = len(st);
    const g = (0.4 + 0.6 * r()) * Math.exp(-st / 0.8);
    for (let i = 0; i < n && i0 + i < out.length; i++) {
      const t = i / SR;
      out[i0 + i] += g * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / (dd / 4)) + 0.5 * Math.sin(2 * Math.PI * f * 1.51 * t) * Math.exp(-t / (dd / 6)));
    }
  }
  return normalize(out);
}

export function crackle(sec: number, count: number, seed = 10): Float32Array {
  const out = new Float32Array(len(sec));
  const r = rng(seed);
  const click = highpass(noise(0.005, seed + 1), 2000);
  for (let k = 0; k < count; k++) {
    const st = 0.05 + r() * (sec - 0.1);
    const i0 = len(st);
    const g = (0.3 + r()) * Math.exp(-st / (sec * 0.6));
    for (let i = 0; i < click.length && i0 + i < out.length; i++) out[i0 + i] += click[i] * Math.exp(-i / 30) * g;
  }
  return normalize(out);
}

/** Freeverb-style stereo reverb on a send bus. */
export function reverb(L: Float32Array, R: Float32Array, room = 0.84, damp = 0.25): [Float32Array, Float32Array] {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => Math.round((d * SR) / 44100));
  const aps = [556, 441, 341, 225].map((d) => Math.round((d * SR) / 44100));
  const run = (x: Float32Array, spread: number) => {
    const y = new Float32Array(x.length);
    for (const d0 of combs) {
      const d = d0 + spread;
      const buf = new Float32Array(d);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < x.length; i++) {
        const out = buf[idx];
        store = out * (1 - damp) + store * damp;
        buf[idx] = x[i] * 0.015 + store * room;
        idx = (idx + 1) % d;
        y[i] += out;
      }
    }
    for (const d0 of aps) {
      const d = d0 + spread;
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < y.length; i++) {
        const b = buf[idx];
        const v = -y[i] + b;
        buf[idx] = y[i] + b * 0.5;
        idx = (idx + 1) % d;
        y[i] = v;
      }
    }
    return y;
  };
  return [run(L, 0), run(R, 23)];
}
