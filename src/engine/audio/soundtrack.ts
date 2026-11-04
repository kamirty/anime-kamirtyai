import { FPS, type Project, type Shot } from '../../domain/types';
import { shotFrames, totalFrames } from '../../domain/timeline';
import { INTERIOR } from '../art/places';
import { JUMP, POWER } from '../art/poses';
import { fireworkTimes } from '../art/effects';
import { hash } from '../art/paint';
import { SR, bandpass, bell, clap, crackle, dum, highpass, jingle, kick, len, lowpass, noise, normalize, osc, reverb, riser, shing, sweep, tak, tinkles, whoosh } from './dsp';

/**
 * Builds the whole soundtrack from the project: ambience per place and time, sound effects locked to the
 * frames where things happen (steps, claps, the hit, every firework), and optional synthesised music.
 */

export interface Soundtrack {
  L: Float32Array;
  R: Float32Array;
  sampleRate: number;
}

class Mixer {
  L: Float32Array;
  R: Float32Array;
  sL: Float32Array;
  sR: Float32Array;
  constructor(public n: number) {
    this.L = new Float32Array(n);
    this.R = new Float32Array(n);
    this.sL = new Float32Array(n);
    this.sR = new Float32Array(n);
  }
  add(sig: Float32Array, t: number, gain = 1, pan = 0, send = 0) {
    let i0 = Math.round(t * SR);
    let off = 0;
    if (i0 < 0) {
      off = -i0;
      i0 = 0;
    }
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
    const gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
    const n = Math.min(sig.length - off, this.n - i0);
    for (let i = 0; i < n; i++) {
      const v = sig[i + off];
      this.L[i0 + i] += v * gl;
      this.R[i0 + i] += v * gr;
      if (send) {
        this.sL[i0 + i] += v * gl * send;
        this.sR[i0 + i] += v * gr * send;
      }
    }
  }
}

/** A looping bed for one shot, with short fades so cuts never click. */
function bed(m: Mixer, sig: Float32Array, t0: number, dur: number, gain: number, pan = 0) {
  const n = Math.min(sig.length, len(dur + 0.15));
  const out = new Float32Array(n);
  const f = len(0.12);
  for (let i = 0; i < n; i++) out[i] = sig[i] * Math.min(1, i / f, (n - i) / f);
  m.add(out, t0, gain, pan);
}

const cache = new Map<string, Float32Array>();
function cached(key: string, make: () => Float32Array): Float32Array {
  let v = cache.get(key);
  if (!v) {
    v = make();
    if (cache.size > 80) cache.clear();
    cache.set(key, v);
  }
  return v;
}

