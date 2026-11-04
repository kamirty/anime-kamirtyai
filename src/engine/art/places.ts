import type { PlaceId, TimeOfDay } from '../../domain/types';
import { INK, MOON, PRACTICAL, P, type Ctx, cel, darken, fill, lighten, mix, mulberry, shade, stroke } from './paint';

/**
 * Backgrounds in world units (W × H, ground line at gY). Each place is split into parallax layers
 * so close shots feel deep: sky (barely moves), far, mid, ground (moves with the characters).
 */

export type Layer = 'sky' | 'far' | 'mid' | 'ground';
export const LAYERS: { id: Layer; depth: number }[] = [
  { id: 'sky', depth: 0.12 },
  { id: 'far', depth: 0.35 },
  { id: 'mid', depth: 0.7 },
  { id: 'ground', depth: 1 },
];

export interface World {
  W: number;
  H: number;
  gY: number;
  time: TimeOfDay;
  /** Shot-local seconds, for the few things that move in the background (water, clouds). */
  t: number;
}

export const INTERIOR: Record<PlaceId, boolean> = {
  fort: false,
  desert: false,
  sea: false,
  mountains: false,
  farm: false,
  city: false,
  classroom: true,
  home: true,
  space: false,
};

/** Tints a daylight colour for the time of day. */
export function lit(c: string, time: TimeOfDay): string {
  if (time === 'day') return c;
  if (time === 'sunset') return mix(c, '#8a3f55', 0.28);
  return mix(c, '#0d1734', 0.58);
}

/** Where the sun or moon sits (world units); the power move aims at it. */
export function skyBody(w: World): { x: number; y: number; r: number } {
  const m = Math.min(w.W, w.H);
  if (w.time === 'sunset') return { x: w.W * 0.7, y: w.gY - w.H * 0.2, r: m * 0.11 };
  return { x: w.W * 0.7, y: w.H * (w.W > w.H ? 0.2 : 0.16), r: m * (w.time === 'night' ? 0.085 : 0.07) };
}

function skyGradient(ctx: Ctx, w: World, top: number, bottom: number) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  if (w.time === 'day') {
    g.addColorStop(0, '#3f9fe3');
    g.addColorStop(1, '#cdeefe');
  } else if (w.time === 'sunset') {
    g.addColorStop(0, '#26275c');
    g.addColorStop(0.55, '#b4557a');
    g.addColorStop(1, '#ffb466');
  } else {
    g.addColorStop(0, '#070a16');
    g.addColorStop(0.62, '#12204a');
    g.addColorStop(1, '#12204a');
  }
  ctx.fillStyle = g;
}

