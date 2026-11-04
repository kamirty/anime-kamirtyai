import type { ReactNode } from 'react';
import { parseProject, newCharacter } from '../domain/sanitize';
import type { Character, Expression, Project } from '../domain/types';
import { drawCharacter, restPose, type Pose } from '../engine/art/body';
import { drawHead } from '../engine/art/head';
import { INK, PRACTICAL, type Ctx, clamp, easeInOut, lerp } from '../engine/art/paint';
import { POWER } from '../engine/art/poses';
import { renderFrame } from '../engine/renderer/renderFrame';
import { Demo, type Variant } from './Demo';

/** Interactive lessons on why anime moves the way it does. Every demo is drawn by the studio's own engine. */

const BOY: Character = { ...newCharacter('boy', 'dishdasha', 'سالم'), id: 'b' };
const GIRL: Character = { ...newCharacter('girl', 'school', 'مريم'), id: 'g' };

function paper(ctx: Ctx, W: number, H: number, ground = 0.82) {
  ctx.fillStyle = '#f6f3ee';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e4d8c2';
  ctx.fillRect(0, H * ground, W, H * (1 - ground));
  ctx.strokeStyle = '#c9b89a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H * ground);
  ctx.lineTo(W, H * ground);
  ctx.stroke();
}

function ball(ctx: Ctx, x: number, y: number, r: number, sx = 1, sy = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.fillStyle = '#d7192a';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3 / Math.max(sx, sy);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = alpha * 0.7;
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.18, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function person(ctx: Ctx, ch: Character, pose: Pose, x: number, groundY: number, scale: number) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(scale, scale);
  drawCharacter(ctx, ch, pose);
  ctx.restore();
}

const held = (frame: number, hold: number) => Math.floor(frame / hold) * hold;
const marksEvery = (frames: number, hold: number) => Array.from({ length: Math.ceil(frames / hold) }, (_, i) => i * hold);

// ── 1. on twos ──
interface TwosOpts {
  hold: number;
}
const BOUNCE = 48;
function drawTwos(ctx: Ctx, W: number, H: number, frame: number, o: TwosOpts) {
  paper(ctx, W, H);
  const gy = H * 0.82;
  for (let k = 3; k >= 1; k--) {
    const f = held(frame, o.hold) - k * o.hold;
    if (f < 0) continue;
    const p = f / BOUNCE;
    ball(ctx, W * (0.12 + 0.76 * p), gy - 26 - Math.abs(Math.sin(p * Math.PI * 3)) * H * 0.5, 26, 1, 1, 0.12 * (4 - k));
  }
  const p = held(frame, o.hold) / BOUNCE;
  ball(ctx, W * (0.12 + 0.76 * p), gy - 26 - Math.abs(Math.sin(p * Math.PI * 3)) * H * 0.5, 26);
}

function drawWave(ctx: Ctx, W: number, H: number, frame: number, o: TwosOpts) {
  paper(ctx, W, H);
  const f = held(frame, o.hold);
  const pose = restPose('look');
  pose.armR = [2.55, -0.45 + 0.75 * (0.5 + 0.5 * Math.sin((f / 24) * Math.PI * 2 * 1.5))];
  person(ctx, BOY, pose, W / 2, H * 0.92, (H * 0.8) / 780);
}

// ── 2. anticipation ──
interface AntOpts {
  ant: number;
}
const JUMP_F = 54;
function jumpPose(frame: number, ant: number): Pose {
  const p = restPose('calm');
  const f = held(frame, 2);
  const s = 10;
  if (f < s) return p;
  if (f < s + ant) {
    p.crouch = 0.75;
    p.armL = [-0.3, 0.4];
    p.armR = [-0.3, 0.4];
    return p;
  }
  const a = s + ant;
  if (f < a + 2) {
    p.stretch = 1.2;
    p.dy = -90;
    p.armL = [2.8, 0];
    p.armR = [2.8, 0];
    return p;
  }
  if (f < a + 18) {
    const q = (f - a - 2) / 16;
    p.dy = -Math.sin(Math.PI * q) * 380 - 40 * (1 - q);
    p.armL = [2.4, 0.3];
    p.armR = [2.4, 0.3];
    p.expression = 'happy';
    return p;
  }
  if (f < a + 22) {
    p.crouch = 0.45;
    p.armL = [0.6, 0.2];
    p.armR = [0.6, 0.2];
  }
  return p;
}
function drawJump(ctx: Ctx, W: number, H: number, frame: number, o: AntOpts) {
  paper(ctx, W, H, 0.9);
  person(ctx, GIRL, jumpPose(frame, o.ant), W / 2, H * 0.9, (H * 0.45) / 780);
}

