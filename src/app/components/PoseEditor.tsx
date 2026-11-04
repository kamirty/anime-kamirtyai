import { useEffect, useRef, useState } from 'react';
import { REST_RIG, isFemale, type Character, type Joint, type RigPose } from '../../domain/types';
import { drawCharacter, restPose, rig as rigOf } from '../../engine/art/body';

type HandleId = 'elbowL' | 'handL' | 'elbowR' | 'handR' | 'kneeL' | 'footL' | 'kneeR' | 'footR';

const PRESETS: { label: string; pose: Partial<RigPose> }[] = [
  { label: 'يرفع يده', pose: { armR: [2.7, 0.15] } },
  { label: 'يدان على الخصر', pose: { armL: [0.75, -1.9], armR: [0.75, -1.9] } },
  { label: 'يحمل شيئًا أمامه', pose: { armL: [-0.25, 1.45], armR: [-0.25, 1.45] } },
  { label: 'يشير للأعلى', pose: { armR: [2.9, 0], head: -0.08 } },
  { label: 'تحية', pose: { armR: [2.2, 1.4], head: 0.05 } },
  { label: 'ينحني', pose: { lean: 0.25, head: 0.15, crouch: 0.15 } },
];

const W = 230;
const H = 320;

/** Joint positions in body units, matching drawCharacter. */
function joints(ch: Character, p: RigPose) {
  const r = rigOf(ch);
  const drop = p.crouch * 0.13 * r.H;
  const top = r.sY + drop;
  const sy = top + 0.032 * r.H;
  const hip = r.hipY + drop;
  const arm = (side: -1 | 1, j: Joint, sx: number) => {
    const e = [sx + side * Math.sin(j[0]) * r.ua, sy + Math.cos(j[0]) * r.ua];
    const h = [e[0] + side * Math.sin(j[0] + j[1]) * r.fa, e[1] + Math.cos(j[0] + j[1]) * r.fa];
    return { s: [sx, sy], e, h };
  };
  const leg = (side: -1 | 1, j: Joint) => {
    const a = j[0] + p.crouch * 0.45;
    const b = j[1] - p.crouch * 0.9;
    const s = [side * 0.045 * r.H, hip];
    const e = [s[0] + side * Math.sin(a) * r.thigh, s[1] + Math.cos(a) * r.thigh];
    const h = [e[0] + side * Math.sin(a + b) * r.shin, e[1] + Math.cos(a + b) * r.shin];
    return { s, e, h, extraA: p.crouch * 0.45, extraB: -p.crouch * 0.9 };
  };
  return { r, L: arm(-1, p.armL, -r.sw * 0.84), R: arm(1, p.armR, r.sw * 0.84), LL: leg(-1, p.legL), LR: leg(1, p.legR) };
}

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Angle from straight down for a limb on `side`, given a vector. */
const angleOf = (side: -1 | 1, dx: number, dy: number) => Math.atan2(side * dx, dy);

