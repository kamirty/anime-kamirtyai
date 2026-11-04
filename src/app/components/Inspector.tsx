import {
  ACTIONS,
  ASPECTS,
  CAMERAS,
  EFFECTS,
  EXPRESSIONS,
  KINDS,
  MAX_ACTORS_PER_SHOT,
  MAX_CAST,
  MUSIC,
  PLACES,
  SIZES,
  SKINS,
  TIMES,
  TRANSITIONS,
  outfitsFor,
  type Aspect,
  type Character,
  type Project,
  type Shot,
} from '../../domain/types';
import { DEFAULT_COLORS, newCharacter } from '../../domain/sanitize';
import { FONTS } from '../../design/fonts';

interface Props {
  project: Project;
  index: number;
  onShot: (patch: Partial<Shot>) => void;
  onProject: (patch: Partial<Project>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function Seg<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {items.map((it) => (
        <button key={it.id} type="button" className={value === it.id ? 'active' : ''} onClick={() => onChange(it.id)} aria-pressed={value === it.id}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Inspector({ project, index, onShot, onProject, onMove, onDuplicate, onDelete }: Props) {
  const shot = project.shots[index];
  if (!shot) return null;
  const setActor = (i: number, patch: Partial<Shot['actors'][number]>) => onShot({ actors: shot.actors.map((a, k) => (k === i ? { ...a, ...patch } : a)) });
  const setChar = (id: string, patch: Partial<Character>) => onProject({ cast: project.cast.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const minFor = Math.max(1.5, ...shot.actors.map((a) => ACTIONS.find((x) => x.id === a.action)?.minSeconds ?? 0));

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <h2>اللقطة {index + 1}</h2>
        <div className="tools">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} title="قدّمها" aria-label="قدّم اللقطة">
            →
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === project.shots.length - 1} title="أخّرها" aria-label="أخّر اللقطة">
            ←
          </button>
          <button type="button" onClick={onDuplicate} disabled={project.shots.length >= 30} title="تكرار">
            ⧉
          </button>
          <button type="button" className="danger" onClick={onDelete} disabled={project.shots.length <= 1} title="حذف">
            ✕
          </button>
        </div>
      </div>

      <label className="label">
        المدة: <span dir="ltr">{shot.duration}s</span>
      </label>
      <input type="range" min={minFor} max={15} step={0.5} value={shot.duration} onChange={(e) => onShot({ duration: Number(e.target.value) })} aria-label="مدة اللقطة" />

      <label className="label">المكان</label>
      <select value={shot.place} onChange={(e) => onShot({ place: e.target.value as Shot['place'] })}>
        {PLACES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <label className="label">الوقت</label>
      <Seg items={TIMES} value={shot.time} onChange={(time) => onShot({ time })} />
      <label className="label">حجم اللقطة</label>
      <Seg items={SIZES} value={shot.size} onChange={(size) => onShot({ size })} />
      <label className="label">الكاميرا</label>
      <Seg items={CAMERAS} value={shot.camera} onChange={(camera) => onShot({ camera })} />

      <label className="label">الشخصيات في اللقطة</label>
      <div className="items">
        {shot.actors.map((a, i) => (
          <div key={i} className="actor-card">
            <div className="item-row">
              <select value={a.cast} onChange={(e) => setActor(i, { cast: e.target.value })} aria-label="الشخصية">
                {project.cast.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" className="ghost" onClick={() => onShot({ actors: shot.actors.filter((_, k) => k !== i), dialogue: shot.dialogue && shot.dialogue.actor !== i ? { ...shot.dialogue, actor: shot.dialogue.actor > i ? shot.dialogue.actor - 1 : shot.dialogue.actor } : undefined })} aria-label="أزل الشخصية">
                ✕
              </button>
            </div>
            <div className="item-row">
              <select
                value={a.action}
                onChange={(e) => {
                  const action = e.target.value as Shot['actors'][number]['action'];
                  const min = ACTIONS.find((x) => x.id === action)?.minSeconds ?? 0;
                  const actors = shot.actors.map((x, k) => (k === i ? { ...x, action, to: action === 'walk' ? (a.x < 0.5 ? 0.75 : 0.25) : undefined } : x));
                  onShot({ actors, duration: Math.max(shot.duration, min) });
                }}
                aria-label="الحركة"
              >
                {ACTIONS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
              <select value={a.expression} onChange={(e) => setActor(i, { expression: e.target.value as Shot['actors'][number]['expression'] })} aria-label="التعبير">
                {EXPRESSIONS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="slider">
              <span>
                الموضع <small className="muted">يمين ← يسار</small>
              </span>
              <input type="range" min={0.05} max={0.95} step={0.01} value={a.x} onChange={(e) => setActor(i, { x: Number(e.target.value) })} />
            </label>
            {a.action === 'walk' && (
              <label className="slider">
                <span>يمشي إلى</span>
                <input type="range" min={0.05} max={0.95} step={0.01} value={a.to ?? 0.7} onChange={(e) => setActor(i, { to: Number(e.target.value) })} />
              </label>
            )}
          </div>
        ))}
        {shot.actors.length < MAX_ACTORS_PER_SHOT && project.cast.length > 0 && (
          <button type="button" className="add" onClick={() => onShot({ actors: [...shot.actors, { cast: project.cast[0].id, action: 'stand', expression: 'calm', x: shot.actors.length ? 0.7 : 0.5 }] })}>
            + أضف شخصية إلى اللقطة
          </button>
        )}
      </div>

      <label className="label">كلام في فقاعة</label>
      {shot.actors.length === 0 ? (
        <p className="muted small">أضف شخصية أولًا ليظهر كلامها.</p>
      ) : (
        <>
          {shot.actors.length > 1 && (
            <select value={shot.dialogue?.actor ?? 0} onChange={(e) => onShot({ dialogue: { actor: Number(e.target.value), text: shot.dialogue?.text ?? '' } })} aria-label="المتكلم">
              {shot.actors.map((a, i) => (
                <option key={i} value={i}>
                  {project.cast.find((c) => c.id === a.cast)?.name}
                </option>
              ))}
            </select>
          )}
          <textarea rows={2} maxLength={160} value={shot.dialogue?.text ?? ''} onChange={(e) => onShot({ dialogue: e.target.value ? { actor: shot.dialogue?.actor ?? 0, text: e.target.value } : undefined })} placeholder="ماذا تقول الشخصية؟" />
        </>
      )}

      <label className="label">عبارة على الشاشة</label>
      <Seg
        items={[
          { id: 'caption', label: 'شريط سفلي' },
          { id: 'title', label: 'عنوان كبير' },
        ]}
        value={shot.text?.style ?? 'caption'}
        onChange={(style) => onShot({ text: { main: shot.text?.main ?? '', sub: shot.text?.sub, style } })}
      />
      <input value={shot.text?.main ?? ''} maxLength={120} onChange={(e) => onShot({ text: e.target.value ? { style: shot.text?.style ?? 'caption', main: e.target.value, sub: shot.text?.sub } : undefined })} placeholder="العبارة الرئيسية" />
      <input className="mt-s" value={shot.text?.sub ?? ''} maxLength={80} disabled={!shot.text?.main} onChange={(e) => shot.text && onShot({ text: { ...shot.text, sub: e.target.value || undefined } })} placeholder="سطر صغير تحتها (اختياري)" />

      <label className="label">تأثيرات</label>
      <div className="chips">
        {EFFECTS.map((e) => {
          const on = shot.effects.includes(e.id);
          return (
            <button key={e.id} type="button" className={`chip ${on ? 'active' : ''}`} aria-pressed={on} onClick={() => onShot({ effects: on ? shot.effects.filter((x) => x !== e.id) : [...shot.effects, e.id] })}>
              {e.label}
            </button>
          );
        })}
      </div>
      <label className="label">الانتقال إلى اللقطة التالية</label>
      <Seg items={TRANSITIONS} value={shot.transition} onChange={(transition) => onShot({ transition })} />

      <details className="group" open>
        <summary>الشخصيات ({project.cast.length})</summary>
        {project.cast.map((c) => (
          <div key={c.id} className="char-card">
            <div className="item-row">
              <input value={c.name} maxLength={40} onChange={(e) => setChar(c.id, { name: e.target.value })} aria-label="اسم الشخصية" />
              <button
                type="button"
                className="ghost"
                disabled={project.cast.length <= 1}
                onClick={() => onProject({ cast: project.cast.filter((x) => x.id !== c.id), shots: project.shots.map((s) => ({ ...s, actors: s.actors.filter((a) => a.cast !== c.id), dialogue: undefined })) })}
                aria-label="احذف الشخصية"
              >
                ✕
              </button>
            </div>
            <div className="item-row">
              <select
                value={c.kind}
                onChange={(e) => {
                  const kind = e.target.value as Character['kind'];
                  const outfit = outfitsFor(kind).some((o) => o.id === c.outfit) ? c.outfit : outfitsFor(kind)[0].id;
                  setChar(c.id, { kind, outfit, ...(outfit !== c.outfit ? DEFAULT_COLORS[outfit] : {}) });
                }}
                aria-label="النوع"
              >
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              <select value={c.outfit} onChange={(e) => setChar(c.id, { outfit: e.target.value as Character['outfit'], ...DEFAULT_COLORS[e.target.value] })} aria-label="اللبس">
                {outfitsFor(c.kind).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="swatches" role="group" aria-label="لون البشرة">
              {SKINS.map((s, i) => (
                <button key={s} type="button" className={`swatch ${c.skin === i ? 'active' : ''}`} style={{ background: s }} onClick={() => setChar(c.id, { skin: i })} aria-label={`لون بشرة ${i + 1}`} />
              ))}
              <label className="color-pick" title="لون اللبس">
                <input type="color" value={c.color} onChange={(e) => setChar(c.id, { color: e.target.value })} />
                <span>اللبس</span>
              </label>
              <label className="color-pick" title="لون التطريز أو الشيلة أو المصر">
                <input type="color" value={c.accent} onChange={(e) => setChar(c.id, { accent: e.target.value })} />
                <span>التطريز</span>
              </label>
            </div>
          </div>
        ))}
        {project.cast.length < MAX_CAST && (
          <button type="button" className="add" onClick={() => onProject({ cast: [...project.cast, { ...newCharacter('girl'), id: `c${Date.now().toString(36)}` }] })}>
            + شخصية جديدة
          </button>
        )}
      </details>

      <details className="group">
        <summary>إعدادات الفيديو</summary>
        <label className="label">المقاس</label>
        <Seg items={(Object.keys(ASPECTS) as Aspect[]).map((id) => ({ id, label: ASPECTS[id].label }))} value={project.aspect} onChange={(aspect) => onProject({ aspect })} />
        <label className="label">خط العبارات</label>
        <select value={project.font} onChange={(e) => onProject({ font: e.target.value })}>
          {FONTS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="label">الموسيقى</label>
        <select value={project.audio.music} onChange={(e) => onProject({ audio: { ...project.audio, music: e.target.value as Project['audio']['music'] } })}>
          {MUSIC.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={project.audio.sfx} onChange={(e) => onProject({ audio: { ...project.audio, sfx: e.target.checked } })} /> مؤثرات صوتية
        </label>
        <label className="check">
          <input type="checkbox" checked={project.audio.ambience} onChange={(e) => onProject({ audio: { ...project.audio, ambience: e.target.checked } })} /> أصوات المكان (ريح، موج، طيور…)
        </label>
        <label className="check">
          <input type="checkbox" checked={project.fadeOut} onChange={(e) => onProject({ fadeOut: e.target.checked })} /> إظلام في النهاية
        </label>
      </details>
    </aside>
  );
}