// ── 3. spacing ──
interface EaseOpts {
  ease: 'linear' | 'inout' | 'out';
}
const EASE_F = 36;
const easeOf = (e: EaseOpts['ease'], t: number) => (e === 'linear' ? t : e === 'inout' ? easeInOut(t) : 1 - Math.pow(1 - t, 3));
function drawEase(ctx: Ctx, W: number, H: number, frame: number, o: EaseOpts) {
  paper(ctx, W, H, 0.7);
  const x0 = W * 0.12;
  const x1 = W * 0.88;
  const move = 24;
  const f = Math.min(held(frame, 2), move);
  // spacing chart: every drawing's position
  ctx.fillStyle = INK;
  for (let d = 0; d <= move; d += 2) {
    const x = lerp(x0, x1, easeOf(o.ease, d / move));
    ctx.globalAlpha = d === f ? 1 : 0.35;
    ctx.fillRect(x - 2, H * 0.8, 4, d % 4 ? 14 : 24);
  }
  ctx.globalAlpha = 1;
  ball(ctx, lerp(x0, x1, easeOf(o.ease, f / move)), H * 0.7 - 30, 30);
}

// ── 4. smear ──
interface SmearOpts {
  smear: boolean;
}
const SMEAR_F = 30;
function drawSmear(ctx: Ctx, W: number, H: number, frame: number, o: SmearOpts) {
  paper(ctx, W, H);
  const cx = W * 0.35;
  const cy = H * 0.7;
  const L = H * 0.5;
  // a stick swings from behind the shoulder to the front in 3 drawings, then holds
  const keys = [-2.4, -2.4, -0.9, 0.6, 1.1, 1.1];
  const i = Math.min(keys.length - 1, Math.floor(frame / 2) - 4 < 0 ? 0 : Math.floor(frame / 2) - 4);
  const a = keys[Math.max(0, i)];
  const fast = i === 2 || i === 3;
  if (o.smear && fast) {
    const from = keys[i - 1];
    ctx.fillStyle = PRACTICAL;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, L, Math.min(from, a) - Math.PI / 2, Math.max(from, a) - Math.PI / 2);
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.strokeStyle = '#120e0c';
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -L);
  ctx.stroke();
  ctx.fillStyle = PRACTICAL;
  ctx.beginPath();
  ctx.arc(0, -L, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#b97a55';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ── 5. holds ──
interface HoldOpts {
  hold: boolean;
}
const HOLD_F = 60;
function drawHold(ctx: Ctx, W: number, H: number, frame: number, o: HoldOpts) {
  paper(ctx, W, H, 0.92);
  const pose = restPose('calm');
  const f = o.hold ? held(frame, 2) : frame;
  let k: number;
  if (o.hold) k = f < 10 ? 0 : f < 18 ? (f - 10) / 8 : 1;
  else k = clamp(f / 50, 0, 1);
  const eased = o.hold ? easeInOut(k) : k;
  pose.armR = [lerp(0.12, 1.5, eased), lerp(0.06, 0.02, eased)];
  pose.gaze = { x: lerp(0, 14, eased), y: 0 };
  if (o.hold && f >= 34 && f < 36) pose.blink = true;
  person(ctx, BOY, pose, W * 0.4, H * 0.92, (H * 0.85) / 780);
}

// ── 6. exaggeration ──
interface FaceOpts {
  e: Expression;
}
const FACE_F = 48;
function drawFace(ctx: Ctx, W: number, H: number, frame: number, o: FaceOpts) {
  ctx.fillStyle = '#e9f2f8';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * 0.56);
  const bob = held(frame, 4) % 8 === 4 ? -4 : 0;
  ctx.translate(0, bob);
  ctx.scale(H / 900, H / 900);
  drawHead(ctx, {
    skin: '#b97a55',
    headwear: 'kumma',
    wear: '#f6f3ee',
    accent: '#0b8a3c',
    hair: '#16110e',
    expression: o.e,
    gaze: { x: 0, y: 0 },
    mouthOpen: false,
    blink: frame % 48 >= 46 && o.e !== 'happy',
    lw: 1,
  });
  ctx.restore();
}

