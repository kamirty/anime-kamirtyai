import type { EffectId } from '../../domain/types';
import { GREEN, INK, LINE, PRACTICAL, RED, type Ctx, mulberry, stroke } from './paint';

/** Screen-space effects. Everything is a function of (seed, time) so preview and export match frame for frame. */

const FESTIVE = [RED, GREEN, LINE, PRACTICAL, '#4fc3f7', '#ff7ab6'];

export const FIREWORK_PERIOD = 0.55;

/** Burst times (seconds, shot-local) so audio can pop at the same frames. */
export function fireworkTimes(duration: number): number[] {
  const out: number[] = [];
  for (let t = 0.25; t < duration - 0.2; t += FIREWORK_PERIOD) out.push(Math.round(t * 24) / 24);
  return out;
}

function burst(ctx: Ctx, x: number, y: number, r: number, age: number, colors: string[]) {
  const life = 0.95;
  if (age < 0 || age > life) return;
  const grow = 1 - Math.pow(1 - Math.min(1, age / 0.35), 3);
  const fade = age < 0.35 ? 1 : 1 - (age - 0.35) / (life - 0.35);
  const n = 18;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.055;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = colors[i % colors.length];
    const r0 = r * 0.25 * grow;
    const r1 = r * grow;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 + age * r * 0.15);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 + age * r * 0.25);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r1 * 1.12, y + Math.sin(a) * r1 * 1.12 + age * r * 0.3, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = LINE;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.09 * (1 - age), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawEffect(ctx: Ctx, id: EffectId, W: number, H: number, t: number, duration: number, seed: number): void {
  const m = Math.min(W, H);
  switch (id) {
    case 'fireworks': {
      const times = fireworkTimes(duration);
      times.forEach((t0, i) => {
        const r = mulberry(seed * 31 + i);
        const x = W * (0.12 + r() * 0.76);
        const y = H * (0.08 + r() * 0.38);
        const c1 = FESTIVE[Math.floor(r() * FESTIVE.length)];
        const c2 = FESTIVE[Math.floor(r() * FESTIVE.length)];
        // the rising trail
        if (t > t0 - 0.35 && t < t0) {
          const q = (t - (t0 - 0.35)) / 0.35;
          ctx.save();
          ctx.strokeStyle = PRACTICAL;
          ctx.lineWidth = m * 0.005;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(x, y + H * 0.35 * (1 - q) + H * 0.06);
          ctx.lineTo(x, y + H * 0.35 * (1 - q));
          ctx.stroke();
          ctx.restore();
        }
        burst(ctx, x, y, m * (0.1 + r() * 0.06), t - t0, [c1, c2, LINE]);
      });
      break;
    }
    case 'confetti': {
      const r = mulberry(seed);
      const tq = Math.floor(t * 24) / 24;
      for (let i = 0; i < 90; i++) {
        const x0 = r() * W;
        const speed = H * (0.12 + r() * 0.16);
        const phase = r() * 10;
        const c = FESTIVE[i % FESTIVE.length];
        const y = ((phase * speed + tq * speed) % (H * 1.1)) - H * 0.05;
        const x = x0 + Math.sin(tq * 2 + phase) * m * 0.03;
        const rot = tq * (2 + r() * 3) + phase;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = c;
        ctx.fillRect(-m * 0.008, -m * 0.004, m * 0.016, m * 0.008 * Math.abs(Math.cos(rot * 1.3)) + 1);
        ctx.restore();
      }
      break;
    }
    case 'balloons': {
      const r = mulberry(seed + 5);
      for (let i = 0; i < 9; i++) {
        const x0 = W * (0.05 + r() * 0.9);
        const speed = H * (0.08 + r() * 0.06);
        const start = r() * 1.5;
        const y = H * 1.1 - (t + start) * speed;
        if (y < -H * 0.2) continue;
        const x = x0 + Math.sin((t + start) * 1.5) * m * 0.02;
        const rr = m * (0.035 + r() * 0.015);
        const c = FESTIVE[i % FESTIVE.length];
        stroke(ctx, `M${x},${y + rr} q${-m * 0.01},${rr * 1.5} 0,${rr * 3}`, LINE, m * 0.002, undefined, 0.8);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(x, y, rr * 0.85, rr, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = m * 0.002;
        ctx.stroke();
        ctx.fillStyle = LINE;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(x - rr * 0.3, y - rr * 0.35, rr * 0.14, rr * 0.24, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ribbons': {
      const step = Math.floor((t * 24) / 4);
      const cols = [LINE, RED, GREEN];
      for (const side of [-1, 1]) {
        cols.forEach((c, i) => {
          const wob = Math.sin(step * 0.8 + i) * H * 0.008;
          const y0 = H * 0.1 + i * m * 0.04;
          const x0 = side < 0 ? -W * 0.05 : W * 1.05;
          const x1 = W * 0.5;
          const w = m * 0.035;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(x0, y0 + wob);
          ctx.bezierCurveTo(x0 + (x1 - x0) * 0.4, y0 + H * 0.12 + wob, x0 + (x1 - x0) * 0.7, y0 + H * 0.02, x1, y0 + H * 0.05 + wob);
          ctx.lineTo(x1, y0 + H * 0.05 + w + wob);
          ctx.bezierCurveTo(x0 + (x1 - x0) * 0.7, y0 + H * 0.02 + w, x0 + (x1 - x0) * 0.4, y0 + H * 0.12 + w + wob, x0, y0 + w + wob);
          ctx.closePath();
          ctx.fill();
        });
      }
      break;
    }
    case 'sparkles': {
      const r = mulberry(seed + 9);
      const step = Math.floor((t * 24) / 2);
      for (let i = 0; i < 26; i++) {
        const x = r() * W;
        const y = r() * H * 0.85;
        const ph = Math.floor(r() * 8);
        const on = (step + ph) % 8;
        if (on > 3) continue;
        const s = m * (0.012 + r() * 0.014) * [0.5, 1, 0.7, 0.3][on];
        ctx.fillStyle = i % 3 ? LINE : PRACTICAL;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 2);
        ctx.quadraticCurveTo(x, y, x + s * 2, y);
        ctx.quadraticCurveTo(x, y, x, y + s * 2);
        ctx.quadraticCurveTo(x, y, x - s * 2, y);
        ctx.quadraticCurveTo(x, y, x, y - s * 2);
        ctx.fill();
      }
      break;
    }
    case 'shootingStars': {
      for (let i = 0; i < 6; i++) {
        const r = mulberry(seed + i * 13);
        const t0 = i * 0.9 + r() * 0.5;
        const age = t - t0;
        if (age < 0 || age > 0.5) continue;
        const x = W * (0.2 + r() * 0.7) - age * W * 0.6;
        const y = H * (0.05 + r() * 0.25) + age * H * 0.25;
        ctx.save();
        ctx.globalAlpha = 1 - age / 0.5;
        const g = ctx.createLinearGradient(x, y, x + W * 0.15, y - H * 0.06);
        g.addColorStop(0, LINE);
        g.addColorStop(1, 'rgba(251,248,241,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = m * 0.005;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + W * 0.15, y - H * 0.06);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'rain': {
      ctx.save();
      ctx.fillStyle = '#0d1734';
      ctx.globalAlpha = 0.18;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#dfe9f7';
      ctx.lineWidth = m * 0.0025;
      const r = mulberry(seed + 2);
      const tq = Math.floor(t * 24) / 24;
      ctx.beginPath();
      for (let i = 0; i < 140; i++) {
        const x = r() * W * 1.2;
        const len = H * (0.04 + r() * 0.03);
        const y = ((r() * H + tq * H * 1.6) % (H * 1.1)) - H * 0.05;
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * 0.2, y + len);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'dust': {
      ctx.save();
      ctx.fillStyle = '#e6b87a';
      ctx.globalAlpha = 0.16;
      ctx.fillRect(0, H * 0.45, W, H * 0.55);
      const r = mulberry(seed + 4);
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 120; i++) {
        const y = H * (0.4 + r() * 0.6);
        const sp = W * (0.3 + r() * 0.4);
        const x = ((r() * W + t * sp) % (W * 1.1)) - W * 0.05;
        ctx.fillStyle = i % 2 ? '#f0c98a' : '#c99a5c';
        ctx.fillRect(x, y, m * 0.012, m * 0.003);
      }
      ctx.restore();
      break;
    }
    case 'speedlines': {
      const step = Math.floor((t * 24) / 2);
      const r = mulberry(seed + step);
      ctx.save();
      ctx.strokeStyle = LINE;
      ctx.globalAlpha = 0.7;
      ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2;
        const R = Math.hypot(W, H) * 0.6;
        const r0 = R * (0.55 + r() * 0.2);
        ctx.lineWidth = m * (0.002 + r() * 0.004);
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R);
        ctx.lineTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
  }
}
