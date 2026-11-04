import { ACTIONS, REST_RIG, type ActionId, type Actor, type DirectorCam, type Expression, type Project, type RigPose, type Shot } from '../domain/types';

/**
 * The Motion Library: 50 ready motions that change how a shot moves, never what it shows.
 * Places, characters, outfits, text and effects stay exactly as they are.
 */

export type MotionCategory = 'everyday' | 'gesture' | 'camera';

export const MOTION_CATEGORIES: { id: MotionCategory; label: string; hint: string }[] = [
  { id: 'everyday', label: 'حركات يومية', hint: 'حركات الجسم الأساسية' },
  { id: 'gesture', label: 'إيماءات بالمفاصل', hint: 'وضعيات وتعابير بحركة الذراعين والرأس' },
  { id: 'camera', label: 'حركات الكاميرا', hint: 'تتحرك الكاميرا ويبقى المشهد كما هو' },
];

export interface Motion {
  id: string;
  cat: MotionCategory;
  label: string;
  desc: string;
  icon: string;
  /** For character motions. */
  action?: ActionId;
  expression?: Expression;
  rig?: { from: Partial<RigPose>; to?: Partial<RigPose>; loop?: number };
  /** For camera motions. */
  cam?: DirectorCam;
  minSeconds?: number;
}

const R = (p: Partial<RigPose>): RigPose => ({ ...REST_RIG, ...p });