function ambience(m: Mixer, shot: Shot, t0: number, dur: number, seed: number) {
  const d = dur + 0.2;
  const night = shot.time === 'night';
  const windy = (gain: number, cut: number) => {
    const w = lowpass(highpass(noise(d, seed), 120), cut);
    const g = (t: number) => 0.55 + 0.25 * Math.sin(2 * Math.PI * 0.13 * (t + t0)) + 0.2 * Math.sin(2 * Math.PI * 0.31 * (t + t0) + 1);
    for (let i = 0; i < w.length; i++) w[i] *= g(i / SR);
    bed(m, normalize(w), t0, dur, gain);
  };
  switch (shot.place) {
    case 'fort':
    case 'mountains':
    case 'desert':
      windy(shot.place === 'desert' ? 0.12 : 0.09, 900);
      break;
    case 'sea': {
      const w = lowpass(noise(d, seed), 700);
      const hiss = highpass(noise(d, seed + 1), 3000);
      for (let i = 0; i < w.length; i++) {
        const t = (i / SR + t0) * 0.16;
        const swell = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * t), 2);
        w[i] = w[i] * (0.4 + swell) + hiss[i] * swell * 0.25;
      }
      bed(m, normalize(w), t0, dur, 0.16);
      break;
    }
    case 'city': {
      const hum = lowpass(noise(d, seed), 220);
      bed(m, normalize(hum), t0, dur, 0.08);
      if (dur > 2) m.add(whoosh(1.6, 200, 900, 0.8, seed + 2, 1.1), t0 + 0.6, 0.08, -0.6);
      break;
    }
    case 'farm': {
      const water = bandpass(noise(d, seed), 2400, 1.4);
      bed(m, normalize(water), t0, dur, 0.035);
      windy(0.05, 700);
      break;
    }
    case 'classroom':
    case 'home': {
      const room = lowpass(noise(d, seed), 400);
      bed(m, normalize(room), t0, dur, 0.035);
      const tick = highpass(noise(0.01, 3), 3000);
      for (let k = 0; k < dur; k++) m.add(tick, t0 + k + 0.2, 0.05, 0.5);
      break;
    }
    case 'space': {
      const drone = osc(d, () => 55);
      const d2 = osc(d, () => 82.4);
      for (let i = 0; i < drone.length; i++) drone[i] = 0.6 * drone[i] + 0.4 * d2[i];
      bed(m, drone, t0, dur, 0.06);
      m.add(tinkles(Math.min(4, dur), 14, seed + 4), t0 + 0.2, 0.05, 0.4, 0.6);
      break;
    }
  }
  if (night && !INTERIOR[shot.place] && shot.place !== 'space' && shot.place !== 'city') {
    for (let k = 0; k < dur * 4; k++) {
      const st = 0.12;
      const y = osc(st, () => 4700);
      for (let i = 0; i < y.length; i++) {
        const t = i / SR;
        y[i] *= (0.5 + 0.5 * Math.sin(2 * Math.PI * 45 * t)) * Math.sin((Math.PI * t) / st);
      }
      m.add(y, t0 + 0.15 + k * 0.25, 0.022, k % 2 ? -0.6 : 0.5);
    }
  }
  if (!night && shot.place === 'farm') {
    for (let k = 0; k < dur / 1.3; k++) {
      const chirp = osc(0.09, (t) => 3200 + 1800 * Math.sin(2 * Math.PI * 22 * t));
      for (let i = 0; i < chirp.length; i++) chirp[i] *= Math.sin((Math.PI * i) / chirp.length);
      m.add(chirp, t0 + 0.3 + k * 1.3, 0.04, 0.5);
      m.add(chirp, t0 + 0.42 + k * 1.3, 0.03, 0.5);
    }
  }
}

