import type { HeldProp } from '../../domain/types';
import { INK, type Ctx, type Paint, cel, darken, fill, stroke } from './paint';

/**
 * Small objects a character can hold while posing: a book for reading, chalk for the board,
 * a dallah and finjan for Omani hospitality, a flask for the lab. Each is drawn at the hand
 * in body units, so it scales with adults and children alike.
 */

/** Which hand carries each object; the book is held in both. */
export const HELD_HAND: Record<HeldProp, 'both' | 'R'> = {
  book: 'both',
  paper: 'R',
  pen: 'R',
  pointer: 'R',
  flask: 'R',
  ball: 'R',
  flag: 'R',
  cup: 'R',
  dallah: 'R',
  mic: 'R',
  phone: 'R',
  plant: 'R',
};

const n = (v: number) => v.toFixed(1);

/**
 * Draws the held object. `hands` are the two hand centres in body units, `H` the body height.
 * The book sits between both hands; everything else sits in the right hand.
 */
export function drawHeld(ctx: Ctx, kind: HeldProp, hands: [[number, number], [number, number]], H: number, accent: string, paint?: Paint): void {
  const both = HELD_HAND[kind] === 'both';
  const [L, R] = hands;
  const x = both ? (L[0] + R[0]) / 2 : R[0];
  const y = both ? (L[1] + R[1]) / 2 : R[1];
  const o = 0.005 * H;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (kind) {
    case 'book': {
      // an open book, the spine in the middle and the pages fanning up
      const w = Math.max(0.075 * H, Math.min(0.1 * H, Math.abs(R[0] - L[0]) / 2 + 0.02 * H));
      const h = 0.085 * H;
      for (const sx of [-1, 1] as const) {
        cel(ctx, `M0,${n(-h * 0.1)} L${n(sx * w)},${n(-h * 0.45)} L${n(sx * w)},${n(h * 0.42)} L0,${n(h * 0.3)} Z`, '#f6f3ee', o, paint);
        if (!paint?.sil) for (let i = 1; i <= 3; i++) stroke(ctx, `M${n(sx * w * 0.2)},${n(-h * 0.2 + i * h * 0.14)} L${n(sx * w * 0.82)},${n(-h * 0.38 + i * h * 0.14)}`, '#9a948c', o * 0.7, paint);
        cel(ctx, `M${n(sx * w)},${n(-h * 0.45)} L${n(sx * (w + 0.012 * H))},${n(-h * 0.38)} L${n(sx * (w + 0.012 * H))},${n(h * 0.5)} L${n(sx * w)},${n(h * 0.42)} Z`, accent, o, paint);
      }
      stroke(ctx, `M0,${n(-h * 0.1)} L0,${n(h * 0.3)}`, INK, o, paint);
      break;
    }
    case 'paper': {
      const w = 0.05 * H;
      const h = 0.07 * H;
      cel(ctx, `M${n(-w)},${n(-h)} L${n(w)},${n(-h * 0.86)} L${n(w * 0.92)},${n(h)} L${n(-w * 1.08)},${n(h * 0.86)} Z`, '#f6f3ee', o, paint);
      if (!paint?.sil) for (let i = 0; i < 4; i++) stroke(ctx, `M${n(-w * 0.65)},${n(-h * 0.5 + i * h * 0.34)} L${n(w * 0.65)},${n(-h * 0.42 + i * h * 0.34)}`, '#a9a39a', o * 0.7, paint);
      break;
    }
    case 'pen': {
      cel(ctx, `M${n(-0.008 * H)},${n(0.03 * H)} L${n(0.014 * H)},${n(-0.04 * H)} L${n(0.03 * H)},${n(-0.035 * H)} L${n(0.008 * H)},${n(0.035 * H)} Z`, accent, o, paint);
      cel(ctx, `M${n(-0.008 * H)},${n(0.03 * H)} L${n(0.008 * H)},${n(0.035 * H)} L${n(-0.004 * H)},${n(0.05 * H)} Z`, INK, o * 0.6, paint);
      break;
    }
    case 'pointer': {
      stroke(ctx, `M${n(-0.02 * H)},${n(0.03 * H)} L${n(0.16 * H)},${n(-0.2 * H)}`, INK, o * 2.4, paint);
      stroke(ctx, `M${n(-0.02 * H)},${n(0.03 * H)} L${n(0.16 * H)},${n(-0.2 * H)}`, '#f0ece4', o * 1.4, paint);
      break;
    }
    case 'flask': {
      const h = 0.085 * H;
      cel(
        ctx,
        `M${n(-0.012 * H)},${n(-h * 0.6)} L${n(-0.012 * H)},${n(-h * 0.12)} L${n(-0.042 * H)},${n(h * 0.4)} L${n(0.042 * H)},${n(h * 0.4)} L${n(0.012 * H)},${n(-h * 0.12)} L${n(0.012 * H)},${n(-h * 0.6)} Z`,
        '#eef4f6',
        o,
        paint,
      );
      fill(ctx, `M${n(-0.03 * H)},${n(h * 0.1)} L${n(0.03 * H)},${n(h * 0.1)} L${n(0.042 * H)},${n(h * 0.4)} L${n(-0.042 * H)},${n(h * 0.4)} Z`, accent, paint, 0.85);
      stroke(ctx, `M${n(-0.016 * H)},${n(-h * 0.62)} L${n(0.016 * H)},${n(-h * 0.62)}`, INK, o * 1.4, paint);
      break;
    }
    case 'ball': {
      const r = 0.045 * H;
      cel(ctx, `M${n(-r)},0 a${n(r)},${n(r)} 0 1,0 ${n(r * 2)},0 a${n(r)},${n(r)} 0 1,0 ${n(-r * 2)},0 Z`, '#f3efe8', o, paint);
      if (!paint?.sil) {
        stroke(ctx, `M${n(-r * 0.9)},${n(-r * 0.3)} C${n(-r * 0.3)},${n(r * 0.3)} ${n(r * 0.3)},${n(r * 0.3)} ${n(r * 0.9)},${n(-r * 0.3)}`, INK, o, paint);
        stroke(ctx, `M${n(-r * 0.6)},${n(r * 0.72)} C${n(-r * 0.2)},${n(r * 0.2)} ${n(r * 0.2)},${n(r * 0.2)} ${n(r * 0.6)},${n(r * 0.72)}`, INK, o, paint);
      }
      break;
    }
    case 'flag': {
      // a simple three-band flag on a pole; no emblem
      stroke(ctx, `M${n(0.004 * H)},${n(0.05 * H)} L${n(0.004 * H)},${n(-0.26 * H)}`, '#6b4f35', o * 1.8, paint);
      const w = 0.13 * H;
      const h = 0.09 * H;
      const top = -0.25 * H;
      cel(ctx, `M${n(0.004 * H)},${n(top)} L${n(0.004 * H + w)},${n(top + 0.006 * H)} L${n(0.004 * H + w)},${n(top + h)} L${n(0.004 * H)},${n(top + h)} Z`, '#f6f3ee', o, paint);
      if (!paint?.sil) {
        fill(ctx, `M${n(0.004 * H)},${n(top)} L${n(0.004 * H + w)},${n(top + 0.006 * H)} L${n(0.004 * H + w)},${n(top + h / 3)} L${n(0.004 * H)},${n(top + h / 3)} Z`, '#d7192a', paint);
        fill(ctx, `M${n(0.004 * H)},${n(top + (h * 2) / 3)} L${n(0.004 * H + w)},${n(top + (h * 2) / 3)} L${n(0.004 * H + w)},${n(top + h)} L${n(0.004 * H)},${n(top + h)} Z`, '#1f7a4d', paint);
        fill(ctx, `M${n(0.004 * H)},${n(top)} L${n(0.004 * H + w * 0.26)},${n(top)} L${n(0.004 * H + w * 0.26)},${n(top + h)} L${n(0.004 * H)},${n(top + h)} Z`, '#d7192a', paint);
      }
      break;
    }
    case 'cup': {
      // an Omani finjan: a small handleless cup
      const w = 0.026 * H;
      cel(ctx, `M${n(-w)},${n(-0.02 * H)} L${n(-w * 0.6)},${n(0.016 * H)} L${n(w * 0.6)},${n(0.016 * H)} L${n(w)},${n(-0.02 * H)} Z`, '#f6f3ee', o * 0.8, paint);
      fill(ctx, `M${n(-w * 0.86)},${n(-0.012 * H)} L${n(w * 0.86)},${n(-0.012 * H)} L${n(w * 0.7)},${n(0.002 * H)} L${n(-w * 0.7)},${n(0.002 * H)} Z`, '#6b4228', paint);
      if (!paint?.sil) stroke(ctx, `M${n(-w * 0.3)},${n(-0.03 * H)} C${n(-w * 0.1)},${n(-0.046 * H)} ${n(w * 0.1)},${n(-0.038 * H)} ${n(w * 0.2)},${n(-0.056 * H)}`, '#d8d2c8', o * 0.7, paint, 0.75);
      break;
    }
    case 'dallah': {
      // an Omani coffee pot: body, curved spout, domed lid
      const h = 0.11 * H;
      const w = 0.035 * H;
      cel(ctx, `M${n(-w)},${n(h * 0.42)} C${n(-w * 1.1)},${n(0)} ${n(-w * 0.72)},${n(-h * 0.2)} ${n(-w * 0.52)},${n(-h * 0.34)} L${n(w * 0.52)},${n(-h * 0.34)} C${n(w * 0.72)},${n(-h * 0.2)} ${n(w * 1.1)},0 ${n(w)},${n(h * 0.42)} Z`, accent, o, paint);
      cel(ctx, `M${n(-w * 0.56)},${n(-h * 0.34)} C${n(-w * 0.3)},${n(-h * 0.52)} ${n(w * 0.3)},${n(-h * 0.52)} ${n(w * 0.56)},${n(-h * 0.34)} Z`, darken(accent, 0.2), o * 0.8, paint);
      stroke(ctx, `M0,${n(-h * 0.5)} L0,${n(-h * 0.6)}`, INK, o * 1.4, paint);
      // spout
      cel(
        ctx,
        `M${n(-w * 0.9)},${n(-h * 0.1)} C${n(-w * 1.9)},${n(-h * 0.18)} ${n(-w * 2.1)},${n(-h * 0.5)} ${n(-w * 1.5)},${n(-h * 0.66)} L${n(-w * 1.2)},${n(-h * 0.5)} C${n(-w * 1.5)},${n(-h * 0.4)} ${n(-w * 1.2)},${n(-h * 0.26)} ${n(-w * 0.8)},${n(-h * 0.2)} Z`,
        accent,
        o * 0.9,
        paint,
      );
      // handle
      stroke(ctx, `M${n(w * 0.95)},${n(-h * 0.18)} C${n(w * 2)},${n(-h * 0.12)} ${n(w * 2)},${n(h * 0.2)} ${n(w * 0.9)},${n(h * 0.26)}`, INK, o * 2.6, paint);
      stroke(ctx, `M${n(w * 0.95)},${n(-h * 0.18)} C${n(w * 2)},${n(-h * 0.12)} ${n(w * 2)},${n(h * 0.2)} ${n(w * 0.9)},${n(h * 0.26)}`, darken(accent, 0.25), o * 1.5, paint);
      break;
    }
    case 'mic': {
      stroke(ctx, `M0,${n(0.04 * H)} L${n(0.006 * H)},${n(-0.012 * H)}`, '#2b2f3a', o * 2.2, paint);
      cel(ctx, `M${n(-0.018 * H)},${n(-0.03 * H)} a${n(0.019 * H)},${n(0.024 * H)} 0 1,0 ${n(0.038 * H)},0 a${n(0.019 * H)},${n(0.024 * H)} 0 1,0 ${n(-0.038 * H)},0 Z`, '#4b505c', o, paint);
      break;
    }
    case 'phone': {
      cel(ctx, `M${n(-0.022 * H)},${n(-0.04 * H)} L${n(0.022 * H)},${n(-0.04 * H)} L${n(0.022 * H)},${n(0.04 * H)} L${n(-0.022 * H)},${n(0.04 * H)} Z`, '#2b2f3a', o, paint);
      fill(ctx, `M${n(-0.016 * H)},${n(-0.032 * H)} L${n(0.016 * H)},${n(-0.032 * H)} L${n(0.016 * H)},${n(0.028 * H)} L${n(-0.016 * H)},${n(0.028 * H)} Z`, '#a9dcf5', paint);
      break;
    }
    case 'plant': {
      // a seedling in a small pot
      cel(ctx, `M${n(-0.03 * H)},${n(0.004 * H)} L${n(0.03 * H)},${n(0.004 * H)} L${n(0.022 * H)},${n(0.046 * H)} L${n(-0.022 * H)},${n(0.046 * H)} Z`, '#b4703f', o, paint);
      stroke(ctx, `M0,${n(0.004 * H)} L0,${n(-0.05 * H)}`, '#3f7a3f', o * 1.4, paint);
      cel(ctx, `M0,${n(-0.03 * H)} C${n(-0.034 * H)},${n(-0.042 * H)} ${n(-0.036 * H)},${n(-0.07 * H)} ${n(-0.004 * H)},${n(-0.064 * H)} Z`, '#4f9a4f', o * 0.7, paint);
      cel(ctx, `M0,${n(-0.042 * H)} C${n(0.034 * H)},${n(-0.056 * H)} ${n(0.036 * H)},${n(-0.084 * H)} ${n(0.004 * H)},${n(-0.078 * H)} Z`, '#4f9a4f', o * 0.7, paint);
      break;
    }
  }
  ctx.restore();
}
