import { useEffect, useRef } from 'react';
import { ASPECTS, PLACES, type Project } from '../../domain/types';
import { shotFrames, shotStarts } from '../../domain/timeline';
import { renderFrameSafe } from '../../engine/renderer/renderFrame';

function Thumb({ project, frame, renderKey }: { project: Project; frame: number; renderKey: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const d = ASPECTS[project.aspect].design;
  const w = 120;
  const h = Math.round((w * d.height) / d.width);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) renderFrameSafe(project, frame, ctx, { width: w, height: h }, { noText: true });
  }, [project, frame, renderKey, h]);
  return <canvas ref={ref} width={w} height={h} />;
}

interface Props {
  project: Project;
  selected: number;
  playingShot: number;
  renderKey: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
}

export function Timeline({ project, selected, playingShot, renderKey, onSelect, onAdd }: Props) {
  const starts = shotStarts(project);
  return (
    <section className="timeline" aria-label="اللقطات">
      <div className="timeline-track">
        {project.shots.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`scene-card ${i === selected ? 'selected' : ''} ${i === playingShot ? 'playing' : ''}`}
            onClick={() => onSelect(i)}
            aria-label={`اللقطة ${i + 1}`}
          >
            <Thumb project={project} frame={starts[i] + Math.floor(shotFrames(s) * 0.6)} renderKey={renderKey} />
            <span className="scene-meta">
              <b>
                {i + 1}. {PLACES.find((p) => p.id === s.place)?.label}
              </b>
              <span dir="ltr">{s.duration}s</span>
            </span>
          </button>
        ))}
        <button type="button" className="scene-card scene-add" onClick={onAdd} disabled={project.shots.length >= 30}>
          +<span>لقطة</span>
        </button>
      </div>
    </section>
  );
}