export const MOTIONS: Motion[] = [
  // ── everyday actions ──
  { id: 'stand', cat: 'everyday', icon: '🧍', label: 'وقوف هادئ', desc: 'ثبات مع رمشة عين', action: 'stand', expression: 'calm' },
  { id: 'walk', cat: 'everyday', icon: '🚶', label: 'مشي', desc: 'مشي جانبي بخطوات على اثنين', action: 'walk' },
  { id: 'run', cat: 'everyday', icon: '🏃', label: 'ركض', desc: 'ركض سريع والكفّان أمام الصدر', action: 'run', expression: 'set' },
  { id: 'wave', cat: 'everyday', icon: '👋', label: 'تلويح', desc: 'يلوّح للمشاهد بيد واحدة', action: 'wave', expression: 'look' },
  { id: 'talk', cat: 'everyday', icon: '🗣️', label: 'كلام بالإشارة', desc: 'يتكلم ويحرّك يديه', action: 'talk', expression: 'look' },
  { id: 'point', cat: 'everyday', icon: '👉', label: 'إشارة إلى شيء', desc: 'يشير نحو منتصف المشهد', action: 'point' },
  { id: 'greet', cat: 'everyday', icon: '🤝', label: 'ترحيب', desc: 'اليد على الصدر مع ابتسامة', action: 'greet', expression: 'happy' },
  { id: 'think', cat: 'everyday', icon: '🤔', label: 'تفكير', desc: 'يده على ذقنه وينظر للأعلى', action: 'think', expression: 'calm' },
  { id: 'clap', cat: 'everyday', icon: '👏', label: 'تصفيق', desc: 'يصفّق بفرح', action: 'clap', expression: 'happy' },
  { id: 'cheer', cat: 'everyday', icon: '🙌', label: 'احتفال', desc: 'يرفع يديه ويقفز قفزات صغيرة', action: 'cheer', expression: 'happy' },
  { id: 'jump', cat: 'everyday', icon: '⤴️', label: 'قفزة فرح', desc: 'تحفّز ثم قفزة ثم هبوط', action: 'jump', expression: 'happy', minSeconds: 2 },
  { id: 'dance', cat: 'everyday', icon: '💃', label: 'رقص', desc: 'تمايل بإيقاع', action: 'dance', expression: 'happy' },
  { id: 'nod', cat: 'everyday', icon: '🙂', label: 'هزّ الرأس موافقةً', desc: 'إيماءة «نعم»', action: 'nod', expression: 'calm' },
  { id: 'power', cat: 'everyday', icon: '⚡', label: 'ضربة قوة أنمي', desc: 'تحفّز وقفزة ودوران وهلال من نور وإطار صدمة', action: 'power', expression: 'set', minSeconds: 4.5 },

  // ── hand-posed gestures ──
  { id: 'dua', cat: 'gesture', icon: '🤲', label: 'رفع اليدين بالدعاء', desc: 'الكفّان مرفوعتان أمام الصدر', expression: 'calm', rig: { from: {}, to: { armL: [0.35, 2.95], armR: [0.35, 2.95], head: -0.06 } } },
  { id: 'salute', cat: 'gesture', icon: '🫡', label: 'تحية عسكرية', desc: 'اليد إلى الجبين', expression: 'set', rig: { from: {}, to: { armR: [1.35, 2.35] } } },
  { id: 'heart', cat: 'gesture', icon: '❤️', label: 'اليد على القلب', desc: 'امتنان واحترام', expression: 'happy', rig: { from: {}, to: { armR: [-0.2, 2.05], head: 0.08 } } },
  { id: 'bow', cat: 'gesture', icon: '🙇', label: 'انحناءة احترام', desc: 'يخفض رأسه ويضمّ يديه', expression: 'calm', rig: { from: {}, to: { armL: [-0.1, 1.0], armR: [-0.1, 1.0], head: 0.2, crouch: 0.15 } } },
  { id: 'handshake', cat: 'gesture', icon: '🤝', label: 'يمدّ يده للمصافحة', desc: 'يد ممدودة نحو الآخر', expression: 'look', rig: { from: {}, to: { armR: [0.65, 0.55] } } },
  { id: 'scratch', cat: 'gesture', icon: '😅', label: 'يحكّ رأسه محرجًا', desc: 'حيرة وإحراج مع قطرة العرق', expression: 'embarrassed', rig: { from: { armR: [2.4, 1.45] }, to: { armR: [2.4, 1.75] }, loop: 0.4 } },
  { id: 'idea', cat: 'gesture', icon: '💡', label: 'فكرة!', desc: 'يرفع إصبعه وعيناه تلمعان', expression: 'amazed', rig: { from: {}, to: { armR: [0.5, 2.45], lift: 0.05 } } },
  { id: 'shyface', cat: 'gesture', icon: '🙈', label: 'يغطي وجهه خجلًا', desc: 'اليدان على الوجه', expression: 'shy', rig: { from: {}, to: { armL: [-0.15, 3.75], armR: [-0.15, 3.75], head: 0.1 } } },
  { id: 'openarms', cat: 'gesture', icon: '🫂', label: 'ذراعان مفتوحتان للترحيب', desc: 'ترحيب واسع', expression: 'happy', rig: { from: {}, to: { armL: [1.2, 0.3], armR: [1.2, 0.3] } } },
  { id: 'victory', cat: 'gesture', icon: '🏆', label: 'رفع اليدين بالنصر', desc: 'يدان إلى الأعلى مع قفزة', expression: 'happy', rig: { from: {}, to: { armL: [2.75, 0.35], armR: [2.75, 0.35], lift: 0.25 } } },
  { id: 'read', cat: 'gesture', icon: '📖', label: 'يقرأ كتابًا', desc: 'اليدان أمامه والرأس منخفض', expression: 'calm', rig: { from: { armL: [-0.25, 1.45], armR: [-0.25, 1.45], head: 0.14 }, to: { armL: [-0.25, 1.45], armR: [-0.25, 1.45], head: 0.18 }, loop: 2.4 } },
  { id: 'write', cat: 'gesture', icon: '✍️', label: 'يكتب على السبورة', desc: 'يد مرفوعة تكتب ذهابًا وإيابًا', expression: 'calm', rig: { from: { armR: [1.0, 0.9] }, to: { armR: [1.1, 1.25] }, loop: 0.5 } },
  { id: 'cry', cat: 'gesture', icon: '😢', label: 'يمسح دموعه', desc: 'حزن ويد على العين', expression: 'sad', rig: { from: { armR: [0.1, 2.8], head: 0.1 }, to: { armR: [0.1, 3.0], head: 0.14 }, loop: 0.6 } },
  { id: 'shrug', cat: 'gesture', icon: '🤷', label: 'هزّ الكتفين', desc: '«لا أعرف»', expression: 'look', rig: { from: {}, to: { armL: [0.3, 1.2], armR: [0.3, 1.2], head: 0.1, lift: 0.03 } } },
  { id: 'stretch', cat: 'gesture', icon: '🥱', label: 'يتمدّد ويتثاءب', desc: 'يدان إلى الأعلى وعينان مغمضتان', expression: 'happy', rig: { from: {}, to: { armL: [2.9, 0.1], armR: [2.9, 0.1], head: -0.06 } } },
  { id: 'squat', cat: 'gesture', icon: '🏋️', label: 'تمرين القرفصاء', desc: 'نزول وصعود متكرر', expression: 'set', rig: { from: { armL: [1.4, 0], armR: [1.4, 0] }, to: { armL: [1.4, 0], armR: [1.4, 0], crouch: 0.8 }, loop: 1 } },
  { id: 'jacks', cat: 'gesture', icon: '🤸', label: 'قفز وفتح الذراعين', desc: 'تمرين رياضي متكرر', expression: 'happy', rig: { from: { armL: [0.2, 0], armR: [0.2, 0] }, to: { armL: [2.8, 0], armR: [2.8, 0], lift: 0.25 }, loop: 0.6 } },
  { id: 'shiver', cat: 'gesture', icon: '🥶', label: 'يرتجف من البرد', desc: 'ذراعان متشابكتان وارتعاش', expression: 'sad', rig: { from: { armL: [-0.4, 1.3], armR: [-0.4, 1.3], lean: -0.025 }, to: { armL: [-0.4, 1.3], armR: [-0.4, 1.3], lean: 0.025 }, loop: 0.17 } },
  { id: 'laugh', cat: 'gesture', icon: '😂', label: 'ضحك من القلب', desc: 'اليدان على البطن والجسم يهتز', expression: 'happy', rig: { from: { armL: [-0.2, 1.1], armR: [-0.2, 1.1], head: -0.12 }, to: { armL: [-0.2, 1.1], armR: [-0.2, 1.1], head: -0.15, lift: 0.06 }, loop: 0.3 } },
  { id: 'crossed', cat: 'gesture', icon: '😤', label: 'يشبك ذراعيه غاضبًا', desc: 'غضب وعلامة الغضب', expression: 'angry', rig: { from: {}, to: { armL: [-0.45, 1.35], armR: [-0.45, 1.35], head: 0.05 } } },
  { id: 'twowave', cat: 'gesture', icon: '🙋', label: 'تلويح باليدين', desc: 'يلوّح بحماس بكلتا يديه', expression: 'happy', rig: { from: { armL: [2.5, -0.3], armR: [2.5, -0.3] }, to: { armL: [2.5, 0.3], armR: [2.5, 0.3] }, loop: 0.4 } },
  { id: 'call', cat: 'gesture', icon: '📣', label: 'ينادي من بعيد', desc: 'اليدان حول الفم', expression: 'look', rig: { from: {}, to: { armL: [0.0, 3.3], armR: [0.0, 3.3], head: -0.05 } } },
  { id: 'pointup', cat: 'gesture', icon: '☝️', label: 'يشير إلى السماء', desc: 'إشارة للأعلى بدهشة', expression: 'amazed', rig: { from: {}, to: { armR: [2.95, 0], head: -0.12 } } },
  { id: 'wait', cat: 'gesture', icon: '🧘', label: 'ينتظر بهدوء', desc: 'اليدان متشابكتان أمامه', expression: 'calm', rig: { from: {}, to: { armL: [-0.2, 0.9], armR: [-0.2, 0.9], head: 0.04 } } },

  // ── camera moves ──
  { id: 'cam-push', cat: 'camera', icon: '🎥', label: 'اقتراب درامي', desc: 'الكاميرا تقترب ببطء متزايد', cam: { from: { zoom: 1, x: 0, y: 0 }, to: { zoom: 1.8, x: 0, y: -0.15 }, ease: 'in' } },
  { id: 'cam-pull', cat: 'camera', icon: '🔭', label: 'ابتعاد كاشف', desc: 'تبدأ قريبة ثم تكشف المكان', cam: { from: { zoom: 2, x: 0, y: -0.2 }, to: { zoom: 1, x: 0, y: 0 }, ease: 'out' } },
  { id: 'cam-pan-rl', cat: 'camera', icon: '⬅️', label: 'تحريك من اليمين لليسار', desc: 'استعراض أفقي للمشهد', cam: { from: { zoom: 1.35, x: 0.7, y: 0 }, to: { zoom: 1.35, x: -0.7, y: 0 }, ease: 'inout' } },
  { id: 'cam-pan-lr', cat: 'camera', icon: '➡️', label: 'تحريك من اليسار لليمين', desc: 'استعراض أفقي معاكس', cam: { from: { zoom: 1.35, x: -0.7, y: 0 }, to: { zoom: 1.35, x: 0.7, y: 0 }, ease: 'inout' } },
  { id: 'cam-up', cat: 'camera', icon: '⬆️', label: 'صعود من الأرض للسماء', desc: 'من القدمين إلى السماء', cam: { from: { zoom: 1.4, x: 0, y: 0.6 }, to: { zoom: 1.4, x: 0, y: -0.6 }, ease: 'inout' } },
  { id: 'cam-down', cat: 'camera', icon: '⬇️', label: 'نزول من السماء للأرض', desc: 'من السماء إلى الشخصية', cam: { from: { zoom: 1.4, x: 0, y: -0.6 }, to: { zoom: 1.4, x: 0, y: 0.3 }, ease: 'inout' } },
  { id: 'cam-shake', cat: 'camera', icon: '💥', label: 'هزّة صدمة', desc: 'اهتزاز قوي للحظات الحماس', cam: { from: { zoom: 1.15, x: 0, y: 0 }, to: { zoom: 1.25, x: 0, y: 0 }, ease: 'out', shake: true } },
  { id: 'cam-snap', cat: 'camera', icon: '⚡', label: 'اقتراب خاطف', desc: 'تقريب سريع على الحدث', cam: { from: { zoom: 1, x: 0, y: 0 }, to: { zoom: 2.4, x: 0, y: -0.2 }, ease: 'in' } },
  { id: 'cam-hand', cat: 'camera', icon: '📹', label: 'كاميرا محمولة', desc: 'اهتزاز خفيف مع اقتراب بطيء', cam: { from: { zoom: 1.1, x: 0, y: 0 }, to: { zoom: 1.18, x: 0.05, y: 0 }, ease: 'linear', shake: true } },
  { id: 'cam-face', cat: 'camera', icon: '👀', label: 'اقتراب إلى الوجه', desc: 'من المشهد إلى ملامح الشخصية', cam: { from: { zoom: 1, x: 0, y: 0 }, to: { zoom: 2.6, x: 0, y: -0.35 }, ease: 'inout' } },
  { id: 'cam-glide', cat: 'camera', icon: '🌊', label: 'انزلاق مع اقتراب', desc: 'حركة أفقية ناعمة تقترب', cam: { from: { zoom: 1.2, x: 0.5, y: 0 }, to: { zoom: 1.6, x: -0.3, y: -0.1 }, ease: 'inout' } },
  { id: 'cam-tense', cat: 'camera', icon: '😰', label: 'توتر وترقّب', desc: 'ارتجاف خفيف وكاميرا شبه ثابتة', cam: { from: { zoom: 1.05, x: 0, y: 0 }, to: { zoom: 1.12, x: 0, y: 0 }, ease: 'linear', shake: true } },
];

