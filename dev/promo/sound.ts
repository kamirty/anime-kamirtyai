/**
 * The promo's soundtrack, synthesised in the browser like everything else in this project:
 * no samples, no licences. Rendered offline to a WAV so it can be muxed with the frames.
 */

export interface Hit {
  t: number;
  kind: 'kick' | 'sub' | 'whoosh' | 'impact' | 'hat' | 'tick' | 'riser' | 'sting';
  gain?: number;
}

function noiseBuffer(ctx: OfflineAudioContext, seconds: number): AudioBuffer {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = 1;
  for (let i = 0; i < d.length; i++) {
    // a tiny deterministic generator, so every render sounds the same
    s = (s * 16807) % 2147483647;
    d[i] = (s / 1073741823.5 - 1) * 0.8;
  }
  return b;
}

function env(ctx: OfflineAudioContext, at: number, a: number, d: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + a);
  g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
  return g;
}

export async function renderTrack(hits: Hit[], seconds: number): Promise<AudioBuffer> {
  const sr = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  const master = ctx.createGain();
  master.gain.value = 0.82;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  comp.connect(master);
  master.connect(ctx.destination);
  const noise = noiseBuffer(ctx, 3);

  const src = (buf: AudioBuffer, at: number, rate = 1) => {
    const n = ctx.createBufferSource();
    n.buffer = buf;
    n.playbackRate.value = rate;
    n.start(at);
    return n;
  };

  // a low drone under the whole film
  const drone = ctx.createOscillator();
  drone.type = 'sawtooth';
  drone.frequency.value = 41.2;
  const droneF = ctx.createBiquadFilter();
  droneF.type = 'lowpass';
  droneF.frequency.value = 180;
  const droneG = ctx.createGain();
  droneG.gain.setValueAtTime(0.0001, 0);
  droneG.gain.linearRampToValueAtTime(0.09, 2);
  droneG.gain.setValueAtTime(0.09, seconds - 3);
  droneG.gain.linearRampToValueAtTime(0.0001, seconds - 0.2);
  drone.connect(droneF).connect(droneG).connect(comp);
  drone.start(0);
  drone.stop(seconds);

  for (const h of hits) {
    const at = h.t;
    const gain = h.gain ?? 1;
    switch (h.kind) {
      case 'kick': {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, at);
        o.frequency.exponentialRampToValueAtTime(42, at + 0.11);
        const g = env(ctx, at, 0.004, 0.3, 1.0 * gain);
        o.connect(g).connect(comp);
        o.start(at);
        o.stop(at + 0.4);
        const click = src(noise, at);
        const cg = env(ctx, at, 0.001, 0.02, 0.35 * gain);
        const cf = ctx.createBiquadFilter();
        cf.type = 'bandpass';
        cf.frequency.value = 1800;
        click.connect(cf).connect(cg).connect(comp);
        click.stop(at + 0.05);
        break;
      }
      case 'sub': {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 55;
        const g = env(ctx, at, 0.01, 0.5, 0.5 * gain);
        o.connect(g).connect(comp);
        o.start(at);
        o.stop(at + 0.6);
        break;
      }
      case 'whoosh': {
        const n = src(noise, at);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 1.1;
        f.frequency.setValueAtTime(300, at);
        f.frequency.exponentialRampToValueAtTime(5200, at + 0.26);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.42 * gain, at + 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
        n.connect(f).connect(g).connect(comp);
        n.stop(at + 0.4);
        break;
      }
      case 'impact': {
        const n = src(noise, at);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(6000, at);
        f.frequency.exponentialRampToValueAtTime(220, at + 0.5);
        const g = env(ctx, at, 0.003, 0.7, 0.75 * gain);
        n.connect(f).connect(g).connect(comp);
        n.stop(at + 0.9);
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(90, at);
        o.frequency.exponentialRampToValueAtTime(34, at + 0.45);
        const og = env(ctx, at, 0.004, 0.8, 1.1 * gain);
        o.connect(og).connect(comp);
        o.start(at);
        o.stop(at + 1);
        break;
      }
      case 'hat': {
        const n = src(noise, at);
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 7000;
        const g = env(ctx, at, 0.001, 0.045, 0.2 * gain);
        n.connect(f).connect(g).connect(comp);
        n.stop(at + 0.08);
        break;
      }
      case 'tick': {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 2200;
        const g = env(ctx, at, 0.001, 0.02, 0.1 * gain);
        o.connect(g).connect(comp);
        o.start(at);
        o.stop(at + 0.03);
        break;
      }
      case 'riser': {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(110, at);
        o.frequency.exponentialRampToValueAtTime(1500, at + 1);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(600, at);
        f.frequency.exponentialRampToValueAtTime(6000, at + 1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.3 * gain, at + 0.95);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 1.08);
        o.connect(f).connect(g).connect(comp);
        o.start(at);
        o.stop(at + 1.1);
        break;
      }
      case 'sting': {
        for (const [i, f0] of [110, 164.81, 220, 329.63].entries()) {
          const o = ctx.createOscillator();
          o.type = i > 1 ? 'triangle' : 'sawtooth';
          o.frequency.value = f0;
          const g = env(ctx, at, 0.01, 1.8 - i * 0.2, (0.2 - i * 0.03) * gain);
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 2400;
          o.connect(f).connect(g).connect(comp);
          o.start(at);
          o.stop(at + 2.2);
        }
        break;
      }
    }
  }
  return ctx.startRendering();
}

/** 16-bit PCM WAV bytes for an AudioBuffer. */
export function toWav(buf: AudioBuffer): Uint8Array {
  const chans = buf.numberOfChannels;
  const frames = buf.length;
  const bytes = 44 + frames * chans * 2;
  const out = new Uint8Array(bytes);
  const view = new DataView(out.buffer);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, chans, true);
  view.setUint32(24, buf.sampleRate, true);
  view.setUint32(28, buf.sampleRate * chans * 2, true);
  view.setUint16(32, chans * 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, frames * chans * 2, true);
  const data = Array.from({ length: chans }, (_, c) => buf.getChannelData(c));
  let p = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < chans; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(p, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      p += 2;
    }
  }
  return out;
}