// ── 7. shot sizes, 8. impact frames (full renderer) ──
function sceneProject(size: 'wide' | 'medium' | 'close', power = false): Project {
  return parseProject({
    cast: [BOY],
    aspect: 'portrait',
    fadeOut: false,
    shots: [{ duration: power ? 5 : 3, place: 'fort', time: 'night', size, camera: power ? 'still' : 'push', actors: [{ cast: 'b', action: power ? 'power' : 'stand', expression: power ? 'set' : 'calm', x: 0.5 }] }],
  });
}
const PROJ = { wide: sceneProject('wide'), medium: sceneProject('medium'), close: sceneProject('close'), power: sceneProject('wide', true) };
function drawShot(ctx: Ctx, W: number, H: number, frame: number, o: { size: 'wide' | 'medium' | 'close' }) {
  renderFrame(PROJ[o.size], frame, ctx, { width: W, height: H }, { noText: true });
}
const IMPACT_FROM = Math.round((POWER.release + 0.35) * 24);
const IMPACT_F = Math.round((POWER.land + 0.8) * 24) - IMPACT_FROM;
function drawImpact(ctx: Ctx, W: number, H: number, frame: number, o: { flash: boolean }) {
  let f = IMPACT_FROM + frame;
  const a = Math.round(POWER.impact * 24);
  const b = Math.ceil(POWER.land * 24);
  if (!o.flash && f >= a && f < b) f = b;
  renderFrame(PROJ.power, f, ctx, { width: W, height: H }, { noText: true });
}

export interface Lesson {
  id: string;
  title: string;
  idea: string;
  body: ReactNode;
  /** A studio description that puts the lesson into practice. */
  tryIt: string;
}

const V = <O,>(label: string, opts: O): Variant<O> => ({ label, opts });

