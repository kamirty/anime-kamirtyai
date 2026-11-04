import { useRef, useState } from 'react';
import { ASPECTS, FPS, type Project } from '../../domain/types';
import { totalFrames } from '../../domain/timeline';
import { cameraAt, renderFrameSafe, type LayerSet } from '../../engine/renderer/renderFrame';
import type { LipSyncTracks } from '../../engine/audio/lipsync';
import { detectExportPlan } from '../../engine/export/capabilities';
import { downloadBlob, safeName } from '../../storage/projectFile';
import { makeZip } from '../../storage/zip';

export const GREEN = '#00b140';

const LAYERS: { id: string; label: string; set: LayerSet }[] = [
  { id: '1-background', label: 'الخلفية', set: { bg: true, chars: false, fx: false, text: false } },
  { id: '2-characters', label: 'الشخصيات', set: { bg: false, chars: true, fx: false, text: false, background: 'clear' } },
  { id: '3-effects', label: 'المؤثرات', set: { bg: false, chars: false, fx: true, text: false, background: 'clear' } },
  { id: '4-text', label: 'النصوص', set: { bg: false, chars: false, fx: false, text: true, background: 'clear' } },
];

const canvasPng = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG'))), 'image/png'));

/** The current frame as separate transparent PNG layers plus the full picture, in one ZIP. */
export async function downloadFrameLayers(project: Project, frame: number, lipSync?: LipSyncTracks): Promise<void> {
  const size = ASPECTS[project.aspect].hd;
  const files: { name: string; data: Blob }[] = [];
  for (const l of [...LAYERS, { id: '0-full', label: 'كامل', set: undefined }]) {
    const c = document.createElement('canvas');
    c.width = size.width;
    c.height = size.height;
    const ctx = c.getContext('2d');
    if (!ctx) continue;
    renderFrameSafe(project, frame, ctx, size, { layers: l.set, lipSync });
    files.push({ name: `${l.id}.png`, data: await canvasPng(c) });
  }
  downloadBlob(await makeZip(files), `${safeName(project.title)}-layers-frame-${String(frame + 1).padStart(4, '0')}.zip`);
}

/** Camera data for compositing: scale and position of the character layer per frame. */
function cameraJson(project: Project) {
  const size = ASPECTS[project.aspect].hd;
  const frames = totalFrames(project);
  const data = [];
  for (let f = 0; f < frames; f++) {
    const c = cameraAt(project, f, size);
    data.push({ frame: f, time: +(f / FPS).toFixed(4), scalePercent: +(c.scale * 100).toFixed(3), x: +c.x.toFixed(2), y: +c.y.toFixed(2) });
  }
  return JSON.stringify(
    {
      note: 'Kamirty Anime camera: the character layer is scaled by scalePercent around the frame origin, then moved by (x, y) pixels.',
      fps: FPS,
      width: size.width,
      height: size.height,
      frames: data,
    },
    null,
    2,
  );
}

const VIDEO_LAYERS: { id: string; label: string; set: LayerSet }[] = [
  { id: 'background', label: 'الخلفية وحدها', set: { bg: true, chars: false, fx: false, text: false } },
  { id: 'characters-green', label: 'الشخصيات على خلفية خضراء', set: { bg: false, chars: true, fx: false, text: false, background: GREEN } },
  { id: 'effects-green', label: 'المؤثرات على خلفية خضراء', set: { bg: false, chars: false, fx: true, text: false, background: GREEN } },
  { id: 'text-green', label: 'النصوص على خلفية خضراء', set: { bg: false, chars: false, fx: false, text: true, background: GREEN } },
];

/** Separate layer videos for After Effects or Premiere: key out the green, stack them, done. */
export function LayerExports({ project, lipSync, disabled }: { project: Project; lipSync?: LipSyncTracks; disabled: boolean }) {
  const [layer, setLayer] = useState(VIDEO_LAYERS[1].id);
  const [state, setState] = useState<{ busy: boolean; pct: number; msg: string }>({ busy: false, pct: 0, msg: '' });
  const abort = useRef<AbortController | null>(null);

  const run = async () => {
    const l = VIDEO_LAYERS.find((x) => x.id === layer)!;
    const size = ASPECTS[project.aspect].hd;
    const cap = await detectExportPlan(size);
    if (!cap.supported) return setState({ busy: false, pct: 0, msg: cap.reason });
    const controller = new AbortController();
    abort.current = controller;
    setState({ busy: true, pct: 0, msg: '' });
    try {
      const { exportVideo } = await import('../../engine/export/exportVideo');
      const blob = await exportVideo(project, { ...cap.plan, audioCodec: null }, {
        signal: controller.signal,
        lipSync,
        layers: l.set,
        onProgress: (p) => setState({ busy: true, pct: p.frame / p.totalFrames, msg: '' }),
      });
      downloadBlob(blob, `${safeName(project.title)}-${l.id}.${cap.plan.extension}`);
      setState({ busy: false, pct: 1, msg: 'تم التنزيل.' });
    } catch (e) {
      setState({ busy: false, pct: 0, msg: controller.signal.aborted ? 'أُلغي.' : e instanceof Error ? e.message : String(e) });
    } finally {
      abort.current = null;
    }
  };

  return (
    <section className="extra-exports">
      <h3>طبقات للمونتاج (After Effects وPremiere)</h3>
      <p className="small muted">صدّر كل طبقة فيديو منفصلًا بنفس الطول، ثم ضعها فوق بعضها في برنامج المونتاج وأزل اللون الأخضر (Keylight أو Ultra Key). ملف الكاميرا يحتوي حجم الشخصيات وموضعها في كل إطار.</p>
      <div className="row wrap">
        <select value={layer} onChange={(e) => setLayer(e.target.value)} disabled={state.busy} aria-label="الطبقة">
          {VIDEO_LAYERS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={run} disabled={disabled || state.busy}>
          صدّر فيديو الطبقة
        </button>
        <button type="button" onClick={() => downloadBlob(new Blob([cameraJson(project)], { type: 'application/json' }), `${safeName(project.title)}-camera.json`)} disabled={disabled}>
          بيانات الكاميرا (JSON)
        </button>
        {state.busy && (
          <button type="button" onClick={() => abort.current?.abort()}>
            إلغاء
          </button>
        )}
      </div>
      {state.busy && <p role="status">جارٍ التصدير: {Math.round(state.pct * 100)}%</p>}
      {state.msg && <p className="small">{state.msg}</p>}
    </section>
  );
}