function actionSfx(m: Mixer, shot: Shot, t0: number, dur: number, seed: number) {
  shot.actors.forEach((a, ai) => {
    const pan = (a.x - 0.5) * 1.2;
    switch (a.action) {
      case 'walk':
      case 'run': {
        const hard = shot.place === 'city' || shot.place === 'classroom' || shot.place === 'home';
        const step = cached(`step${hard}`, () => normalize(hard ? bandpass(noise(0.08, 11), 900, 1.2).map((v, i) => v * Math.exp(-i / SR / 0.015)) : lowpass(noise(0.12, 12), 1600).map((v, i) => v * Math.exp(-i / SR / 0.03))));
        for (let f = 0; f / FPS < Math.max(0.5, dur - 0.6); f += a.action === 'run' ? 5 : 8) m.add(step, t0 + f / FPS, a.action === 'run' ? 0.24 : 0.18, pan);
        break;
      }
      case 'dance':
        for (let f = 4; f / FPS < dur; f += 12) m.add(cached('clap', () => clap(4)), t0 + f / FPS, 0.08, pan, 0.15);
        break;
      case 'nod':
        m.add(bell(880, 1), t0 + 0.2, 0.035, pan);
        break;
      case 'clap':
        for (let f = 0; f / FPS < dur; f += 6) m.add(cached('clap', () => clap(4)), t0 + f / FPS, 0.22, pan, 0.3);
        break;
      case 'cheer':
        for (let f = 4; f / FPS < dur; f += 12) m.add(cached('jingle', () => jingle(5)), t0 + f / FPS, 0.06, pan);
        m.add(cached('clap', () => clap(4)), t0 + 0.1, 0.18, pan, 0.3);
        break;
      case 'wave':
      case 'point':
        m.add(whoosh(0.3, 600, 2500, 0.15, seed + ai, 1.6), t0 + 0.05, 0.08, pan);
        break;
      case 'greet':
      case 'think':
        m.add(bell(a.action === 'think' ? 1174.7 : 880, 1.5), t0 + 0.6, 0.06, pan, 0.6);
        break;
      case 'jump':
        for (let base = 0; base < dur - 1; base += Math.max(2.4, dur)) {
          m.add(whoosh(0.5, 300, 3000, 0.15, seed + 3), t0 + base + JUMP.launch, 0.3, pan, 0.2);
          m.add(kick(110, 45, 0.4, 0.12, 0.3), t0 + base + JUMP.land, 0.35, pan);
        }
        break;
      case 'power': {
        const T = (s: number) => t0 + s;
        m.add(riser(POWER.crouch + 0.1, 110, 330, seed), T(0), 0.18, pan, 0.3);
        const swell = normalize(highpass(noise(0.2, seed + 1), 2000).map((v, i) => v * Math.pow(i / len(0.2), 3)));
        m.add(swell, T(POWER.launch - 0.2), 0.25);
        m.add(kick(140, 38, 1, 0.3, 0.6), T(POWER.launch), 0.8, pan, 0.4);
        m.add(whoosh(0.8, 250, 3500, 0.25, seed + 2, 1.2), T(POWER.launch), 0.45, pan, 0.3);
        for (let k = 0; k < 3; k++) m.add(whoosh(0.22, 700 + 300 * k, 4000, 0.12, seed + 5 + k, 2), T(POWER.spin + k * 0.08), 0.3, -0.6 + 0.6 * k);
        m.add(shing(1.8, seed + 9), T(POWER.release), 0.4, 0.1, 0.7);
        const fly = osc(POWER.impact - POWER.release, (t) => 300 * Math.pow(1400 / 300, Math.pow(t / (POWER.impact - POWER.release), 1.8)));
        for (let i = 0; i < fly.length; i++) fly[i] *= Math.pow(i / fly.length, 1.5);
        m.add(fly, T(POWER.release), 0.14, 0, 0.3);
        m.add(whoosh(POWER.impact - POWER.release, 300, 5000, POWER.impact - POWER.release - 0.01, seed + 12, 1), T(POWER.release), 0.45, 0, 0.2);
        // impact
        const sub = osc(2.6, (t) => 28 + 50 * Math.exp(-t / 0.25)).map((v, i) => v * Math.exp(-i / SR / 0.9));
        m.add(sub, T(POWER.impact), 0.9);
        m.add(kick(160, 40, 1.4, 0.4, 1), T(POWER.impact), 0.85, 0, 0.8);
        m.add(normalize(lowpass(noise(2, seed + 13), 1800).map((v, i) => v * Math.exp(-i / SR / 0.45))), T(POWER.impact), 0.7, 0, 0.9);
        const crk = normalize(highpass(noise(0.06, seed + 14), 1500).map((v, i) => v * Math.exp(-i / SR / 0.008)));
        m.add(crk, T(POWER.impact), 0.7, -0.2);
        m.add(crk, T(POWER.impact + 0.012), 0.6, 0.3);
        m.add(tinkles(2.6, 220, seed + 15), T(POWER.impact + 0.02), 0.3, -0.35, 0.6);
        m.add(tinkles(2.6, 220, seed + 16), T(POWER.impact + 0.03), 0.3, 0.35, 0.6);
        m.add(normalize(lowpass(noise(3, seed + 17), 140).map((v, i) => v * Math.exp(-i / SR / 1))), T(POWER.impact + 0.05), 0.4);
        m.add(kick(100, 40, 0.5, 0.15, 0.3), T(POWER.land), 0.4, pan);
        break;
      }
    }
  });
}

