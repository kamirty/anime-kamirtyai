import { drawHead } from '../src/engine/art/head';
import { SKINS } from '../src/domain/types';

/** Developer page: the massar drawn large, front view, in a few colours, next to the reference proportions. */
const colors = ['#8a9a3a', '#b03030', '#2f5d8a', '#c9a227'];
for (const accent of colors) {
  const c = document.createElement('canvas');
  c.width = 420;
  c.height = 460;
  c.style.cssText = 'width:420px;background:#fff';
  document.body.appendChild(c);
  const ctx = c.getContext('2d')!;
  ctx.translate(210, 260);
  ctx.scale(0.62, 0.62);
  ctx.lineJoin = 'round';
  drawHead(ctx, { skin: SKINS[1], headwear: 'massar', wear: accent, accent, hair: '#2a2119', expression: 'calm', gaze: { x: 0, y: 0 }, mouthOpen: false, blink: false, lw: 1 });
}
(window as unknown as { done: boolean }).done = true;
