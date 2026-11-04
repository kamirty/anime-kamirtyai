import { useEffect, useMemo, useRef, useState } from 'react';
import { ASPECTS, FPS, type Project } from '../../domain/types';
import { shotFrames } from '../../domain/timeline';
import { renderFrameSafe } from '../../engine/renderer/renderFrame';
import { MOTIONS, MOTION_CATEGORIES, applyMotion, type MotionCategory, type MotionTarget } from '../../engine/motions';

interface Props {
  project: Project;
  shotIndex: number;
  onApply: (next: Project, label: string, everyShot: boolean) => void;
}

/** 50 motions, previewed live on the visitor's own shot before they are applied. */
export function MotionLibrary({ project, shotIndex, onApply }: Props) {
  const [cat, setCat] = useState<MotionCategory>('everyday');
  const [pick, setPick] = useState(MOTIONS[3].id);
  const [target, setTarget] = useState<MotionTarget>('all');
  const [every, setEvery] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const shot = project.shots[shotIndex];
  const motion = MOTIONS.find((m) => m.id === pick)!;
  const needsActors = !motion.cam;
  const castName = (id: string) => project.cast.find((c) => c.id === id)?.name ?? '';

  const preview = useMemo(() => {
    const next = applyMotion(project, shotIndex, pick, target);
    return { ...next, shots: [next.shots[shotIndex]], fadeOut: false };
  }, [project, shotIndex, pick, target]);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const frames = shotFrames(preview.shots[0]);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const f = Math.floor(((now - t0) / 1000) * FPS) % frames;
      renderFrameSafe(preview, f, ctx, { width: c.width, height: c.height });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [preview]);

  const design = ASPECTS[project.aspect].design;
  const pw = 240;
  const ph = Math.round((pw * design.height) / design.width);

  return (
    <div className="motion-lib">
      <div className="motion-side">
        <canvas ref={ref} width={pw} height={ph} aria-label="معاينة الحركة على لقطتك" />
        <b>
          {motion.icon} {motion.label}
        </b>
        <span className="small muted">{motion.desc}</span>
        <span className="small">
          على اللقطة {shotIndex + 1}، بنفس المكان والشخصيات والنصوص.
        </span>
        {needsActors && shot.actors.length === 0 && <span className="warn">هذه اللقطة بلا شخصيات. اختر لقطة فيها شخصية، أو جرّب حركات الكاميرا.</span>}
        {needsActors && shot.actors.length > 1 && (
          <label className="small">
            على:{' '}
            <select value={String(target)} onChange={(e) => setTarget(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              <option value="all">كل الشخصيات في اللقطة</option>
              {shot.actors.map((a, i) => (
                <option key={i} value={i}>
                  {castName(a.cast)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={every} onChange={(e) => setEvery(e.target.checked)} /> طبّقها على كل اللقطات
        </label>
        <button
          type="button"
          className="primary big"
          disabled={needsActors && shot.actors.length === 0 && !every}
          onClick={() => onApply(applyMotion(project, shotIndex, pick, target, every), motion.label, every)}
        >
          طبّق الحركة على المشهد
        </button>
      </div>
      <div className="motion-main">
        <div className="seg">
          {MOTION_CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={cat === c.id ? 'active' : ''} onClick={() => setCat(c.id)} title={c.hint}>
              {c.label} ({MOTIONS.filter((m) => m.cat === c.id).length})
            </button>
          ))}
        </div>
        <div className="motion-grid">
          {MOTIONS.filter((m) => m.cat === cat).map((m) => (
            <button key={m.id} type="button" className={`motion-card ${pick === m.id ? 'active' : ''}`} onClick={() => setPick(m.id)} aria-pressed={pick === m.id}>
              <span className="mi" aria-hidden="true">
                {m.icon}
              </span>
              <b>{m.label}</b>
              <small>{m.desc}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