export function PoseEditor({ ch, value, onChange }: { ch: Character; value: RigPose; onChange: (p: RigPose) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<HandleId | null>(null);
  const legsVisible = (ch.outfit === 'casual' && !isFemale(ch.kind)) || ch.outfit === 'labcoat';
  const scale = (H * 0.86) / rigOf(ch).H;
  const ox = W / 2;
  const oy = H * 0.94;
  const toPx = (p: number[]) => [ox + p[0] * scale, oy + p[1] * scale];

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f6f3ee';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d8ccb4';
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(W, oy);
    ctx.stroke();
    const pose = restPose('calm');
    pose.armL = value.armL;
    pose.armR = value.armR;
    pose.legL = value.legL;
    pose.legR = value.legR;
    pose.headTilt = value.head;
    pose.crouch = value.crouch;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    drawCharacter(ctx, ch, pose);
    ctx.restore();
    const j = joints(ch, value);
    const dot = (p: number[], big: boolean, color: string) => {
      const [x, y] = toPx(p);
      ctx.beginPath();
      ctx.arc(x, y, big ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#111';
      ctx.stroke();
    };
    dot(j.L.e, false, '#ffeb3b');
    dot(j.L.h, true, '#ffeb3b');
    dot(j.R.e, false, '#ffeb3b');
    dot(j.R.h, true, '#ffeb3b');
    if (legsVisible) {
      dot(j.LL.e, false, '#9be7ff');
      dot(j.LL.h, true, '#9be7ff');
      dot(j.LR.e, false, '#9be7ff');
      dot(j.LR.h, true, '#9be7ff');
    }
  });

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rc = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - rc.left) / rc.width) * W, ((e.clientY - rc.top) / rc.height) * H];
  };
  const hit = (p: number[]): HandleId | null => {
    const j = joints(ch, value);
    const list: [HandleId, number[]][] = [
      ['handL', j.L.h],
      ['handR', j.R.h],
      ['elbowL', j.L.e],
      ['elbowR', j.R.e],
    ];
    if (legsVisible) list.push(['footL', j.LL.h], ['footR', j.LR.h], ['kneeL', j.LL.e], ['kneeR', j.LR.e]);
    let best: HandleId | null = null;
    let bd = 16;
    for (const [id, q] of list) {
      const [x, y] = toPx(q);
      const d = Math.hypot(x - p[0], y - p[1]);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best;
  };
  const move = (id: HandleId, px: number[]) => {
    const j = joints(ch, value);
    const b = [(px[0] - ox) / scale, (px[1] - oy) / scale];
    const next = structuredClone(value);
    const set = (side: -1 | 1, limb: { s: number[]; e: number[] }, key: 'armL' | 'armR' | 'legL' | 'legR', end: boolean, extraA = 0, extraB = 0) => {
      const cur = next[key];
      if (!end) {
        const a = angleOf(side, b[0] - limb.s[0], b[1] - limb.s[1]) - extraA;
        next[key] = [norm(a), cur[1]];
      } else {
        const total = angleOf(side, b[0] - limb.e[0], b[1] - limb.e[1]);
        next[key] = [cur[0], norm(total - (cur[0] + extraA) - extraB)];
      }
    };
    if (id === 'elbowL') set(-1, j.L, 'armL', false);
    if (id === 'handL') set(-1, j.L, 'armL', true);
    if (id === 'elbowR') set(1, j.R, 'armR', false);
    if (id === 'handR') set(1, j.R, 'armR', true);
    if (id === 'kneeL') set(-1, j.LL, 'legL', false, j.LL.extraA);
    if (id === 'footL') set(-1, j.LL, 'legL', true, j.LL.extraA, j.LL.extraB);
    if (id === 'kneeR') set(1, j.LR, 'legR', false, j.LR.extraA);
    if (id === 'footR') set(1, j.LR, 'legR', true, j.LR.extraA, j.LR.extraB);
    onChange(next);
  };

  return (
    <div className="pose-editor">
      <canvas
        ref={ref}
        width={W}
        height={H}
        className={drag ? 'dragging' : ''}
        aria-label="محرر الوضعية: اسحب النقاط الصفراء لتحريك الذراعين"
        onPointerDown={(e) => {
          const id = hit(pointer(e));
          if (!id) return;
          setDrag(id);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => drag && move(drag, pointer(e))}
        onPointerUp={() => setDrag(null)}
      />
      <p className="small muted">اسحب النقاط الصفراء: الكبيرة لليد، والصغيرة للمرفق.{legsVisible ? ' والزرقاء للركبة والقدم.' : ''}</p>
      <div className="chips">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" onClick={() => onChange({ ...REST_RIG, ...p.pose })}>
            {p.label}
          </button>
        ))}
        <button type="button" className="chip" onClick={() => onChange({ ...REST_RIG })}>
          وقفة عادية
        </button>
      </div>
      <label className="slider">
        <span>ميل الرأس</span>
        <input type="range" min={-0.5} max={0.5} step={0.01} value={value.head} onChange={(e) => onChange({ ...value, head: Number(e.target.value) })} />
      </label>
      <label className="slider">
        <span>ميل الجسم</span>
        <input type="range" min={-0.4} max={0.4} step={0.01} value={value.lean} onChange={(e) => onChange({ ...value, lean: Number(e.target.value) })} />
      </label>
      <label className="slider">
        <span>انحناء الركبتين</span>
        <input type="range" min={0} max={1} step={0.02} value={value.crouch} onChange={(e) => onChange({ ...value, crouch: Number(e.target.value) })} />
      </label>
    </div>
  );
}

/** Start and (optional) end pose for the custom action. */
export function RigEditor({ ch, rig, onChange }: { ch: Character; rig: { from: RigPose; to?: RigPose } | undefined; onChange: (r: { from: RigPose; to?: RigPose }) => void }) {
  const [tab, setTab] = useState<'from' | 'to'>('from');
  const value = rig ?? { from: { ...REST_RIG } };
  const cur = tab === 'from' ? value.from : value.to ?? value.from;
  return (
    <div className="rig-editor">
      <div className="seg">
        <button type="button" className={tab === 'from' ? 'active' : ''} onClick={() => setTab('from')}>
          الوضعية الأولى
        </button>
        <button
          type="button"
          className={tab === 'to' ? 'active' : ''}
          onClick={() => {
            if (!value.to) onChange({ ...value, to: structuredClone(value.from) });
            setTab('to');
          }}
        >
          الوضعية الأخيرة {value.to ? '' : '(أضف)'}
        </button>
      </div>
      <p className="small muted">{value.to ? 'تتحرك الشخصية من الوضعية الأولى إلى الأخيرة في أول اللقطة (على اثنين)، ثم تثبت.' : 'وضعية ثابتة. أضف «الوضعية الأخيرة» لتتحرك الشخصية بينهما.'}</p>
      <PoseEditor ch={ch} value={cur} onChange={(p) => onChange(tab === 'from' ? { ...value, from: p } : { ...value, to: p })} />
      {value.to && (
        <button type="button" className="ghost danger" onClick={() => (setTab('from'), onChange({ from: value.from }))}>
          احذف الوضعية الأخيرة
        </button>
      )}
    </div>
  );
}
