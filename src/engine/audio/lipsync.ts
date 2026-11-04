/**
 * Anime lip-sync: the voice's loudness becomes three mouth drawings (closed, half, open),
 * changed on twos like the rest of the acting. Arabic speech is read by energy, so it works
 * for any dialect without a language model.
 */

export const VOICE_DELAY_FRAMES = 6; // the line starts a quarter second into the shot, with the bubble

export function lipLevels(pcm: Float32Array, sampleRate = 48000, fps = 24): string {
  const win = Math.round(sampleRate / fps);
  const frames = Math.ceil(pcm.length / win);
  const rms: number[] = [];
  for (let f = 0; f < frames; f++) {
    let s = 0;
    const a = f * win;
    const b = Math.min(pcm.length, a + win);
    for (let i = a; i < b; i++) s += pcm[i] * pcm[i];
    rms.push(Math.sqrt(s / Math.max(1, b - a)));
  }
  const sorted = [...rms].sort((x, y) => x - y);
  const ref = sorted[Math.floor(sorted.length * 0.9)] || 1e-6;
  let out = '';
  for (let f = 0; f < frames; f += 2) {
    const v = Math.max(rms[f] ?? 0, rms[f + 1] ?? 0) / ref;
    const level = v < 0.18 ? 0 : v < 0.55 ? 1 : 2;
    out += String(level).repeat(Math.min(2, frames - f));
  }
  return out;
}

/** Mouth level for a shot-local frame, or undefined when the line is not playing. */
export function levelAt(levels: string, localFrame: number): number | undefined {
  const i = localFrame - VOICE_DELAY_FRAMES;
  if (i < 0 || i >= levels.length) return undefined;
  return Number(levels[i]);
}