function effectSfx(m: Mixer, shot: Shot, t0: number, dur: number, seed: number) {
  for (const e of shot.effects) {
    switch (e) {
      case 'fireworks':
        fireworkTimes(dur).forEach((tb, i) => {
          const pan = ((i * 37) % 10) / 5 - 1;
          const wd = 0.35;
          const w = osc(wd, (t) => 900 * Math.pow(2600 / 900, t / wd)).map((v, k) => v * Math.sin((Math.PI * k) / len(wd)));
          m.add(w, t0 + tb - wd, 0.04, pan);
          m.add(cached('fwpop', () => kick(95, 40, 0.5, 0.12, 0.6, 21)), t0 + tb, 0.3, pan, 0.6);
          m.add(crackle(0.9, 40, seed + i), t0 + tb + 0.08, 0.13, pan, 0.3);
        });
        break;
      case 'confetti':
        m.add(cached('pop', () => kick(200, 80, 0.2, 0.05, 0.9, 22)), t0 + 0.05, 0.25, 0, 0.4);
        m.add(crackle(Math.min(2, dur), 60, seed + 3), t0 + 0.1, 0.05, 0.3);
        break;
      case 'sparkles':
      case 'shootingStars':
        for (let k = 0; k < dur / 0.8; k++) m.add(bell([1760, 2093, 2349.3, 2637][k % 4], 1), t0 + 0.2 + k * 0.8, 0.03, k % 2 ? 0.5 : -0.5, 0.7);
        break;
      case 'rain': {
        const r = normalize(highpass(noise(dur + 0.2, seed + 5), 1200));
        bed(m, r, t0, dur, 0.12);
        break;
      }
      case 'dust': {
        const d = normalize(sweep(noise(dur + 0.2, seed + 6), (t) => 500 + 300 * Math.sin(t * 2), 0.8));
        bed(m, d, t0, dur, 0.1);
        break;
      }
      case 'ribbons':
        for (let k = 0; k < dur * 3; k++) m.add(normalize(bandpass(noise(0.08, seed + k), 1200, 1).map((v, i) => v * Math.sin((Math.PI * i) / len(0.08)))), t0 + k / 3, 0.03, 0.3);
        break;
      case 'balloons':
        m.add(bell(1318.5, 1.2), t0 + 0.3, 0.04, 0, 0.6);
        break;
      default:
        break;
    }
  }
}

function music(m: Mixer, project: Project, total: number) {
  const mode = project.audio.music;
  if (mode === 'none') return;
  if (mode === 'calm') {
    const hijaz = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33];
    const seq = [0, 2, 4, 3, 2, 4, 5, 4, 7, 5, 4, 2];
    for (let k = 0; k * 0.75 < total - 0.5; k++) m.add(cached(`b${seq[k % seq.length]}`, () => bell(hijaz[seq[k % seq.length]], 2.2)), k * 0.75, 0.06, k % 2 ? 0.3 : -0.3, 0.7);
    const pad = osc(total, () => 146.83).map((v, i) => v * 0.5 * Math.min(1, i / SR / 2, (total - i / SR) / 1.5));
    m.add(pad, 0, 0.04);
    return;
  }
  const e8 = 0.25;
  const pattern = mode === 'festive' ? ['D', '', 'T', 'T', 'D', 'T', '', 'T'] : ['D', '', 'D', '', 'D', 'T', 'D', 'T'];
  for (let s = 0; s * e8 < total - 0.3; s++) {
    const t = s * e8;
    const p = pattern[s % 8];
    if (p === 'D') m.add(cached('dum', () => dum()), t, mode === 'epic' ? 0.5 : 0.42, 0, 0.3);
    if (p === 'T') m.add(cached('tak', () => tak()), t, 0.22, 0.25, 0.3);
    if (mode === 'festive') {
      if (s % 8 === 2 || s % 8 === 6) {
        m.add(cached('clap', () => clap()), t, 0.22, -0.3, 0.4);
        m.add(cached('clap', () => clap()), t + 0.012, 0.18, 0.35, 0.4);
      }
      m.add(cached('jingle', () => jingle()), t, s % 2 ? 0.03 : 0.05, 0.5);
    }
  }
  if (mode === 'epic') {
    const pad = osc(total, () => 73.42, 'saw');
    const lp = lowpass(pad, 500).map((v, i) => v * Math.min(1, i / SR / 1.5, (total - i / SR) / 1));
    m.add(normalize(lp), 0, 0.06);
  }
}

