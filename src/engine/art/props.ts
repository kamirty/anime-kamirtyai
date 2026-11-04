import type { CustomProp, PropPlacement } from '../../domain/types';
import { P, type Ctx, onTwos } from './paint';

/** Draws an assistant-made drawing (SVG paths in a 0..200 box) placed in world space with a simple motion. */
export function drawProp(ctx: Ctx, prop: CustomProp, pl: PropPlacement, W: number, H: number, t: number): void {
  const tq = onTwos(t);
  const size = pl.size * H;
  let x = pl.x * W;
  let y = pl.y * H;
  let rot = 0;
  let s = 1;
  switch (pl.motion) {
    case 'float':
      y += Math.sin(tq * 2.2) * size * 0.06;
      break;
    case 'bounce':
      y -= Math.abs(Math.sin(tq * 4)) * size * 0.18;
      break;
    case 'spin':
      rot = tq * 2;
      break;
    case 'fly':
      x += (tq - 1.5) * W * 0.12;
      y -= tq * H * 0.02;
      break;
    case 'grow':
      s = Math.min(1, 0.2 + tq / 0.8);
      break;
    case 'pulse':
      s = 1 + 0.06 * Math.sin(tq * 6);
      break;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale((s * size) / 200, (s * size) / 200);
  ctx.translate(-100, -100);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const part of prop.parts) {
    ctx.globalAlpha = part.opacity ?? 1;
    if (part.fill) {
      ctx.fillStyle = part.fill;
      ctx.fill(P(part.d));
    }
    if (part.stroke && (part.width ?? 0) > 0) {
      ctx.strokeStyle = part.stroke;
      ctx.lineWidth = part.width ?? 3;
      ctx.stroke(P(part.d));
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