export const LESSONS: Lesson[] = [
  {
    id: 'twos',
    tryIt: 'ولد بالدشداشة في المزرعة صباحاً يلوح لنا ويقول «الرسم على اثنين!»',
    title: 'الرسم على «اثنين»',
    idea: 'الفيديو 24 إطارًا في الثانية، لكن الأنمي يرسم غالبًا 12 رسمة فقط، وكل رسمة تبقى إطارين.',
    body: (
      <>
        <p>
          في الرسوم المتحركة اليابانية لا تُرسم الحركة في كل إطار. الرسام يضع رسمة واحدة لكل إطارين («على اثنين») أو ثلاثة. النتيجة حركة أوضح وأكثر «رسمًا»، وتوفير نصف الجهد. أما الحركات السريعة جدًا (المطر، الشرر، السيف) فتُرسم أحيانًا «على واحد».
        </p>
        <Demo frames={BOUNCE} draw={drawTwos} size={{ w: 300, h: 260 }} variants={[V('على واحد: 24 رسمة/ث', { hold: 1 }), V('على اثنين: 12 رسمة/ث', { hold: 2 }), V('على ثلاثة: 8 رسمات/ث', { hold: 3 })]} drawingsOf={(o) => marksEvery(BOUNCE, o.hold)} />
        <p className="muted small">الظلال الخفيفة خلف الكرة هي الرسمات السابقة. فعّل «حركة بطيئة» ولاحظ كيف تقفز الكرة بين الرسمات.</p>
        <Demo frames={48} draw={drawWave} size={{ w: 300, h: 340 }} variants={[V('تلويح على واحد', { hold: 1 }), V('تلويح على اثنين', { hold: 2 })]} drawingsOf={(o) => marksEvery(48, o.hold)} />
        <ul className="notes">
          <li>
            <b>لاحظ:</b> النسختان تستغرقان الوقت نفسه، لكن «على اثنين» يبدو أقرب إلى الأنمي، والحركة «على واحد» أنعم وأقرب إلى ألعاب الفيديو.
          </li>
          <li>
            <b>جرّب:</b> أوقف العرض وتقدّم إطارًا إطارًا، وعُدّ كم إطارًا تبقى كل رسمة.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'anticipation',
    tryIt: 'بنت في الحديقة صباحاً تقفز فرحاً. ثم تحتفل مع أمها.',
    title: 'التحفّز قبل الحركة',
    idea: 'قبل أي حركة قوية تتحرك الشخصية قليلًا في الاتجاه المعاكس، فيفهم المشاهد ما سيحدث.',
    body: (
      <>
        <p>قبل القفز ننحني إلى الأسفل، وقبل الرمي نرجع اليد إلى الخلف. هذا «التحفّز» يجمع الطاقة ويُعدّ عين المشاهد. بدونه تبدو القفزة مفاجئة وبلا وزن.</p>
        <Demo frames={JUMP_F} draw={drawJump} size={{ w: 260, h: 380 }} variants={[V('بلا تحفّز', { ant: 0 }), V('تحفّز 4 إطارات', { ant: 4 }), V('تحفّز مبالغ 10 إطارات', { ant: 10 })]} />
        <ul className="notes">
          <li>
            <b>لاحظ:</b> في الوسط (4 إطارات) تبدو القفزة قوية وطبيعية، وفي اليسار تبدو كوميدية ومبالغة. لكل أسلوب استعماله.
          </li>
          <li>
            <b>القاعدة في استوديو الأنمي:</b> ضربة القوة تبدأ بأربعة إطارات تحفّز ثم الانطلاق.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'spacing',
    tryIt: 'ولد يركض في الصحراء عند الغروب ثم يقف منبهراً.',
    title: 'التسارع والتباطؤ',
    idea: 'المسافة بين رسمة وأخرى هي التي تصنع السرعة: رسمات متقاربة = بطء، ومتباعدة = سرعة.',
    body: (
      <>
        <p>الخطوط السوداء تحت الكرة هي مواضع الرسمات. انظر كيف تتقارب في البداية والنهاية عند «التسارع والتباطؤ»، وتتساوى في الحركة الآلية.</p>
        <Demo frames={EASE_F} draw={drawEase} size={{ w: 320, h: 220 }} variants={[V('مسافات متساوية (آلية)', { ease: 'linear' as const }), V('يبدأ ببطء وينتهي ببطء', { ease: 'inout' as const }), V('انطلاقة سريعة ثم توقف ناعم', { ease: 'out' as const })]} drawingsOf={() => marksEvery(EASE_F, 2)} />
        <ul className="notes">
          <li>
            <b>لاحظ:</b> الحركة الآلية تبدو كأنها آلة. الأجسام الحقيقية تحتاج وقتًا لتنطلق ووقتًا لتتوقف.
          </li>
          <li>
            <b>جرّب:</b> ارسم على ورقة 7 دوائر بين نقطتين، مرة بمسافات متساوية ومرة متقاربة عند الطرفين، ثم قلّب الصفحات بسرعة.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'smear',
    tryIt: 'ولد بالدشداشة فوق قلعة نزوى ليلاً يضرب القمر بحركة قوية.',
    title: 'رسمة السرعة (Smear)',
    idea: 'عندما تكون الحركة أسرع من أن تُرى، يرسم فنان الأنمي رسمة «ممسوحة» تملأ المسافة بين الوضعين.',
    body: (
      <>
        <p>في الضربة السريعة يقفز السيف من الخلف إلى الأمام في رسمتين فقط، فتبدو كأنها «قطعت». الحل: رسمة واحدة ممطوطة أو شكل ضوئي يملأ الطريق، تظهر إطارين فقط فلا يلاحظها المشاهد، لكنه يشعر بالسرعة.</p>
        <Demo frames={SMEAR_F} draw={drawSmear} size={{ w: 300, h: 300 }} variants={[V('بلا رسمة سرعة', { smear: false }), V('مع رسمة سرعة', { smear: true })]} drawingsOf={() => marksEvery(SMEAR_F, 2)} />
        <ul className="notes">
          <li>
            <b>جرّب:</b> أوقف العرض وتقدّم إطارًا إطارًا لترى رسمة السرعة كما هي: شكل غريب وحده، لكنه سحري في الحركة.
          </li>
          <li>
            <b>في الاستوديو:</b> ضربة القوة فيها رسمتا سرعة: الانطلاق الممطوط وحلقة الدوران.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'hold',
    tryIt: 'رجل بالمصر في المجلس مساءً يشير إلى النافذة ويقول «انظروا إلى القمر».',
    title: 'الثبات بعد الحركة',
    idea: 'الأنمي يتحرك بسرعة ثم يثبت. الثبات يعطي المشاهد وقتًا ليفهم، ويجعل الحركة السابقة أقوى.',
    body: (
      <>
        <p>
          الخطأ الشائع في التحريك بالحاسوب أن الشخصية لا تتوقف عن الانزلاق، فتبدو «عائمة». في الأنمي: حركة حاسمة على اثنين، ثم ثبات نصف ثانية أو أكثر، وداخل الثبات رمشة عين أو حركة شعر صغيرة فقط.
        </p>
        <Demo frames={HOLD_F} draw={drawHold} size={{ w: 280, h: 300 }} variants={[V('انزلاق مستمر (عائم)', { hold: false }), V('حركة حاسمة ثم ثبات', { hold: true })]} />
        <ul className="notes">
          <li>
            <b>لاحظ:</b> في النسخة الثانية تنتهي الحركة في 8 إطارات ثم تثبت، ويرمش الولد داخل الثبات فيبدو حيًا.
          </li>
          <li>
            <b>القاعدة:</b> بعد الحركة اثبت 12 إطارًا على الأقل (نصف ثانية).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'exaggeration',
    tryIt: 'في الفصل طالب محرج يقول «نسيت الواجب». ثم المعلم غاضب. ثم الطلاب منبهرين.',
    title: 'المبالغة ورموز الأنمي',
    idea: 'للأنمي لغة رموز يفهمها الجميع: قطرة العرق للإحراج، وعلامة الغضب، والعيون اللامعة، وخطوط الإحباط.',
    body: (
      <>
        <p>هذه الرموز ليست واقعية، لكنها تختصر المشاعر في لقطة واحدة. استخدمها في القصص المضحكة والمواقف الخفيفة، وتجنبها في المشاهد الجادة.</p>
        <Demo frames={FACE_F} draw={drawFace} size={{ w: 220, h: 220 }} variants={[V('محرج: قطرة العرق', { e: 'embarrassed' as Expression }), V('غاضب: علامة الغضب', { e: 'angry' as Expression }), V('منبهر: عيون لامعة', { e: 'amazed' as Expression }), V('محبط: خطوط الإحباط', { e: 'gloom' as Expression }), V('خجول: احمرار', { e: 'shy' as Expression })]} />
        <ul className="notes">
          <li>
            <b>جرّب في الاستوديو:</b> اكتب «ولد محرج في الفصل» أو «بنت منبهرة في الفضاء».
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'shots',
    tryIt: 'ولد فوق قلعة نزوى ليلاً ينظر إلى القمر. ثم لقطة قريبة لوجهه وهو يبتسم.',
    title: 'حجم اللقطة يحكي القصة',
    idea: 'اللقطة الواسعة تقول «أين نحن»، والمتوسطة «من هنا»، والقريبة «بماذا يشعر».',
    body: (
      <>
        <p>المخرج يبدأ عادة بلقطة واسعة تعرّف بالمكان، ثم يقترب. الاقتراب البطيء للكاميرا يزيد التوتر. والأهم: لا تغيّر الحجم بلا سبب.</p>
        <Demo frames={72} draw={drawShot} size={{ w: 220, h: 391 }} variants={[V('واسعة', { size: 'wide' as const }), V('متوسطة', { size: 'medium' as const }), V('قريبة', { size: 'close' as const })]} />
        <ul className="notes">
          <li>
            <b>القاعدة في الاستوديو:</b> إذا بدأ وصفك بشخصية، يضيف الاستوديو لقطة واسعة قبلها تلقائيًا.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'impact',
    tryIt: 'بطل في الفضاء يضرب الكوكب بحركة قوية ليظهر عبارة إطار الصدمة',
    title: 'إطار الصدمة',
    idea: 'لحظة الضربة تُعرض في إطارات قليلة جدًا بألوان معكوسة وخطوط شعاعية، فتشعر بالقوة قبل أن تراها.',
    body: (
      <>
        <p>في أفلام الأنمي الحركية تتحول الشاشة لحظة الاصطدام إلى صورة شبه مجردة: خلفية بيضاء أو حمراء، وظلال سوداء، وخطوط تنطلق من نقطة الضربة. تدوم ستة إطارات تقريبًا، أي ربع ثانية.</p>
        <Demo frames={IMPACT_F} draw={drawImpact} size={{ w: 220, h: 391 }} variants={[V('بلا إطار صدمة', { flash: false }), V('مع إطار الصدمة', { flash: true })]} />
        <ul className="notes">
          <li>
            <b>لاحظ:</b> تتبدّل الخلفية بين الأبيض والأحمر كل إطار. أوقف العرض وتقدّم إطارًا إطارًا.
          </li>
          <li>
            <b>تنبيه صحي:</b> الوميض السريع قد يزعج المصابين بالصرع الضوئي. استخدمه في لحظة واحدة فقط.
          </li>
        </ul>
      </>
    ),
  },
];