export type MotionTarget = 'all' | number;

/** Applies a motion to one shot (or every shot) and returns the new project. Only motion fields change. */
export function applyMotion(project: Project, shotIndex: number, motionId: string, target: MotionTarget = 'all', everyShot = false): Project {
  const m = MOTIONS.find((x) => x.id === motionId);
  if (!m) return project;
  const apply = (shot: Shot): Shot => {
    if (m.cam) return { ...shot, direct: structuredClone(m.cam) };
    if (!shot.actors.length) return shot;
    const actors = shot.actors.map((a, i): Actor => {
      if (target !== 'all' && target !== i) return a;
      const next: Actor = { cast: a.cast, x: a.x, expression: m.expression ?? a.expression, action: m.action ?? 'custom' };
      if (m.rig) next.rig = { from: R(m.rig.from), to: m.rig.to ? R(m.rig.to) : undefined, loop: m.rig.loop };
      if (next.action === 'walk' || next.action === 'run') next.to = a.to ?? (a.x < 0.5 ? 0.8 : 0.2);
      return next;
    });
    const min = Math.max(m.minSeconds ?? 0, ACTIONS.find((x) => x.id === m.action)?.minSeconds ?? 0);
    return { ...shot, actors, duration: Math.max(shot.duration, min) };
  };
  return { ...project, shots: project.shots.map((s, i) => (everyShot || i === shotIndex ? apply(s) : s)) };
}
