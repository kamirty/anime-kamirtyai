/**
 * The drawing kit for the promo film: slams, whip smears, strikes, masks, counters and frames.
 * Black and white, geometric, right to left — the Kamirty look. Everything is a pure function
 * of time, so any frame can be drawn on its own and the render is repeatable.
 */

export type Ctx = CanvasRenderingContext2D;

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const INK = '#000000';
export const PAPER = '#ffffff';

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 → 1 across [a, b] seconds. */
export const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Overshoots, then settles: the slam. */
export const back = (t: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export function bg(ctx: Ctx, color = INK) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

export function setFont(ctx: Ctx, size: number, family = 'Cairo', weight = 700) {
  ctx.font = `${weight} ${size}px "${family}", "Cairo", sans-serif`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

/** Largest size that keeps the line inside `maxW`. */
export function fitSize(ctx: Ctx, text: string, maxW: number, start: number, family = 'Cairo', weight = 700): number {
  let s = start;
  for (let i = 0; i < 40; i++) {
    setFont(ctx, s, family, weight);
    if (ctx.measureText(text).width <= maxW) break;
    s -= Math.max(2, s * 0.04);
  }
  return s;
}

export interface SlamOpts {
  y: number;
  size?: number;
  family?: string;
  weight?: number;
  color?: string;
  /** 0 → 1 through the slam. */
  k: number;
  /** Trailing smear, in pixels, at k = 0. */
  smear?: number;
  maxW?: number;
  /** Fade the whole word out near the end of its life. */
  out?: number;
}

/** A word that slams in from a touch too big, with a motion smear behind it. */
export function slam(ctx: Ctx, text: string, o: SlamOpts) {
  const k = clamp(o.k);
  const e = back(easeOut(k));
  const scale = lerp(1.55, 1, clamp(e));
  const alpha = clamp(k * 3.2) * (1 - clamp(o.out ?? 0));
  const size = fitSize(ctx, text, o.maxW ?? W * 0.88, o.size ?? 150, o.family, o.weight);
  const smear = (o.smear ?? 70) * Math.pow(1 - k, 2.2);
  ctx.save();
  ctx.translate(W / 2, o.y);
  ctx.scale(scale, scale);
  setFont(ctx, size, o.family, o.weight);
  ctx.fillStyle = o.color ?? PAPER;
  if (smear > 1) {
    for (let i = 6; i >= 1; i--) {
      ctx.globalAlpha = alpha * 0.1 * (1 - i / 7);
      ctx.fillText(text, (smear * i) / 6, 0);
      ctx.fillText(text, (-smear * i) / 6, 0);
    }
  }
  ctx.globalAlpha = alpha;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A word that whips past: enters fast from the right, leaves to the left (reading direction). */
export function whip(ctx: Ctx, text: string, y: number, k: number, size = 130, color = PAPER) {
  const e = easeInOut(clamp(k));
  const x = lerp(W * 0.9, -W * 0.9, e);
  const speed = Math.abs(Math.cos(Math.PI * clamp(k))) * 0 + (1 - Math.abs(2 * clamp(k) - 1)) * 120;
  ctx.save();
  ctx.translate(W / 2 + x, y);
  setFont(ctx, fitSize(ctx, text, W * 0.9, size));
  ctx.fillStyle = color;
  for (let i = 5; i >= 1; i--) {
    ctx.globalAlpha = 0.12;
    ctx.fillText(text, (speed * i) / 4, 0);
  }
  ctx.globalAlpha = 1;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Reveals a line behind a wipe that travels from the right, the way Arabic is read. */
export function wipeIn(ctx: Ctx, text: string, y: number, k: number, size = 110, color = PAPER, family = 'Cairo') {
  const e = easeOut(clamp(k));
  const s = fitSize(ctx, text, W * 0.86, size, family);
  setFont(ctx, s, family);
  const w = ctx.measureText(text).width;
  ctx.save();
  ctx.beginPath();
  ctx.rect(W / 2 + w / 2 - w * e - 8, y - s, w * e + 16, s * 2);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y);
  ctx.restore();
}

/** A hard rule struck through a word. */
export function strike(ctx: Ctx, text: string, y: number, k: number, size: number) {
  setFont(ctx, size);
  const w = ctx.measureText(text).width * 0.58;
  const e = easeOut(clamp(k));
  ctx.save();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 12;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(W / 2 + w, y + 6);
  ctx.lineTo(W / 2 + w - 2 * w * e, y + 6);
  ctx.stroke();
  ctx.restore();
}

/** A small outlined tag, the way the reference films label each idea. */
export function tag(ctx: Ctx, text: string, x: number, y: number, k: number, size = 40, invert = false) {
  const e = easeOut(clamp(k));
  if (e <= 0) return;
  setFont(ctx, size);
  const w = ctx.measureText(text).width + size * 1.1;
  const h = size * 1.9;
  ctx.save();
  ctx.globalAlpha = clamp(k * 4);
  ctx.translate(x, y);
  ctx.scale(1, lerp(0.2, 1, e));
  ctx.fillStyle = invert ? PAPER : INK;
  ctx.strokeStyle = PAPER;
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
export function brackets(ctx: Ctx, x: number, y: number, w: number, h: number, k: number, len = 70, lw = 7) {
  const e = easeOut(clamp(k));
  ctx.save();
  ctx.strokeStyle = PAPER;
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

/** A full-frame flash; `k` 0 → 1 fades it away. */
export function flash(ctx: Ctx, k: number, color = PAPER) {
  const a = 1 - clamp(k);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Shakes everything drawn after it; seeded so the render repeats exactly. */
export function shake(ctx: Ctx, amount: number, seed: number) {
  if (amount <= 0) return;
  const r = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  ctx.translate(r(1) * amount, r(2) * amount);
}

/** Arabic-Indic digits, the way a Gulf audience reads numbers. */
export const arabicNum = (n: number) => String(Math.round(n)).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

/** A horizontal progress bar with its percentage. */
export function progress(ctx: Ctx, y: number, k: number, label: string) {
  const w = W * 0.7;
  const x = (W - w) / 2;
  ctx.save();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, 46);
  ctx.fillStyle = PAPER;
  ctx.fillRect(x + 6, y + 6, (w - 12) * clamp(k), 34);
  setFont(ctx, 40);
  ctx.fillText(`${label} ${arabicNum(clamp(k) * 100)}٪`, W / 2, y - 52);
  ctx.restore();
}

/** The Kamirty mark: a camera body whose lens holds an AI chip. Geometric, one colour. */
export function logo(ctx: Ctx, cx: number, cy: number, s: number, k: number, color = PAPER) {
  const e = easeOut(clamp(k));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s * e, s * e);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  // body
  ctx.beginPath();
  ctx.moveTo(-150, -60);
  ctx.lineTo(-96, -60);
  ctx.lineTo(-74, -96);
  ctx.lineTo(74, -96);
  ctx.lineTo(96, -60);
  ctx.lineTo(150, -60);
  ctx.lineTo(150, 96);
  ctx.lineTo(-150, 96);
  ctx.closePath();
  ctx.stroke();
  // lens
  ctx.beginPath();
  ctx.arc(0, 14, 66, 0, Math.PI * 2);
  ctx.stroke();
  // the chip inside the lens
  ctx.beginPath();
  ctx.rect(-28, -14, 56, 56);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    for (const [a, b, c, d] of [
      [i * 18, -14, i * 18, -32],
      [i * 18, 42, i * 18, 60],
      [-28, 14 + i * 18, -46, 14 + i * 18],
      [28, 14 + i * 18, 46, 14 + i * 18],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Draws an offscreen canvas into a rectangle, cropped to fill, with optional rounded corners. */
export function cover(ctx: Ctx, src: HTMLCanvasElement, x: number, y: number, w: number, h: number, radius = 0) {
  const sr = src.width / src.height;
  const dr = w / h;
  let sw = src.width;
  let sh = src.height;
  if (sr > dr) sw = src.height * dr;
  else sh = src.width / dr;
  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }
  ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

/** Thin scanlines over the picture: the only texture in the film. */
export function scanlines(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 0.1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = INK;
  for (let i = 0; i < h; i += 6) ctx.fillRect(x, y + i, w, 2);
  ctx.restore();
}