function stars(ctx: Ctx, w: World, x0: number, y0: number, x1: number, y1: number, count: number, seed: number) {
  const r = mulberry(seed);
  ctx.fillStyle = '#fbf8f1';
  const m = Math.min(w.W, w.H);
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const s = (0.0014 + r() * 0.0022) * m;
    ctx.globalAlpha = 0.4 + r() * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function cloud(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 120 * s, 34 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 60 * s, y - 20 * s, 60 * s, 40 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 30 * s, y - 34 * s, 70 * s, 50 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Sky with sun or moon, clouds and stars, filling the rectangle. */
export function drawSky(ctx: Ctx, w: World, rect = { x: 0, y: 0, w: w.W, h: w.H }, seed = 7) {
  skyGradient(ctx, w, rect.y, rect.y + Math.max(rect.h, w.gY - rect.y));
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const b = skyBody(w);
  const m = Math.min(w.W, w.H);
  if (w.time === 'night') {
    stars(ctx, w, rect.x, rect.y, rect.x + rect.w, rect.y + rect.h * 0.75, Math.round((rect.w * rect.h) / 26000), seed);
    for (const [k, a] of [[1.85, 0.06], [1.4, 0.09]] as const) {
      ctx.globalAlpha = a;
      ctx.fillStyle = MOON;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = MOON;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#12204a';
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.25, b.r * 0.32, b.r * 0.24, 0.3, 0, Math.PI * 2);
    ctx.ellipse(b.x + b.r * 0.35, b.y + b.r * 0.3, b.r * 0.22, b.r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const sun = w.time === 'day' ? '#fff3c4' : '#ffd27a';
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    const drift = w.t * m * 0.004;
    const c = w.time === 'day' ? '#ffffff' : '#ffc6b0';
    ctx.globalAlpha = w.time === 'day' ? 0.92 : 0.7;
    cloud(ctx, rect.x + rect.w * 0.2 + drift, rect.y + rect.h * 0.18, m * 0.0016, c);
    cloud(ctx, rect.x + rect.w * 0.62 - drift * 0.6, rect.y + rect.h * 0.3, m * 0.0011, c);
    ctx.globalAlpha = 1;
  }
}

function ridge(w: World, seed: number, base: number, amp: number, step: number): string {
  const r = mulberry(seed);
  let d = `M${-w.W * 0.3},${w.H * 1.2} L${-w.W * 0.3},${base}`;
  for (let x = -w.W * 0.3; x <= w.W * 1.3; x += step) {
    d += ` L${x.toFixed(0)},${(base - r() * amp).toFixed(0)}`;
  }
  return `${d} L${w.W * 1.3},${w.H * 1.2} Z`;
}

function palm(ctx: Ctx, x: number, y: number, s: number, color: string, sway = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fill(ctx, 'M-12,0 C-8,-90 -16,-180 -6,-262 L6,-262 C0,-180 10,-90 14,0 Z', color);
  ctx.translate(0, -262);
  ctx.rotate(sway);
  ctx.translate(0, 262);
  const fronds = [
    'M0,-262 C40,-304 112,-306 156,-248 C104,-282 44,-276 0,-256 Z',
    'M0,-262 C-40,-304 -112,-306 -156,-248 C-104,-282 -44,-276 0,-256 Z',
    'M0,-262 C50,-280 120,-250 150,-180 C108,-236 52,-252 0,-254 Z',
    'M0,-262 C-50,-280 -120,-250 -150,-180 C-108,-236 -52,-252 0,-254 Z',
    'M0,-262 C20,-320 70,-350 110,-340 C60,-326 26,-296 2,-258 Z',
    'M0,-262 C-20,-320 -70,-350 -110,-340 C-60,-326 -26,-296 -2,-258 Z',
    'M0,-262 C30,-250 70,-200 80,-140 C56,-196 30,-236 0,-256 Z',
    'M0,-262 C-30,-250 -70,-200 -80,-140 C-56,-196 -30,-236 0,-256 Z',
  ];
  for (const f of fronds) fill(ctx, f, color);
  ctx.restore();
}

/** Palm sway on fours so leaves move like drawn animation, not a tween. */
const sway = (t: number, seed: number) => [0, 0.03, 0.05, 0.03][(Math.floor((t * 24) / 6) + seed) % 4] - 0.02;

let fortCache: string[] | null = null;
function fortPaths(): string[] {
  if (fortCache) return fortCache;
  const merl = (x0: number, x1: number, yBase: number, w: number, gap: number, h: number) => {
    let d = '';
    for (let x = x0; x + w <= x1; x += w + gap) d += `M${x},${yBase} L${x},${yBase - h * 0.55} L${x + w / 2},${yBase - h} L${x + w},${yBase - h * 0.55} L${x + w},${yBase} Z `;
    return d;
  };
  fortCache = [
    // 0 lower walls
    'M-470,330 L-470,280 L-400,280 L-400,330 L470,330 L470,560 L-470,560 Z',
    // 1 low merlons
    merl(-470, -215, 330, 20, 10, 28) + merl(222, 470, 330, 20, 10, 28),
    // 2 tower body
    'M-195,30 L-215,390 C-80,410 80,410 215,390 L195,30 Z',
    // 3 tower shadow
    'M92,30 L195,30 L215,390 C180,396 150,400 120,402 C126,270 116,140 92,30 Z',
    // 4 parapet
    'M-206,0 L206,0 L206,32 L-206,32 Z',
    // 5 top merlons
    merl(-200, 206, 0, 24, 9, 36),
    // 6 slits
    'M-150,80 h12 v24 h-12 Z M-80,76 h12 v24 h-12 Z M-10,74 h12 v24 h-12 Z M60,76 h12 v24 h-12 Z M130,80 h12 v24 h-12 Z M-120,190 h12 v22 h-12 Z M-30,186 h12 v22 h-12 Z M140,190 h12 v22 h-12 Z M-170,300 h12 v22 h-12 Z M-60,296 h12 v22 h-12 Z M30,296 h12 v22 h-12 Z M110,300 h12 v22 h-12 Z',
    // 7 lit windows
    'M50,188 h12 v22 h-12 Z M-90,298 h12 v20 h-12 Z M-440,390 h14 v22 h-14 Z M-230,400 h12 v20 h-12 Z M300,392 h14 v22 h-14 Z M410,410 h12 v20 h-12 Z',
    // 8 gate
    'M-350,560 L-350,470 C-350,440 -290,440 -290,470 L-290,560 Z',
  ];
  return fortCache;
}

function drawFort(ctx: Ctx, w: World, cx: number, scale: number) {
  const f = fortPaths();
  const wall = lit('#b98a5e', w.time);
  const tower = lit('#c4956a', w.time);
  ctx.save();
  ctx.translate(cx, w.gY - 560 * scale);
  ctx.scale(scale, scale);
  // mosque dome and minaret behind the walls
  const sil = lit('#6f7fa8', w.time);
  fill(ctx, 'M330,330 L330,240 C330,180 450,180 450,240 L450,330 Z', sil);
  fill(ctx, 'M470,330 L470,40 L504,40 L504,330 Z M462,120 h50 v14 h-50 Z M474,40 L487,0 L500,40 Z', sil);
  stroke(ctx, 'M390,176 A10,10 0 1 1 400,166', w.time === 'night' ? PRACTICAL : '#e0b04a', 3);
  cel(ctx, f[0], wall, 4);
  shade(ctx, f[0], undefined, 0.15);
  cel(ctx, f[1], wall, 2);
  fill(ctx, f[8], INK, undefined, 0.85);
  cel(ctx, f[2], tower, 4);
  shade(ctx, f[3], undefined, 0.22);
  cel(ctx, f[4], tower, 4);
  shade(ctx, 'M-196,32 h392 v12 h-392 Z', undefined, 0.25);
  cel(ctx, f[5], tower, 2.5);
  fill(ctx, f[6], INK, undefined, 0.8);
  if (w.time !== 'day') fill(ctx, f[7], PRACTICAL);
  else fill(ctx, f[7], INK, undefined, 0.6);
  // flag on the tower
  stroke(ctx, 'M120,0 L120,-120', '#e8e2d6', 4);
  ctx.save();
  ctx.translate(122, -118);
  const flap = [0, 0.06, -0.04][Math.floor((w.t * 24) / 4) % 3];
  ctx.transform(1, flap, 0, 1, 0, 0);
  fill(ctx, 'M0,0 h22 v48 h-22 Z', '#d7192a');
  fill(ctx, 'M22,0 h54 v16 h-54 Z', '#fbf8f1');
  fill(ctx, 'M22,16 h54 v16 h-54 Z', '#d7192a');
  fill(ctx, 'M22,32 h54 v16 h-54 Z', '#0b8a3c');
  ctx.restore();
  ctx.restore();
}

function groundBand(ctx: Ctx, w: World, color: string, edge?: string) {
  const c = lit(color, w.time);
  ctx.fillStyle = c;
  ctx.fillRect(-w.W * 0.3, w.gY, w.W * 1.6, w.H * 1.3 - w.gY);
  if (edge) {
    ctx.fillStyle = lit(edge, w.time);
    ctx.fillRect(-w.W * 0.3, w.gY, w.W * 1.6, w.H * 0.012);
  }
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(-w.W * 0.3, w.gY + (w.H - w.gY) * 0.55, w.W * 1.6, w.H);
  ctx.globalAlpha = 1;
}

function interiorWindow(ctx: Ctx, w: World, x: number, y: number, ww: number, hh: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, ww, hh);
  ctx.clip();
  drawSky(ctx, { ...w }, { x, y, w: ww, h: hh }, 3);
  ctx.restore();
  const frame = lit('#8a5a3c', w.time);
  ctx.strokeStyle = frame;
  ctx.lineWidth = Math.min(w.W, w.H) * 0.014;
  ctx.strokeRect(x, y, ww, hh);
  ctx.beginPath();
  ctx.moveTo(x + ww / 2, y);
  ctx.lineTo(x + ww / 2, y + hh);
  ctx.moveTo(x, y + hh / 2);
  ctx.lineTo(x + ww, y + hh / 2);
  ctx.lineWidth = Math.min(w.W, w.H) * 0.008;
  ctx.stroke();
}

export function drawPlace(ctx: Ctx, place: PlaceId, layer: Layer, w: World): void {
  const { W, H, gY } = w;
  const m = Math.min(W, H);
  const night = w.time === 'night';
  switch (place) {
    case 'fort': {
      if (layer === 'sky') drawSky(ctx, w);
      if (layer === 'far') {
        fill(ctx, ridge(w, 11, gY - H * 0.2, H * 0.08, W * 0.06), lit('#7d8db3', w.time), undefined, night ? 0.55 : 0.8);
        fill(ctx, ridge(w, 12, gY - H * 0.12, H * 0.05, W * 0.08), lit('#5f6e96', w.time), undefined, night ? 0.75 : 0.9);
      }
      if (layer === 'mid') {
        const s = Math.min((W * 0.86) / 940, (H * 0.32) / 560);
        drawFort(ctx, w, W * 0.5, s);
      }
      if (layer === 'ground') {
        groundBand(ctx, w, '#c9a36b', '#a8834f');
        const pc = lit('#2c3a2a', w.time);
        palm(ctx, W * 0.06, gY + H * 0.04, m * 0.0016, pc, sway(w.t, 1));
        palm(ctx, W * 0.95, gY + H * 0.05, m * 0.0014, pc, sway(w.t, 2));
      }
      break;
    }
    case 'desert': {
      if (layer === 'sky') drawSky(ctx, w);
      if (layer === 'far') fill(ctx, `M${-W * 0.3},${gY - H * 0.06} C${W * 0.2},${gY - H * 0.16} ${W * 0.5},${gY - H * 0.02} ${W * 0.8},${gY - H * 0.12} C${W},${gY - H * 0.18} ${W * 1.2},${gY - H * 0.08} ${W * 1.3},${gY - H * 0.1} L${W * 1.3},${H * 1.2} L${-W * 0.3},${H * 1.2} Z`, lit('#e6b87a', w.time));
      if (layer === 'mid') {
        const sand = lit('#e9a85c', w.time);
        const dark = lit('#c47f3c', w.time);
        const dune = `M${-W * 0.3},${gY} C${W * 0.05},${gY - H * 0.18} ${W * 0.25},${gY - H * 0.2} ${W * 0.42},${gY - H * 0.14} C${W * 0.6},${gY - H * 0.08} ${W * 0.75},${gY - H * 0.02} ${W * 1.3},${gY} L${W * 1.3},${H * 1.2} L${-W * 0.3},${H * 1.2} Z`;
        fill(ctx, dune, sand);
        fill(ctx, `M${W * 0.42},${gY - H * 0.14} C${W * 0.6},${gY - H * 0.08} ${W * 0.75},${gY - H * 0.02} ${W * 1.3},${gY} L${W * 0.5},${gY} C${W * 0.48},${gY - H * 0.05} ${W * 0.46},${gY - H * 0.1} ${W * 0.42},${gY - H * 0.14} Z`, dark, undefined, 0.6);
        // ghaf tree
        ctx.save();
        ctx.translate(W * 0.82, gY - H * 0.02);
        const s = m * 0.0018;
        ctx.scale(s, s);
        const tree = lit('#4f6b3a', w.time);
        fill(ctx, 'M-8,0 C-6,-60 -20,-110 -40,-140 L-30,-146 C-10,-120 0,-90 4,-70 C10,-100 30,-130 52,-150 L60,-142 C36,-116 18,-80 12,0 Z', lit('#5a3d2b', w.time));
        ctx.fillStyle = tree;
        ctx.beginPath();
        ctx.ellipse(-30, -170, 90, 46, 0, 0, Math.PI * 2);
        ctx.ellipse(50, -180, 80, 44, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -210, 90, 44, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (layer === 'ground') {
        groundBand(ctx, w, '#f0b56a');
        const r = mulberry(5);
        for (let i = 0; i < 14; i++) {
          const x = r() * W * 1.2 - W * 0.1;
          const y = gY + (0.1 + r() * 0.8) * (H - gY);
          stroke(ctx, `M${x},${y} q${m * 0.03},${-m * 0.008} ${m * 0.06},0`, lit('#c8873f', w.time), m * 0.003, undefined, 0.6);
        }
      }
      break;
    }
    case 'sea': {
      const horizon = gY - H * 0.15;
      if (layer === 'sky') drawSky(ctx, w);
      if (layer === 'far') {
        const sea = lit('#1f7fb8', w.time);
        ctx.fillStyle = sea;
        ctx.fillRect(-W * 0.3, horizon, W * 1.6, H);
        ctx.fillStyle = lit('#3aa0d6', w.time);
        ctx.fillRect(-W * 0.3, horizon, W * 1.6, H * 0.02);
        const b = skyBody(w);
        ctx.fillStyle = night ? MOON : '#fff3c4';
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < 6; i++) ctx.fillRect(b.x - m * 0.05 + ((i * 37) % 60), horizon + i * H * 0.022 + H * 0.01, m * (0.1 - i * 0.012), H * 0.006);
        ctx.globalAlpha = 1;
        // a dhow on the horizon
        ctx.save();
        ctx.translate(W * 0.25, horizon + H * 0.005);
        const s = m * 0.0012;
        ctx.scale(s, s);
        const boat = lit('#3b2b25', w.time);
        fill(ctx, 'M-120,0 L120,0 L90,30 L-100,30 Z', boat);
        fill(ctx, 'M0,0 L0,-150 L4,-150 L4,0 Z', boat);
        fill(ctx, 'M6,-150 C70,-110 90,-50 70,-10 L6,-10 Z', lit('#f1e6cf', w.time));
        ctx.restore();
      }
      if (layer === 'mid') {
        const step = Math.floor((w.t * 24) / 4) % 2;
        for (let i = 0; i < 7; i++) {
          const y = horizon + (H * 0.03 + i * (gY - horizon) * 0.14);
          const x0 = ((i * 173 + step * 40) % 300) - 150;
          for (let x = x0; x < W * 1.2; x += m * 0.28) stroke(ctx, `M${x},${y} q${m * 0.03},${-m * 0.012} ${m * 0.06},0`, lit('#bfe6f7', w.time), m * 0.004, undefined, 0.75);
        }
      }
      if (layer === 'ground') {
        groundBand(ctx, w, '#ecd09a');
        const step = Math.floor((w.t * 24) / 6) % 3;
        fill(ctx, `M${-W * 0.3},${gY} C${W * 0.2},${gY + H * (0.01 + step * 0.004)} ${W * 0.6},${gY - H * 0.006} ${W * 1.3},${gY + H * 0.01} L${W * 1.3},${gY - H * 0.004} L${-W * 0.3},${gY - H * 0.004} Z`, '#fbf8f1', undefined, 0.85);
      }
      break;
    }
    case 'mountains':
    case 'farm': {
      if (layer === 'sky') drawSky(ctx, w);
      if (layer === 'far') {
        fill(ctx, ridge(w, 21, gY - H * 0.26, H * 0.13, W * 0.05), lit('#8a7a8c', w.time), undefined, night ? 0.6 : 0.85);
        fill(ctx, ridge(w, 22, gY - H * 0.14, H * 0.08, W * 0.07), lit('#6d5f6e', w.time), undefined, night ? 0.8 : 0.95);
      }
      if (layer === 'mid') {
        const pc = lit('#2f4a2c', w.time);
        if (place === 'farm') {
          for (let i = 0; i < 9; i++) palm(ctx, (i / 8) * W * 1.1 - W * 0.05, gY + H * 0.01, m * (0.0012 + (i % 3) * 0.0002), pc, sway(w.t, i));
        } else {
          fill(ctx, `M${-W * 0.3},${gY} L${W * 0.1},${gY - H * 0.08} L${W * 0.28},${gY - H * 0.03} L${W * 0.36},${gY} Z`, lit('#7a5c48', w.time));
          fill(ctx, `M${W * 0.62},${gY} L${W * 0.82},${gY - H * 0.1} L${W * 1.3},${gY} Z`, lit('#6b4e3d', w.time));
          palm(ctx, W * 0.42, gY + H * 0.01, m * 0.0013, pc, sway(w.t, 4));
          palm(ctx, W * 0.5, gY + H * 0.012, m * 0.001, pc, sway(w.t, 5));
        }
      }
      if (layer === 'ground') {
        if (place === 'farm') {
          groundBand(ctx, w, '#8fae5a');
          // falaj channel
          fill(ctx, `M${-W * 0.3},${gY + H * 0.035} L${W * 1.3},${gY + H * 0.035} L${W * 1.3},${gY + H * 0.055} L${-W * 0.3},${gY + H * 0.055} Z`, lit('#c2a27a', w.time));
          fill(ctx, `M${-W * 0.3},${gY + H * 0.04} L${W * 1.3},${gY + H * 0.04} L${W * 1.3},${gY + H * 0.05} L${-W * 0.3},${gY + H * 0.05} Z`, lit('#3f9fd6', w.time));
        } else {
          groundBand(ctx, w, '#a98463');
          const r = mulberry(9);
          for (let i = 0; i < 10; i++) {
            const x = r() * W;
            const y = gY + (0.15 + r() * 0.7) * (H - gY);
            ctx.fillStyle = lit('#7d5f47', w.time);
            ctx.beginPath();
            ctx.ellipse(x, y, m * (0.02 + r() * 0.02), m * 0.012, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'city': {
      if (layer === 'sky') drawSky(ctx, w);
      if (layer === 'far' || layer === 'mid') {
        const far = layer === 'far';
        const r = mulberry(far ? 31 : 32);
        const base = far ? gY - H * 0.02 : gY;
        const col = lit(far ? '#7b8aa8' : '#a7a2a0', w.time);
        let x = -W * 0.3;
        while (x < W * 1.3) {
          const bw = W * (far ? 0.06 + r() * 0.06 : 0.1 + r() * 0.08);
          const bh = H * (far ? 0.14 + r() * 0.16 : 0.08 + r() * 0.12);
          fill(ctx, `M${x},${base} L${x},${base - bh} L${x + bw},${base - bh} L${x + bw},${base} Z`, col, undefined, far ? 0.9 : 1);
          if (!far) shade(ctx, `M${x + bw * 0.7},${base} L${x + bw * 0.7},${base - bh} L${x + bw},${base - bh} L${x + bw},${base} Z`, undefined, 0.18);
          const win = night ? PRACTICAL : lit('#d8e9f5', w.time);
          for (let wy = base - bh + H * 0.015; wy < base - H * 0.02; wy += H * 0.03) {
            for (let wx = x + bw * 0.15; wx < x + bw * 0.85; wx += bw * 0.22) {
              if (r() < (night ? 0.55 : 0.8)) {
                ctx.fillStyle = win;
                ctx.globalAlpha = far ? 0.7 : 1;
                ctx.fillRect(wx, wy, bw * 0.1, H * 0.012);
              }
            }
          }
          ctx.globalAlpha = 1;
          x += bw + W * 0.01;
        }
      }
      if (layer === 'ground') {
        groundBand(ctx, w, '#8d8f96');
        ctx.fillStyle = lit('#c9c4b8', w.time);
        ctx.fillRect(-W * 0.3, gY, W * 1.6, H * 0.025);
        ctx.fillStyle = '#fbf8f1';
        ctx.globalAlpha = 0.8;
        for (let x = -W * 0.2; x < W * 1.2; x += W * 0.18) ctx.fillRect(x, gY + (H - gY) * 0.55, W * 0.09, H * 0.008);
        ctx.globalAlpha = 1;
        // street lamps
        for (const lx of [W * 0.12, W * 0.88]) {
          stroke(ctx, `M${lx},${gY + H * 0.02} L${lx},${gY - H * 0.2} L${lx + (lx < W / 2 ? 1 : -1) * W * 0.04},${gY - H * 0.2}`, lit('#3b3f4a', w.time), m * 0.008);
          if (night) {
            ctx.fillStyle = PRACTICAL;
            ctx.globalAlpha = 0.25;
            ctx.beginPath();
            ctx.arc(lx + (lx < W / 2 ? 1 : -1) * W * 0.04, gY - H * 0.195, m * 0.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = night ? PRACTICAL : '#f6f3ee';
          ctx.beginPath();
          ctx.arc(lx + (lx < W / 2 ? 1 : -1) * W * 0.04, gY - H * 0.195, m * 0.012, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'classroom': {
      if (layer === 'sky') {
        ctx.fillStyle = lit('#efe4cc', w.time === 'night' ? 'sunset' : 'day');
        ctx.fillRect(-W * 0.3, -H * 0.2, W * 1.6, H * 1.4);
        ctx.fillStyle = lit('#d9c9a6', 'day');
        ctx.fillRect(-W * 0.3, gY - H * 0.12, W * 1.6, H * 0.012);
      }
      if (layer === 'far') {
        const bw = W * (W > H ? 0.42 : 0.62);
        const bh = H * (W > H ? 0.32 : 0.18);
        const bx = W * 0.5 - bw / 2;
        const by = gY - H * 0.12 - bh - H * 0.06;
        cel(ctx, `M${bx - m * 0.015},${by - m * 0.015} h${bw + m * 0.03} v${bh + m * 0.03} h${-(bw + m * 0.03)} Z`, '#8a5a3c', 3);
        fill(ctx, `M${bx},${by} h${bw} v${bh} h${-bw} Z`, '#2f5d50');
        ctx.save();
        ctx.fillStyle = '#e8f1ea';
        ctx.globalAlpha = 0.9;
        ctx.direction = 'rtl';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${Math.round(bh * 0.32)}px "Aref Ruqaa", "Cairo", serif`;
        ctx.fillText('أ ب ت', bx + bw * 0.62, by + bh * 0.42);
        ctx.font = `700 ${Math.round(bh * 0.2)}px "Cairo", sans-serif`;
        ctx.direction = 'ltr';
        ctx.fillText('1 + 2 = 3', bx + bw * 0.26, by + bh * 0.62);
        ctx.restore();
        interiorWindow(ctx, w, W * (W > H ? 0.06 : 0.04), by, bw * 0.28, bh);
        // clock
        ctx.fillStyle = '#fbf8f1';
        ctx.beginPath();
        ctx.arc(W * 0.86, by + bh * 0.2, m * 0.035, 0, Math.PI * 2);
        ctx.fill();
        stroke(ctx, `M${W * 0.86},${by + bh * 0.2} l0,${-m * 0.025} M${W * 0.86},${by + bh * 0.2} l${m * 0.018},0`, INK, m * 0.004);
        ctx.strokeStyle = INK;
        ctx.lineWidth = m * 0.004;
        ctx.beginPath();
        ctx.arc(W * 0.86, by + bh * 0.2, m * 0.035, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (layer === 'mid') {
        // teacher's desk
        const dx = W * 0.78;
        const dw = W * 0.22;
        cel(ctx, `M${dx},${gY} L${dx},${gY - H * 0.07} L${dx + dw},${gY - H * 0.07} L${dx + dw},${gY} Z`, '#a8744c', 4);
        fill(ctx, `M${dx + dw * 0.1},${gY - H * 0.07} l${dw * 0.25},0 l0,${-H * 0.03} l${-dw * 0.25},0 Z`, '#d7192a');
      }
      if (layer === 'ground') {
        groundBand(ctx, w, '#c9a77c');
        ctx.strokeStyle = lit('#a8865c', 'day');
        ctx.lineWidth = m * 0.003;
        for (let y = gY + H * 0.03; y < H * 1.1; y += H * 0.04) {
          ctx.beginPath();
          ctx.moveTo(-W * 0.3, y);
          ctx.lineTo(W * 1.3, y);
          ctx.stroke();
        }
      }
      break;
    }
    case 'home': {
      if (layer === 'sky') {
        ctx.fillStyle = lit('#f1e3c8', w.time === 'night' ? 'sunset' : 'day');
        ctx.fillRect(-W * 0.3, -H * 0.2, W * 1.6, H * 1.4);
        // carved wooden band
        ctx.fillStyle = lit('#9a6a44', 'day');
        ctx.fillRect(-W * 0.3, gY - H * 0.3, W * 1.6, H * 0.012);
      }
      if (layer === 'far') {
        const ww = W * (W > H ? 0.16 : 0.26);
        const wh = H * (W > H ? 0.3 : 0.17);
        // arched window
        const ax = W * 0.68;
        const ay = gY - H * 0.36 - wh;
        const arch = new Path2D();
        arch.moveTo(ax, ay + wh);
        arch.lineTo(ax, ay + ww / 2);
        arch.arc(ax + ww / 2, ay + ww / 2, ww / 2, Math.PI, 0);
        arch.lineTo(ax + ww, ay + wh);
        arch.closePath();
        ctx.save();
        ctx.clip(arch);
        drawSky(ctx, w, { x: ax, y: ay, w: ww, h: wh }, 5);
        ctx.restore();
        ctx.strokeStyle = lit('#7a4f35', 'day');
        ctx.lineWidth = m * 0.014;
        ctx.stroke(arch);
        // framed picture of a fort
        const fx = W * 0.14;
        const fy = gY - H * 0.48;
        cel(ctx, `M${fx},${fy} h${W * 0.22} v${H * 0.1} h${-W * 0.22} Z`, '#f3ead6', 4);
        fill(ctx, `M${fx + W * 0.03},${fy + H * 0.085} l0,${-H * 0.05} l${W * 0.05},0 l0,${H * 0.05} Z M${fx + W * 0.1},${fy + H * 0.085} l${W * 0.03},${-H * 0.06} l${W * 0.04},${H * 0.06} Z`, '#b98a5e');
        // lantern
        const lx = W * 0.5;
        stroke(ctx, `M${lx},${gY - H * 0.62} L${lx},${gY - H * 0.52}`, '#7a4f35', m * 0.004);
        cel(ctx, `M${lx - m * 0.03},${gY - H * 0.52} L${lx + m * 0.03},${gY - H * 0.52} L${lx + m * 0.02},${gY - H * 0.46} L${lx - m * 0.02},${gY - H * 0.46} Z`, night ? PRACTICAL : '#e0b04a', 3);
      }
      if (layer === 'mid') {
        // majlis cushions along the wall
        const cy = gY - H * 0.012;
        const red = lit('#9e1c2c', w.time === 'night' ? 'sunset' : 'day');
        cel(ctx, `M${-W * 0.3},${cy} L${-W * 0.3},${cy - H * 0.09} L${W * 1.3},${cy - H * 0.09} L${W * 1.3},${cy} Z`, red, 3);
        ctx.fillStyle = '#e0b04a';
        for (let x = -W * 0.2; x < W * 1.2; x += W * 0.06) {
          ctx.beginPath();
          ctx.moveTo(x, cy - H * 0.045);
          ctx.lineTo(x + W * 0.015, cy - H * 0.06);
          ctx.lineTo(x + W * 0.03, cy - H * 0.045);
          ctx.lineTo(x + W * 0.015, cy - H * 0.03);
          ctx.closePath();
          ctx.fill();
        }
        // dallah on a tray
        ctx.save();
        ctx.translate(W * 0.86, gY - H * 0.005);
        const s = m * 0.0016;
        ctx.scale(s, s);
        cel(ctx, 'M-60,0 L60,0 L50,-10 L-50,-10 Z', '#c9a227', 3);
        cel(ctx, 'M-20,-10 C-30,-40 -26,-70 -10,-80 L-6,-110 L6,-110 L10,-80 C26,-70 30,-40 20,-10 Z', '#d9c27a', 3);
        cel(ctx, 'M18,-60 C40,-70 54,-90 60,-104 L64,-100 C58,-80 44,-60 22,-46 Z', '#d9c27a', 2);
        cel(ctx, 'M28,-10 L32,-26 L48,-26 L52,-10 Z', '#fbf8f1', 2);
        ctx.restore();
      }
      if (layer === 'ground') {
        groundBand(ctx, w, '#7a2230');
        ctx.strokeStyle = '#e0b04a';
        ctx.lineWidth = m * 0.004;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(W * 0.08, gY + H * 0.03, W * 0.84, (H - gY) * 0.8);
        ctx.strokeRect(W * 0.12, gY + H * 0.05, W * 0.76, (H - gY) * 0.6);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'space': {
      if (layer === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#03040b');
        g.addColorStop(1, '#1a1440');
        ctx.fillStyle = g;
        ctx.fillRect(-W * 0.3, -H * 0.2, W * 1.6, H * 1.4);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#6a3fb5';
        ctx.beginPath();
        ctx.ellipse(W * 0.3, H * 0.35, W * 0.5, H * 0.12, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        stars(ctx, w, -W * 0.3, -H * 0.2, W * 1.3, gY, Math.round((W * H) / 9000), 17);
      }
      if (layer === 'far') {
        const s = m;
        // earth
        ctx.fillStyle = '#2e7fd1';
        ctx.beginPath();
        ctx.arc(W * 0.24, H * 0.24, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.ellipse(W * 0.22, H * 0.22, s * 0.05, s * 0.035, 0.5, 0, Math.PI * 2);
        ctx.ellipse(W * 0.28, H * 0.27, s * 0.03, s * 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
        shade(ctx, `M${W * 0.24},${H * 0.24 - s * 0.12} A${s * 0.12},${s * 0.12} 0 0 1 ${W * 0.24},${H * 0.24 + s * 0.12} A${s * 0.08},${s * 0.12} 0 0 0 ${W * 0.24},${H * 0.24 - s * 0.12} Z`, undefined, 0.35);
        // ringed planet
        ctx.save();
        ctx.translate(W * 0.78, H * 0.4);
        ctx.fillStyle = '#e0a458';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f3ead6';
        ctx.lineWidth = s * 0.01;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.13, s * 0.03, -0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (layer === 'ground') {
        ctx.fillStyle = '#9a98a6';
        ctx.beginPath();
        ctx.moveTo(-W * 0.3, gY + H * 0.02);
        ctx.quadraticCurveTo(W * 0.5, gY - H * 0.04, W * 1.3, gY + H * 0.02);
        ctx.lineTo(W * 1.3, H * 1.3);
        ctx.lineTo(-W * 0.3, H * 1.3);
        ctx.closePath();
        ctx.fill();
        const r = mulberry(3);
        for (let i = 0; i < 9; i++) {
          const x = r() * W;
          const y = gY + (0.15 + r() * 0.7) * (H - gY);
          ctx.fillStyle = '#7d7b8a';
          ctx.beginPath();
          ctx.ellipse(x, y, m * (0.03 + r() * 0.04), m * 0.012, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
  }
}

export { P, lighten, darken };
