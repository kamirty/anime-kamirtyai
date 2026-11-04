import { useEffect, useRef, useState } from 'react';
import { ASPECTS, FPS, type Project } from '../../domain/types';
import { fmtTime, totalFrames } from '../../domain/timeline';
import { detectExportPlan, type DetectResult } from '../../engine/export/capabilities';
import type { VerifyReport } from '../../engine/export/verify';
import { downloadBlob, safeName } from '../../storage/projectFile';
import { ExtraExports } from './ExtraExports';

type State =
  | { status: 'idle' }
  | { status: 'running'; frame: number; startedAt: number; now: number }
  | { status: 'verifying' }
  | { status: 'done'; blob: Blob; url: string; filename: string; report: VerifyReport; seconds: number }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

interface Props {
  project: Project;
  getAudio: () => Promise<AudioBuffer | null>;
  onClose: () => void;
}

export function ExportDialog({ project, getAudio, onClose }: Props) {
  const [quality, setQuality] = useState<'sd' | 'hd'>('hd');
  const size = ASPECTS[project.aspect][quality];
  const [cap, setCap] = useState<DetectResult | null>(null);
  const [state, setState] = useState<State>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const frames = totalFrames(project);

  useEffect(() => {
    setCap(null);
    detectExportPlan(size).then(setCap);
  }, [size.width, size.height]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(
    () => () => {
      if (state.status === 'done') URL.revokeObjectURL(state.url);
    },
    [state],
  );

  const start = async () => {
    if (!cap?.supported) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = performance.now();
    setState({ status: 'running', frame: 0, startedAt, now: startedAt });
    try {
      const [{ exportVideo }, { verifyExport }, audio] = await Promise.all([import('../../engine/export/exportVideo'), import('../../engine/export/verify'), getAudio()]);
      const blob = await exportVideo(project, cap.plan, {
        signal: controller.signal,
        audio,
        onProgress: (p) => setState({ status: 'running', frame: p.frame, startedAt, now: performance.now() }),
      });
      const seconds = (performance.now() - startedAt) / 1000;
      setState({ status: 'verifying' });
      const report = await verifyExport(project, blob, size);
      setState({ status: 'done', blob, url: URL.createObjectURL(blob), filename: `${safeName(project.title)}.${cap.plan.extension}`, report, seconds });
    } catch (err) {
      if (controller.signal.aborted) setState({ status: 'cancelled' });
      else setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      abortRef.current = null;
    }
  };

  const running = state.status === 'running' || state.status === 'verifying';
  const pct = state.status === 'running' ? state.frame / frames : 0;
  const eta = state.status === 'running' && state.frame > 24 ? (((state.now - state.startedAt) / state.frame) * (frames - state.frame)) / 1000 : null;

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="export-title" onClick={(e) => e.target === e.currentTarget && !running && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2 id="export-title">تنزيل الفيديو</h2>
          <button type="button" className="ghost" onClick={onClose} disabled={running} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <label className="label">الجودة</label>
        <div className="seg">
          <button type="button" className={quality === 'sd' ? 'active' : ''} onClick={() => setQuality('sd')} disabled={running}>
            عادية <span dir="ltr">{ASPECTS[project.aspect].sd.width}×{ASPECTS[project.aspect].sd.height}</span> (أسرع)
          </button>
          <button type="button" className={quality === 'hd' ? 'active' : ''} onClick={() => setQuality('hd')} disabled={running}>
            عالية <span dir="ltr">{ASPECTS[project.aspect].hd.width}×{ASPECTS[project.aspect].hd.height}</span>
          </button>
        </div>
        <div className="cap">
          {!cap && <p className="muted">جارٍ فحص قدرات متصفحك…</p>}
          {cap && !cap.supported && <div className="alert error">{cap.reason}</div>}
          {cap?.supported && (
            <p>
              الصيغة: <b>{cap.plan.container.toUpperCase()}</b>
              {cap.plan.container === 'webm' && <span className="muted"> (متصفحك لا يدعم MP4؛ ملفات WebM تعمل على يوتيوب وواتساب ومعظم المشغلات)</span>}
              <br />
              {cap.plan.audioCodec ? 'مع الصوت' : 'بدون صوت (متصفحك لا يدعم ترميز الصوت)'}
            </p>
          )}
        </div>
        {state.status !== 'done' && (
          <div className="row">
            <button type="button" className="primary big" onClick={start} disabled={!cap?.supported || running}>
              ابدأ صنع الفيديو (<span dir="ltr">{fmtTime(frames / FPS)}</span>)
            </button>
            {state.status === 'running' && (
              <button type="button" onClick={() => abortRef.current?.abort()}>
                إلغاء
              </button>
            )}
          </div>
        )}
        {state.status === 'running' && (
          <div className="progress">
            <div className="bar">
              <div style={{ width: `${pct * 100}%` }} />
            </div>
            <span dir="rtl">
              {Math.round(pct * 100)}%{eta !== null && ` · متبقٍ نحو ${Math.ceil(eta)} ث`}
            </span>
            <p className="muted small">يُصنع الفيديو داخل جهازك. أبقِ هذه الصفحة مفتوحة حتى ينتهي.</p>
          </div>
        )}
        {state.status === 'verifying' && <p>جارٍ التحقق من الملف الناتج…</p>}
        {state.status === 'cancelled' && <div className="alert">أُلغي التصدير.</div>}
        {state.status === 'error' && <div className="alert error">تعذّر التصدير: {state.message}</div>}
        <ExtraExports project={project} disabled={running} />
        {state.status === 'done' && (
          <div className="result">
            <video src={state.url} controls playsInline />
            <div className={`alert ${state.report.ok ? 'ok' : 'error'}`}>
              {state.report.ok ? `جاهز! ${(state.report.sizeBytes / 1048576).toFixed(1)} ميجابايت.` : 'الملف لم يطابق المواصفات كاملة:'}
              {state.report.problems.length > 0 && (
                <ul>
                  {state.report.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="row">
              <button type="button" className="primary big" onClick={() => downloadBlob(state.blob, state.filename)}>
                ⬇ تنزيل الفيديو
              </button>
              <button type="button" onClick={() => setState({ status: 'idle' })}>
                صنعه مرة أخرى
              </button>
            </div>
            <details>
              <summary>تفاصيل تقنية</summary>
              <pre dir="ltr">{JSON.stringify({ ...state.report, encodeSeconds: +state.seconds.toFixed(1) }, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
