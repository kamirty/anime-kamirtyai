import { useEffect, useRef } from 'react';
import { ASPECTS, FPS, type Project } from '../../domain/types';
import { fmtTime, totalFrames } from '../../domain/timeline';
import { renderFrameSafe } from '../../engine/renderer/renderFrame';

interface Props {
  project: Project;
  frame: number;
  playing: boolean;
  preparing: boolean;
  ready: boolean;
  renderKey: number;
  onFrame: (f: number) => void;
  onTogglePlay: () => void;
}

export function Preview({ project, frame, playing, preparing, ready, renderKey, onFrame, onTogglePlay }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = ASPECTS[project.aspect].sd;
  const total = totalFrames(project);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !ready) return;
    renderFrameSafe(project, Math.min(frame, total - 1), ctx, size);
  }, [project, frame, ready, renderKey, size, total]);

  return (
    <section className={`preview is-${project.aspect}`}>
      <div className="stage">
        <canvas ref={ref} width={size.width} height={size.height} aria-label="معاينة المشهد" onClick={onTogglePlay} />
        {!ready && <div className="stage-loading">جارٍ تحميل الخطوط…</div>}
        {ready && preparing && <div className="stage-loading">جارٍ تجهيز الصوت…</div>}
      </div>
      <div className="controls">
        <button type="button" className="play" onClick={onTogglePlay} disabled={!ready} aria-label={playing ? 'إيقاف' : 'تشغيل'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <input type="range" min={0} max={Math.max(0, total - 1)} value={Math.min(frame, total - 1)} onChange={(e) => onFrame(Number(e.target.value))} aria-label="موضع المعاينة" />
        <span className="time" dir="ltr">
          {fmtTime(frame / FPS)} / {fmtTime(total / FPS)}
        </span>
      </div>
    </section>
  );
}
