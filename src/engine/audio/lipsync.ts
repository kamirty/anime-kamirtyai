import { FPS } from '../../domain/types';
import type { SceneVoices } from './soundtrack';

/** Audio-energy lip sync (not phoneme recognition). Peaks align to timeline frames. */
export type LipSyncTracks = Record<string, Float32Array>;

export function createLipSync(voices: SceneVoices, sampleRate = 48000): LipSyncTracks {
  const tracks: LipSyncTracks = {};
  const block = Math.round(sampleRate / FPS);
  for (const [id, voice] of Object.entries(voices)) {
    const frames = Math.ceil(Math.min(voice.L.length, voice.R.length) / block);
    const rms = new Float32Array(frames);
    let peak = 0;
    for (let f = 0; f < frames; f++) {
      let energy = 0;
      let count = 0;
      const begin = f * block;
      for (let i = begin; i < Math.min(begin + block, voice.L.length, voice.R.length); i += 4) {
        const s = (voice.L[i] + voice.R[i]) * 0.5;
        energy += s * s; count++;
      }
      const value = Math.sqrt(energy / Math.max(1, count));
      rms[f] = value;
      peak = Math.max(peak, value);
    }
    if (peak > 0.001) for (let i = 0; i < frames; i++) rms[i] = rms[i] / peak;
    tracks[id] = rms;
  }
  return tracks;
}
