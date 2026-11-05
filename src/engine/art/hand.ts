import type { HandShape } from '../../domain/types';
import { INK, type Ctx, type Paint } from './paint';

/**
 * The hand, turned along the forearm.
 *
 * A plain ball at the end of an arm has no direction, so a pose could never read as pointing,
 * waving or resting flat on the chest. These are simple mitten shapes — a palm and four fingers
 * in one silhouette — drawn in a frame where +x runs along the forearm, away from the elbow.
 */

/** `u` is the hand radius in body units; the hand is roughly two of those long. */
export function drawHand(ctx: Ctx, x: number, y: number, angle: number, shape: HandShape, u: number, skin: string, o: number, paint?: Paint): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fill = paint?.sil ?? skin;
  const ink = paint?.sil ?? INK;

  const blob = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (!paint?.sil) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = o;
      ctx.stroke();
    }
  };
  const finger = (fromX: number, fromY: number, toX: number, toY: number, w: number) => {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    if (!paint?.sil) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = w + o * 2;
      ctx.stroke();
    }
    ctx.strokeStyle = fill;
    ctx.lineWidth = w;
    ctx.stroke();
  };

  switch (shape) {
    case 'fist': {
      blob(u * 0.35, 0, u * 1.15, u * 1.05);
      if (!paint?.sil) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = o * 0.7;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(u * 1.1, i * u * 0.45);
          ctx.lineTo(u * 0.55, i * u * 0.5);
          ctx.stroke();
        }
      }
      break;
    }
    case 'point': {
      // palm closed, one finger out along the arm
      finger(u * 0.4, -u * 0.1, u * 2.5, -u * 0.15, u * 0.5);
      blob(u * 0.3, u * 0.1, u * 1.05, u * 0.95);
      break;
    }
    case 'flat': {
      // fingers together, a flat palm: for a salute, a stop, a high five
      ctx.beginPath();
      ctx.moveTo(-u * 0.5, -u * 0.95);
      ctx.lineTo(u * 1.5, -u * 0.8);
      ctx.quadraticCurveTo(u * 2.2, -u * 0.7, u * 2.15, 0);
      ctx.quadraticCurveTo(u * 2.1, u * 0.75, u * 1.4, u * 0.8);
      ctx.lineTo(-u * 0.5, u * 0.95);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (!paint?.sil) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = o;
        ctx.stroke();
        ctx.lineWidth = o * 0.6;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(u * 2.0, i * u * 0.5);
          ctx.lineTo(u * 1.1, i * u * 0.52);
          ctx.stroke();
        }
      }
      break;
    }
    case 'grip': {
      // curled around something
      blob(u * 0.3, 0, u * 1.1, u * 0.95);
      if (!paint?.sil) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = o * 0.8;
        ctx.beginPath();
        ctx.arc(u * 0.45, 0, u * 0.75, -1.1, 1.1);
        ctx.stroke();
      }
      break;
    }
    default: {
      // an open hand: palm with a soft fan of fingers and a thumb
      finger(u * 0.5, -u * 0.5, u * 1.95, -u * 0.95, u * 0.42);
      finger(u * 0.6, -u * 0.15, u * 2.15, -u * 0.25, u * 0.44);
      finger(u * 0.6, u * 0.25, u * 2.05, u * 0.45, u * 0.42);
      finger(u * 0.5, u * 0.6, u * 1.7, u * 1.05, u * 0.38);
      finger(u * 0.1, u * 0.6, u * 0.5, u * 1.5, u * 0.42);
      blob(u * 0.2, u * 0.05, u * 1.05, u * 0.95);
      break;
    }
  }
  ctx.restore();
}
