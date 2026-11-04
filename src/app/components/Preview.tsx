import { useEffect, useRef } from 'react';
import { ASPECTS, FPS, type Project } from '../../domain/types';
import { fmtTime, totalFrames } from '../../domain/timeline';
import { renderFrameSafe } from '../../engine/renderer/renderFrame';
import type { LipSyncTracks } from '../../engine/audio/lipsync';
import { downloadBlob, safeName } from '../../storage/projectFile';
import { downloadFrameLayers } from './LayerExports';

interface Props {
  project: Project;
  frame: number;
  playing: boolean;
  preparing: boolean;
  ready: boolean;
  renderKey: number;
  lipSync?: LipSyncTracks;
  onFrame: (f: number) => void;
  onTogglePlay: () => void;
}

export function Preview({ project, frame, playing, preparing, ready, renderKey, lipSync, onFrame, onTogglePlay }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = ASPECTS[project.aspect].sd;
  const total = totalFrames(project);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !ready) return;
    renderFrameSafe(project, Math.min(frame, total - 1), ctx, size, { lipSync });
  }, [project, frame, ready, renderKey, size, total, lipSync]);

  const saveFrame = () => {
    if (!ready) return;
    const hd = ASPECTS[project.aspect].hd;
    const image = document.createElement('canvas');
    image.width = hd.width;
    image.height = hd.height;
    const ctx = image.getContext('2d');
    if (!ctx) return;
    renderFrameSafe(project, Math.min(frame, total - 1), ctx, hd, { lipSync });
    image.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${safeName(project.title)}-frame-${String(frame + 1).padStart(4, '0')}.png`);
    }, 'image/png');
  };

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
        <button type="button" onClick={saveFrame} disabled={!ready} title="تنزيل الإطار الحالي كصورة PNG" aria-label="حفظ الإطار صورة PNG">📷 صورة</button>
        <button type="button" onClick={() => void downloadFrameLayers(project, Math.min(frame, total - 1), lipSync)} disabled={!ready} title="تنزيل الإطار الحالي طبقات PNG شفافة منفصلة (خلفية، شخصيات، مؤثرات، نصوص)" aria-label="حفظ طبقات الإطار">🗂 طبقات</button>
        <span className="time" dir="ltr">
          {fmtTime(frame / FPS)} / {fmtTime(total / FPS)}
        </span>
      </div>
    </section>
  );
}
