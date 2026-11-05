/**
 * The drawing kit for the promo film.
 *
 * The grammar is taken from the reference reels: a word every few frames, each one arriving as
 * two or three frames of violent smear and then stopping dead; words stacking into a line and
 * the whole block ripped away; the frame inverting; a slash through what you no longer need.
 * Nothing is ever perfectly still. Black and white, geometric — the Kamirty look.
 *
 * Everything is a pure function of time, so any frame can be drawn on its own.
 */

export type Ctx = CanvasRenderingContext2D;

export const W = 1080;
export const H = 1920;
export const FPS = 30;
/** One frame, in seconds: the unit this film is cut in. */
export const F = 1 / FPS;

export const INK = '#000000';
export const PAPER = '#ffffff';

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Snaps home with a small overshoot. */
export const back = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

/** Deterministic noise, so every render is identical. */
export function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
export const rnd2 = (seed: number) => rnd(seed) * 2 - 1;

export function bg(ctx: Ctx, color = INK) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

const sizeCache = new Map<string, number>();

export function setFont(ctx: Ctx, size: number, family = 'Cairo', weight = 700) {
  ctx.font = `${weight} ${size}px "${family}", "Cairo", sans-serif`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

/** Biggest size that keeps the line inside `maxW`; cached, because it is measured every frame. */
export function fit(ctx: Ctx, text: string, maxW: number, start: number, family = 'Cairo', weight = 700): number {
  const key = `${text}|${maxW}|${start}|${family}|${weight}`;
  const hit = sizeCache.get(key);
  if (hit !== undefined) {
    setFont(ctx, hit, family, weight);
    return hit;
  }
  let s = start;
  for (let i = 0; i < 60; i++) {
    setFont(ctx, s, family, weight);
    if (ctx.measureText(text).width <= maxW) break;
    s -= Math.max(1.5, s * 0.035);
  }
  sizeCache.set(key, s);
  return s;
}

/**
 * How a word is set. The reels change typeface and treatment every few words, so the eye never
 * settles: a heavy display face for the shout, a geometric kufi for the name, an outline for the
 * aside, a solid slab for the word that matters.
 */
export type WordLook = 'fill' | 'slab' | 'outline' | 'extrude';

export interface WordStyle {
  size?: number;
  family?: string;
  maxW?: number;
  /** Shorthand for the solid slab. */
  em?: boolean;
  look?: WordLook;
  /** Centred, or pinned to the right or left edge. */
  align?: 'c' | 'r' | 'l';
  color?: string;
  on?: string;
}

const EDGE = 64;

/**
 * One word of a line. `age` is seconds since it landed; `out` 0 → 1 rips it away.
 * The first two frames are a smear travelling in from the side, then it stops dead.
 */
export function word(ctx: Ctx, text: string, x: number, y: number, age: number, out: number, st: WordStyle = {}) {
  const IN = 4 * F;
  const k = clamp(age / IN);
  const e = easeOut(k);
  const fg = st.color ?? PAPER;
  const bgc = st.on ?? INK;
  const look: WordLook = st.look ?? (st.em ? 'slab' : 'fill');
  const align = st.align ?? 'c';
  const box = st.maxW ?? (look === 'slab' ? W * 0.74 : W * 0.88);
  const size = fit(ctx, text, box, st.size ?? 160, st.family);
  setFont(ctx, size, st.family);
  const tw = ctx.measureText(text).width;
  const anchor = align === 'r' ? W - EDGE : align === 'l' ? EDGE : x;
  const from = align === 'l' ? -1 : 1;
  const breathe = 1 + 0.014 * Math.sin(age * 7 + y * 0.01);
  const scale = lerp(1.32, breathe, e);
  const dx = from * lerp(W * 0.5, 0, e) + rnd2(Math.floor(age * 60) + y) * (1 - e) * 26;
  const o = clamp(out);
  const rip = o > 0 ? easeIn(o) : 0;
  // where the ink sits relative to the anchor
  const left = align === 'r' ? -tw : align === 'l' ? 0 : -tw / 2;
  const pad = size * 0.22;

  ctx.save();
  ctx.translate(anchor + dx - from * rip * W * 0.8, y + rnd2(Math.floor(age * 30)) * 2 * (1 - e));
  ctx.scale(scale, scale * (1 - rip * 0.25));
  ctx.globalAlpha = 1 - rip;
  setFont(ctx, size, st.family);
  ctx.textAlign = align === 'r' ? 'right' : align === 'l' ? 'left' : 'center';
  const at = align === 'r' ? 0 : align === 'l' ? 0 : 0;

  const paint = (ox: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    if (look === 'slab') {
      ctx.fillStyle = fg;
      ctx.fillRect(left - pad + ox, -size * 0.68, tw + pad * 2, size * 1.36);
    } else if (look === 'outline') {
      ctx.strokeStyle = fg;
      ctx.lineWidth = Math.max(3, size * 0.045);
      ctx.lineJoin = 'round';
      ctx.strokeText(text, at + ox, 0);
    } else {
      ctx.fillStyle = fg;
      ctx.fillText(text, at + ox, 0);
    }
  };

  // the smear: the word repeated along its travel, fading out behind it
  const trail = (1 - e) * 190 + rip * 280;
  if (trail > 2) for (let i = 1; i <= 7; i++) paint((-from * trail * i) / 7, (1 - rip) * 0.15);

  if (look === 'extrude') {
    // a block of depth behind the face of the letters
    ctx.fillStyle = '#6e6e6e';
    for (let i = 10; i >= 1; i--) {
      ctx.globalAlpha = (1 - rip) * 0.9;
      ctx.fillText(text, at + i * size * 0.016, i * size * 0.016);
    }
  }
  ctx.globalAlpha = 1 - rip;
  if (look === 'slab') {
    ctx.fillStyle = fg;
    ctx.fillRect(left - pad, -size * 0.68, tw + pad * 2, size * 1.36);
    ctx.fillStyle = bgc;
    setFont(ctx, size, st.family);
    ctx.textAlign = align === 'r' ? 'right' : align === 'l' ? 'left' : 'center';
    ctx.fillText(text, at, size * 0.04);
  } else paint(0, 1 - rip);
  ctx.restore();
}

export interface Line {
  /** Seconds, absolute. */
  t: number;
  text: string;
  y: number;
  size?: number;
  em?: boolean;
  look?: WordLook;
  align?: 'c' | 'r' | 'l';
  family?: string;
  maxW?: number;
}

/** Draws a stack of words that land one after another and are ripped away together. */
export function block(ctx: Ctx, t: number, lines: Line[], clearAt: number, color = PAPER, on = INK) {
  const out = span(t, clearAt, clearAt + 5 * F);
  if (out >= 1) return;
  for (const l of lines) {
    if (t < l.t) continue;
    word(ctx, l.text, W / 2, l.y, t - l.t, out, { size: l.size, em: l.em, look: l.look, align: l.align, family: l.family, maxW: l.maxW, color, on });
  }
}

/**
 * A hard flash that starts at `at` and fades over `frames`. Nothing before, nothing after:
 * the flash must never bleed over a shot it does not belong to.
 */
export function pop(ctx: Ctx, t: number, at: number, frames = 2, color = PAPER) {
  if (t < at || t > at + frames * F) return;
  flash(ctx, (t - at) / (frames * F), color);
}

/** A hard flash over the whole frame; `k` 0 → 1 fades it out. */
export function flash(ctx: Ctx, k: number, color = PAPER) {
  const a = 1 - clamp(k);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Shakes everything drawn after it. */
export function shake(ctx: Ctx, amount: number, seed: number) {
  if (amount <= 0) return;
  ctx.translate(rnd2(seed) * amount, rnd2(seed + 9.1) * amount);
}

/** Slices the frame horizontally and shoves the slices sideways: the glitch on a cut. */
export function glitch(ctx: Ctx, src: HTMLCanvasElement, k: number, seed: number) {
  const a = 1 - clamp(k);
  if (a <= 0) return;
  const rows = 14;
  for (let i = 0; i < rows; i++) {
    const y = (H / rows) * i;
    const off = rnd2(seed + i * 3.3) * 160 * a;
    ctx.drawImage(src, 0, y, W, H / rows, off, y, W, H / rows);
  }
}

/** A tall X struck over the frame, drawn on in `k`. */
export function slashX(ctx: Ctx, cx: number, cy: number, r: number, k: number, color = PAPER, lw = 22) {
  const a = clamp(k * 2);
  const b = clamp(k * 2 - 1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'square';
  if (a > 0) {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r);
    ctx.lineTo(cx - r + 2 * r * easeOut(a), cy - r + 2 * r * easeOut(a));
    ctx.stroke();
  }
  if (b > 0) {
    ctx.beginPath();
    ctx.moveTo(cx + r, cy - r);
    ctx.lineTo(cx + r - 2 * r * easeOut(b), cy - r + 2 * r * easeOut(b));
    ctx.stroke();
  }
  ctx.restore();
}

/** A rule drawn through a word. */
export function strike(ctx: Ctx, halfWidth: number, y: number, k: number, color = PAPER) {
  const e = easeOut(clamp(k));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(W / 2 + halfWidth, y);
  ctx.lineTo(W / 2 + halfWidth - 2 * halfWidth * e, y);
  ctx.stroke();
  ctx.restore();
}

/** A small outlined label that snaps in. */
export function tag(ctx: Ctx, text: string, x: number, y: number, k: number, size = 40, invert = false) {
  const e = easeOut(clamp(k / (3 * F)));
  if (e <= 0) return;
  setFont(ctx, size);
  const w = ctx.measureText(text).width + size * 1.1;
  const h = size * 1.9;
  ctx.save();
  ctx.translate(x + (1 - e) * 90, y);
  ctx.scale(1, e);
  ctx.fillStyle = invert ? PAPER : INK;
  ctx.strokeStyle = invert ? INK : PAPER;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = invert ? INK : PAPER;
  setFont(ctx, size);
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

/** Corner brackets: a viewfinder around the picture. */
export function brackets(ctx: Ctx, x: number, y: number, w: number, h: number, k: number, len = 70, lw = 7, color = PAPER) {
  const e = easeOut(clamp(k));
  if (e <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'square';
  const L = len * e;
  for (const [cx, cy, sx, sy] of [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * L, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * L);
    ctx.stroke();
  }
  ctx.restore();
}

export const arabicNum = (n: number) => String(Math.round(n)).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export function progress(ctx: Ctx, y: number, k: number, label: string) {
  const w = W * 0.72;
  const x = (W - w) / 2;
  ctx.save();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, 54);
  ctx.fillStyle = PAPER;
  ctx.fillRect(x + 7, y + 7, (w - 14) * clamp(k), 40);
  setFont(ctx, 44);
  ctx.fillText(`${label} ${arabicNum(clamp(k) * 100)}٪`, W / 2, y - 58);
  ctx.restore();
}

/**
 * The Kamirty mark: a camera whose lens holds an AI chip — the chip drawn in full, with its
 * pins on all four sides and the traces inside, and the wordmark under it.
 */
export function logo(ctx: Ctx, cx: number, cy: number, s: number, k: number, color = PAPER, wordmark = true) {
  const e = easeOut(clamp(k));
  if (e <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s * lerp(1.4, 1, e), s * lerp(1.4, 1, e));
  ctx.globalAlpha = clamp(k * 3);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // viewfinder bump, then the body
  ctx.beginPath();
  ctx.roundRect(-112, -132, 86, 36, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-160, -100, 320, 226, 22);
  ctx.stroke();
  // shutter button and the lamp
  ctx.beginPath();
  ctx.roundRect(96, -122, 42, 26, 7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-124, -58, 9, 0, Math.PI * 2);
  ctx.fill();

  // the lens
  ctx.beginPath();
  ctx.arc(0, 16, 84, 0, Math.PI * 2);
  ctx.stroke();

  // the chip inside it: body, pins on four sides, traces
  const half = 42;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(-half, 16 - half, half * 2, half * 2, 6);
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    const p = i * 17;
    for (const [x1, y1, x2, y2] of [
      [p, 16 - half, p, 16 - half - 24],
      [p, 16 + half, p, 16 + half + 24],
      [-half, 16 + p, -half - 24, 16 + p],
      [half, 16 + p, half + 24, 16 + p],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-20, -4, 40, 40, 4);
  ctx.stroke();
  for (const [x1, y1, x2, y2] of [
    [-20, 6, -40, 6],
    [20, 26, 40, 26],
    [0, -4, 0, -24],
    [0, 36, 0, 54],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  if (wordmark) {
    ctx.fillStyle = color;
    setFont(ctx, 62, 'Cairo');
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillText('Kamirty.AI', 0, 196);
  }
  ctx.restore();
}

/** Draws a canvas into a rectangle, cropped to fill, with an optional push-in. */
export function cover(ctx: Ctx, src: HTMLCanvasElement, x: number, y: number, w: number, h: number, zoom = 1, radius = 0) {
  const sr = src.width / src.height;
  const dr = w / h;
  let sw = src.width;
  let sh = src.height;
  if (sr > dr) sw = src.height * dr;
  else sh = src.width / dr;
  sw /= zoom;
  sh /= zoom;
  ctx.save();
  ctx.beginPath();
  if (radius > 0) ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

/** Moving grain and scanlines, so no part of the frame is ever truly still. */
export function texture(ctx: Ctx, t: number, alpha = 0.055) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  const n = 90;
  for (let i = 0; i < n; i++) {
    const s = i + Math.floor(t * 12) * 97;
    ctx.fillRect(rnd(s) * W, rnd(s + 0.7) * H, 3, 3);
  }
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = INK;
  const off = (t * 40) % 8;
  for (let y = -8; y < H; y += 8) ctx.fillRect(0, y + off, W, 2);
  ctx.restore();
}

export function vignette(ctx: Ctx, strength = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The sticky caption at the top and the handle at the foot, present in every frame. */
export function chrome(ctx: Ctx, t: number, invert = false) {
  const fg = invert ? INK : PAPER;
  const bgc = invert ? PAPER : INK;
  ctx.save();
  setFont(ctx, 40);
  const top = 'استوديو الأنمي العربي · مجانًا';
  const w = ctx.measureText(top).width + 54;
  ctx.fillStyle = bgc;
  ctx.globalAlpha = 0.65;
  ctx.fillRect(W / 2 - w / 2, 58, w, 72);
  ctx.globalAlpha = 1;
  ctx.fillStyle = fg;
  ctx.fillText(top, W / 2, 96);
  ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 2.4);
  setFont(ctx, 34);
  ctx.direction = 'ltr';
  ctx.fillText('anime.kamirtyai.com', W / 2, H - 70);
  ctx.restore();
}
