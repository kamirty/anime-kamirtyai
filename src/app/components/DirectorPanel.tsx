import type { CamEase, CamKey, DirectorCam, Shot } from '../../domain/types';

const PRESETS: { label: string; cam: DirectorCam }[] = [
  { label: 'اقتراب درامي', cam: { from: { zoom: 1, x: 0, y: 0 }, to: { zoom: 1.8, x: 0, y: -0.15 }, ease: 'in' } },
  { label: 'ابتعاد كاشف', cam: { from: { zoom: 2, x: 0, y: -0.2 }, to: { zoom: 1, x: 0, y: 0 }, ease: 'out' } },
  { label: 'تحريك من اليمين لليسار', cam: { from: { zoom: 1.35, x: 0.7, y: 0 }, to: { zoom: 1.35, x: -0.7, y: 0 }, ease: 'inout' } },
  { label: 'صعود من الأرض للسماء', cam: { from: { zoom: 1.4, x: 0, y: 0.6 }, to: { zoom: 1.4, x: 0, y: -0.6 }, ease: 'inout' } },
  { label: 'هزّة صدمة', cam: { from: { zoom: 1.15, x: 0, y: 0 }, to: { zoom: 1.25, x: 0, y: 0 }, ease: 'out', shake: true } },
];

const EASES: { id: CamEase; label: string }[] = [
  { id: 'inout', label: 'ناعمة' },
  { id: 'in', label: 'تتسارع' },
  { id: 'out', label: 'تتباطأ' },
  { id: 'linear', label: 'ثابتة' },
];

function KeyEditor({ title, k, onChange }: { title: string; k: CamKey; onChange: (k: CamKey) => void }) {
  return (
    <fieldset className="cam-key">
      <legend>{title}</legend>
      <label className="slider">
        <span>
          التقريب <b dir="ltr">×{k.zoom.toFixed(2)}</b>
        </span>
        <input type="range" min={1} max={3} step={0.05} value={k.zoom} onChange={(e) => onChange({ ...k, zoom: Number(e.target.value) })} />
      </label>
      <label className="slider">
        <span>يمين ↔ يسار</span>
        <input type="range" min={-1} max={1} step={0.05} value={-k.x} onChange={(e) => onChange({ ...k, x: -Number(e.target.value) })} />
      </label>
      <label className="slider">
        <span>أعلى ↕ أسفل</span>
        <input type="range" min={-1} max={1} step={0.05} value={k.y} onChange={(e) => onChange({ ...k, y: Number(e.target.value) })} />
      </label>
    </fieldset>
  );
}

/** Director mode: camera keyframes for the start and the end of a shot. */
export function DirectorPanel({ shot, onShot }: { shot: Shot; onShot: (patch: Partial<Shot>) => void }) {
  const d = shot.direct;
  return (
    <details className="group director" open={!!d}>
      <summary>🎬 وضع المخرج: حركة الكاميرا</summary>
      <p className="small muted">حدّد مكان الكاميرا في بداية اللقطة ونهايتها، فتتحرك بينهما بنعومة. يلغي هذا خيار «الكاميرا» العادي.</p>
      <div className="chips">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" onClick={() => onShot({ direct: structuredClone(p.cam) })}>
            {p.label}
          </button>
        ))}
      </div>
      {d ? (
        <>
          <KeyEditor title="البداية" k={d.from} onChange={(from) => onShot({ direct: { ...d, from } })} />
          <KeyEditor title="النهاية" k={d.to} onChange={(to) => onShot({ direct: { ...d, to } })} />
          <label className="label">سرعة الحركة</label>
          <div className="seg">
            {EASES.map((e) => (
              <button key={e.id} type="button" className={d.ease === e.id ? 'active' : ''} onClick={() => onShot({ direct: { ...d, ease: e.id } })}>
                {e.label}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={!!d.shake} onChange={(e) => onShot({ direct: { ...d, shake: e.target.checked || undefined } })} /> اهتزاز الكاميرا (للصدمات والحماس)
          </label>
          <button type="button" className="ghost danger" onClick={() => onShot({ direct: undefined })}>
            إلغاء وضع المخرج لهذه اللقطة
          </button>
        </>
      ) : (
        <button type="button" className="add" onClick={() => onShot({ direct: { from: { zoom: 1, x: 0, y: 0 }, to: { zoom: 1.3, x: 0, y: 0 }, ease: 'inout' } })}>
          + أضف حركة كاميرا مخصصة
        </button>
      )}
    </details>
  );
}
