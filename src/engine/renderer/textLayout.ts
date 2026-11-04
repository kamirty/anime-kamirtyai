import type { Ctx } from '../art/paint';

/**
 * Greedy word wrap with real glyph measurements. Words stay in logical order; the canvas bidi
 * algorithm (ctx.direction = 'rtl') handles visual order and shaping. Arabic is never reversed by hand.
 */
export function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

export interface Fitted {
  lines: string[];
  size: number;
  lineHeight: number;
  width: number;
  height: number;
}

const cache = new Map<string, Fitted>();

/** Shrinks from maxSize until the text fits maxLines × maxWidth; at minSize extra lines are kept, never dropped. */
export function fitText(ctx: Ctx, family: string, weight: number, text: string, maxWidth: number, maxLines: number, maxSize: number, minSize: number, lh = 1.45): Fitted {
  const key = `${family}|${weight}|${text}|${maxWidth}|${maxLines}|${maxSize}|${minSize}|${lh}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let size = maxSize;
  let lines: string[] = [];
  for (;;) {
    ctx.font = `${weight} ${Math.round(size)}px ${family}`;
    lines = wrapText(ctx, text, maxWidth);
    const widest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
    if ((lines.length <= maxLines && widest <= maxWidth) || size <= minSize) break;
    size = Math.max(minSize, size - 2);
  }
  ctx.font = `${weight} ${Math.round(size)}px ${family}`;
  const width = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
  const f: Fitted = { lines, size, lineHeight: size * lh, width, height: lines.length * size * lh };
  if (cache.size > 3000) cache.clear();
  cache.set(key, f);
  return f;
}

export const clearTextCache = () => cache.clear();
