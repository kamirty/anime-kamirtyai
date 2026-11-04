import { ASPECTS, FPS, type Project } from '../../domain/types';
import { totalFrames } from '../../domain/timeline';
import { renderFrameSafe } from '../renderer/renderFrame';

/** GIF89a, fixed 3-3-2 RGB palette and a 12-bit GIF LZW compressor. No external service. */
export function encodeIndexedGif(width: number, height: number, frames: Uint8Array[], fps = 8): Blob {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1024 || height > 1024) throw new Error('أبعاد GIF غير صالحة.');
  if (!frames.length || frames.length > 80 || frames.some((p) => p.length !== width * height)) throw new Error('إطارات GIF غير صالحة.');
  const bytes: number[] = [];
  const push = (...xs: number[]) => bytes.push(...xs);
  const word = (n: number) => push(n & 255, (n >>> 8) & 255);
  const ascii = (s: string) => { for (const ch of s) push(ch.charCodeAt(0)); };
  ascii('GIF89a');
  word(width); word(height);
  push(0xf7, 0, 0); // global colour table: 256 RGB entries
  for (let c = 0; c < 256; c++) {
    push(Math.round((c >> 5) * 255 / 7), Math.round(((c >> 2) & 7) * 255 / 7), Math.round((c & 3) * 255 / 3));
  }
  // Loop forever (Netscape extension).
  push(0x21, 0xff, 11); ascii('NETSCAPE2.0'); push(3, 1, 0, 0, 0);

  for (const pixels of frames) {
    push(0x21, 0xf9, 4, 4); word(Math.max(2, Math.round(100 / fps))); push(0, 0);
    push(0x2c); word(0); word(0); word(width); word(height); push(0); // image descriptor
    push(8); // minimum LZW code size
    const compressed: number[] = [];
    let bits = 0;
    let buffer = 0;
    const emit = (code: number, width: number) => {
      buffer |= code << bits;
      bits += width;
      while (bits >= 8) {
        compressed.push(buffer & 255);
        buffer >>>= 8;
        bits -= 8;
      }
    };
    const dictionary = new Map<number, number>();
    let nextCode = 258;
    let codeBits = 9;
    emit(256, codeBits); // clear dictionary
    let prefix = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
      const k = pixels[i];
      const key = (prefix << 8) | k;
      const found = dictionary.get(key);
      if (found !== undefined) {
        prefix = found;
        continue;
      }
      emit(prefix, codeBits);
      if (nextCode < 4096) {
        dictionary.set(key, nextCode++);
        // GIF decoders add a dictionary entry one output code behind the encoder.
        if (nextCode === (1 << codeBits) + 1 && codeBits < 12) codeBits++;
      } else {
        emit(256, codeBits);
        dictionary.clear();
        nextCode = 258;
        codeBits = 9;
      }
      prefix = k;
    }
    emit(prefix, codeBits);
    emit(257, codeBits); // end of image
    if (bits > 0) compressed.push(buffer & 255);
    for (let i = 0; i < compressed.length; i += 255) {
      const part = compressed.slice(i, i + 255);
      push(part.length);
      push(...part);
    }
    push(0); // data terminator
  }
  push(0x3b); // GIF trailer
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

export async function exportShortGif(
  project: Project,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const design = ASPECTS[project.aspect].design;
  const scale = 360 / Math.max(design.width, design.height);
  const width = Math.max(1, Math.round(design.width * scale));
  const height = Math.max(1, Math.round(design.height * scale));
  const fps = 8;
  const count = Math.max(1, Math.min(32, Math.ceil((totalFrames(project) / FPS) * fps)));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('متصفحك لا يدعم الرسم المطلوب.');
  const frames: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) throw new Error('أُلغي تصدير GIF.');
    renderFrameSafe(project, Math.min(totalFrames(project) - 1, Math.round(i * FPS / fps)), ctx, { width, height });
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const indexed = new Uint8Array(width * height);
    for (let p = 0, j = 0; p < indexed.length; p++, j += 4) {
      indexed[p] = (rgba[j] & 0xe0) | ((rgba[j + 1] & 0xe0) >> 3) | (rgba[j + 2] >> 6);
    }
    frames.push(indexed);
    onProgress?.(i + 1, count);
    if (i % 2 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  if (signal?.aborted) throw new Error('أُلغي تصدير GIF.');
  return encodeIndexedGif(width, height, frames, fps);
}