export type VoiceClip = { L: Float32Array; R: Float32Array };
export type SceneVoices = Record<string, VoiceClip>;

export function buildSoundtrack(project: Project, userMusic?: VoiceClip | null, voices: SceneVoices = {}): Soundtrack {
  const total = totalFrames(project) / FPS;
  const m = new Mixer(len(total));
  let t0 = 0;
  project.shots.forEach((shot, i) => {
    const dur = shotFrames(shot) / FPS;
    const seed = hash(shot.id) % 100000;
    if (project.audio.ambience) ambience(m, shot, t0, dur, seed);
    if (project.audio.sfx) {
      actionSfx(m, shot, t0, dur, seed);
      effectSfx(m, shot, t0, dur, seed);
      if (shot.text) {
        m.add(shing(1.2, seed + 30), t0 + 0.3, 0.07, 0, 0.6);
        if (shot.text.style === 'title') m.add(kick(90, 38, 1.2, 0.4, 0.2), t0 + 0.3, 0.4, 0, 0.6);
      }
      if (shot.dialogue) m.add(cached('blip', () => normalize(osc(0.08, (t) => 900 + 600 * t).map((v, k) => v * Math.sin((Math.PI * k) / len(0.08))))), t0 + 0.2, 0.05);
      if (i < project.shots.length - 1 && shot.transition !== 'cut') m.add(whoosh(0.6, 300, 2400, 0.42, seed + 40), t0 + dur - 0.42, 0.18, 0, 0.3);
    }
    t0 += dur;
  });
  if (userMusic) {
    const n = Math.min(m.n, userMusic.L.length);
    for (let i = 0; i < n; i++) {
      const fade = Math.min(1, (m.n - i) / len(0.5));
      m.L[i] += userMusic.L[i] * 0.7 * fade;
      m.R[i] += userMusic.R[i] * 0.7 * fade;
    }
  } else music(m, project, total);

  // Recordings are mixed at their shot's start and clipped at its end.
  // No microphone audio leaves the user's browser.
  let voiceOffset = 0;
  for (const shot of project.shots) {
    const voice = voices[shot.id];
    const shotSamples = len(shotFrames(shot) / FPS);
    if (voice) {
      const count = Math.min(shotSamples, voice.L.length, voice.R.length, m.n - voiceOffset);
      for (let i = 0; i < count; i++) {
        const fade = Math.min(1, i / len(0.03), (count - i) / len(0.1));
        m.L[voiceOffset + i] += voice.L[i] * 0.9 * fade;
        m.R[voiceOffset + i] += voice.R[i] * 0.9 * fade;
      }
    }
    voiceOffset += shotSamples;
  }

  const [rL, rR] = reverb(m.sL, m.sR);
  const L = m.L;
  const R = m.R;
  let peak = 0;
  for (let i = 0; i < m.n; i++) {
    L[i] += rL[i] * 0.5;
    R[i] += rR[i] * 0.5;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  // gentle drive and a ceiling at -1.5 dBFS, then fade with the picture
  const drive = 1.8;
  const norm = peak > 0 ? drive / peak : 1;
  const ceil = Math.pow(10, -1.5 / 20) / Math.tanh(drive);
  const fadeStart = project.fadeOut ? m.n - len(8 / FPS + 0.1) : m.n;
  for (let i = 0; i < m.n; i++) {
    const f = i < fadeStart ? 1 : Math.pow(Math.cos(((i - fadeStart) / (m.n - fadeStart)) * (Math.PI / 2)), 2);
    L[i] = Math.tanh(L[i] * norm) * ceil * f;
    R[i] = Math.tanh(R[i] * norm) * ceil * f;
  }
  return { L, R, sampleRate: SR };
}

export function toAudioBuffer(s: Soundtrack): AudioBuffer {
  const buf = new AudioBuffer({ numberOfChannels: 2, length: s.L.length, sampleRate: s.sampleRate });
  buf.copyToChannel(new Float32Array(s.L), 0);
  buf.copyToChannel(new Float32Array(s.R), 1);
  return buf;
}
