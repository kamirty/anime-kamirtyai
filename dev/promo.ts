import { FPS, H, W } from './promo/kinetic';
import { DURATION, FRAMES, HITS, draw, init } from './promo/film';
import { renderTrack, toWav } from './promo/sound';

/**
 * The promo render page. Node drives it: it asks for one frame at a time and pipes the JPEGs
 * into ffmpeg, then asks for the soundtrack as a WAV. Opening it by hand plays a preview.
 */

const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
canvas.style.cssText = 'height:96vh;display:block;margin:0 auto;background:#000';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d', { alpha: false })!;

declare global {
  interface Window {
    promo: {
      frames: number;
      fps: number;
      ready: boolean;
      seek: (n: number) => string;
      wav: () => Promise<string>;
    };
  }
}

window.promo = {
  frames: FRAMES,
  fps: FPS,
  ready: false,
  seek(n: number) {
    draw(ctx, n);
    return canvas.toDataURL('image/jpeg', 0.94);
  },
  async wav() {
    const buf = await renderTrack(HITS, DURATION);
    const bytes = toWav(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  },
};

init().then(() => {
  window.promo.ready = true;
  // a live preview when a person opens the page
  if (!location.search.includes('still')) {
    const t0 = performance.now();
    const tick = () => {
      const n = Math.floor(((performance.now() - t0) / 1000) * FPS) % FRAMES;
      draw(ctx, n);
      requestAnimationFrame(tick);
    };
    tick();
  } else draw(ctx, Number(new URLSearchParams(location.search).get('still') ?? 0));
});
