import { useEffect, useRef, useState } from 'react';
import type { Ctx } from '../engine/art/paint';

export interface Variant<O> {
  label: string;
  opts: O;
}

interface Props<O> {
  /** Frames in one loop at 24 fps. */
  frames: number;
  variants: Variant<O>[];
  draw: (ctx: Ctx, W: number, H: number, frame: number, opts: O) => void;
  /** Canvas size per variant. */
  size?: { w: number; h: number };
  /** Frame indexes where a new drawing starts, per variant, for the drawing strip. */
  drawingsOf?: (opts: O) => number[];
}

/** A looping demo with play, step-by-frame, slow motion and side-by-side variants. */
export function Demo<O>({ frames, variants, draw, size = { w: 360, h: 360 }, drawingsOf }: Props<O>) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const start = useRef({ t: 0, f: 0 });

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    start.current = { t: performance.now(), f: frame };
    const tick = (now: number) => {
      const fps = slow ? 6 : 24;
      const f = (start.current.f + Math.floor(((now - start.current.t) / 1000) * fps)) % frames;
      setFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, slow, frames]);

  useEffect(() => {
    variants.forEach((v, i) => {
      const c = refs.current[i];
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      draw(ctx, c.width, c.height, frame, v.opts);
    });
  }, [frame, variants, draw]);

  const step = (d: number) => {
    setPlaying(false);
    setFrame((f) => (f + d + frames) % frames);
  };

  return (
    <div className="demo">
      <div className="demo-stages">
        {variants.map((v, i) => {
          const marks = drawingsOf?.(v.opts) ?? [];
          const current = marks.filter((m) => m <= frame).length;
          return (
            <figure key={v.label} className="demo-stage">
              <canvas ref={(el) => (refs.current[i] = el)} width={size.w} height={size.h} />
              <figcaption>
                <b>{v.label}</b>
                {marks.length > 0 && (
                  <span className="muted small">
                    {' '}
                    · الرسمة <span dir="ltr">{current}/{marks.length}</span>
                  </span>
                )}
              </figcaption>
              {marks.length > 0 && (
                <div className="strip" aria-hidden="true">
                  {Array.from({ length: frames }, (_, f) => (
                    <i key={f} className={`${marks.includes(f) ? 'new' : ''} ${f === frame ? 'now' : ''}`} />
                  ))}
                </div>
              )}
            </figure>
          );
        })}
      </div>
      <div className="demo-controls">
        <button type="button" onClick={() => step(-1)} aria-label="الإطار السابق">
          → إطار
        </button>
        <button type="button" className="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? '❚❚ إيقاف' : '▶ تشغيل'}
        </button>
        <button type="button" onClick={() => step(1)} aria-label="الإطار التالي">
          إطار ←
        </button>
        <label className="check">
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> حركة بطيئة
        </label>
        <span className="time" dir="ltr">
          {frame + 1} / {frames}
        </span>
      </div>
    </div>
  );
}
