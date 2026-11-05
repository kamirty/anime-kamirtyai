/** Small, deterministic canvas helpers shared by every drawing. */

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const INK = '#070a16';
export const LINE = '#fbf8f1';
export const MOON = '#f3ead6';
export const PRACTICAL = '#ffcf6e';
export const RED = '#d7192a';
export const GREEN = '#0b8a3c';
export const WHITE = '#f6f3ee';

const cache = new Map<string, Path2D>();
/** Path2D objects are cached by their SVG path string. */
export function P(d: string): Path2D {
  let p = cache.get(d);
  if (!p) {
    p = new Path2D(d);
    if (cache.size > 6000) cache.clear();
    cache.set(d, p);
  }
  return p;
}

/** Silhouette mode paints every fill in one colour (used by the impact frame). */
export interface Paint {
  sil: string | null;
  /** Multiplier for outline widths. */
  k: number;
}

export const fill = (ctx: Ctx, d: string, color: string, paint?: Paint, alpha = 1): void => {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = paint?.sil ?? color;
  ctx.fill(P(d));
  ctx.globalAlpha = 1;
};

export const stroke = (ctx: Ctx, d: string, color: string, width: number, paint?: Paint, alpha = 1): void => {
  if (paint?.sil && color !== paint.sil) {
    // outlines vanish inside a silhouette
    return;
  }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = paint?.sil ?? color;
  ctx.lineWidth = width * (paint?.k ?? 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(P(d));
  ctx.globalAlpha = 1;
};

const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Mix two hex colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
export const darken = (c: string, t: number) => mix(c, '#000000', t);

/**
 * The drawing style for characters. Flat means no ink outline around a body, a garment or a
 * hand: shapes are told apart by their own colour and by their shading, the way the approved
 * reference artwork does it. Faces keep their features — eyes, brows, nose, mouth.
 */
export const style = { flat: true };

/** The colour an edge takes: ink in the cel style, a whisper of the fill itself when flat. */
export const edgeColor = (color: string, depth = 0.13) => (style.flat ? darken(color, depth) : INK);
/** How thick that edge is: thinner when it is only there to keep shapes apart. */
export const edgeWidth = (width: number) => (style.flat ? width * 0.55 : width);

/**
 * Fill, then the edge. In the cel style that edge is a black outline; in the flat style it is
 * the same colour as the fill, only a shade deeper, so shapes stay apart without a drawn border.
 */
export const cel = (ctx: Ctx, d: string, color: string, width: number, paint?: Paint): void => {
  fill(ctx, d, color, paint);
  if (!paint?.sil) stroke(ctx, d, edgeColor(color), edgeWidth(width), paint);
};

/** An edge on its own, for a shape that was filled some other way. */
export const edge = (ctx: Ctx, d: string, width: number, paint?: Paint, color = INK): void => {
  if (!paint?.sil) stroke(ctx, d, edgeColor(color), edgeWidth(width), paint);
};

/** Fill plus a deeper edge: for small objects that must stay legible against any cloth. */
export const solid = (ctx: Ctx, d: string, color: string, width: number, paint?: Paint): void => {
  fill(ctx, d, color, paint);
  if (!paint?.sil) stroke(ctx, d, style.flat ? darken(color, 0.3) : INK, width, paint);
};

/** Hard-edged shadow shape: ink at 20 %. */
export const shade = (ctx: Ctx, d: string, paint?: Paint, alpha = 0.2): void => {
  if (paint?.sil) return;
  fill(ctx, d, INK, undefined, alpha);
};

export function mulberry(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable hash of a string into a seed. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Relative luminance, used to pick readable outline colours. */
export function luma(c: string): number {
  const [r, g, b] = hexToRgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Anime timing: snap a time to drawings held for `hold` frames (twos by default). */
export const onTwos = (t: number, hold = 2, fps = 24) => Math.floor((t * fps) / hold) * (hold / fps);

export const f1 = (n: number) => n.toFixed(1);
