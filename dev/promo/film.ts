import '../../src/design/fontImports';
import { ensureFontLoaded } from '../../src/design/fonts';
import type { LayerSet } from '../../src/engine/renderer/renderFrame';
import { renderFrame } from '../../src/engine/renderer/renderFrame';
import { MOTIONS, applyMotion } from '../../src/engine/motions';
import { newCharacter, parseProject } from '../../src/domain/sanitize';
import type { Project } from '../../src/domain/types';
import * as S from './scenes';
import type { Hit } from './sound';
import {
  FPS,
  H,
  INK,
  PAPER,
  W,
  arabicNum,
  bg,
  brackets,
  clamp,
  cover,
  easeInOut,
  easeOut,
  fitSize,
  flash,
  lerp,
  logo,
  progress,
  scanlines,
  setFont,
  shake,
  slam,
  span,
  strike,
  tag,
  wipeIn,
} from './kinetic';

/**
 * The promo film for anime.kamirtyai.com: Arabic kinetic typography in black and white,
 * cut against anime shots that the studio's own renderer draws, frame by frame.
 * Every frame is a pure function of time, so the render is repeatable.
 */

export const DURATION = 31;
export const FRAMES = Math.round(DURATION * FPS);

const T = {
  hook1: 0.35,
  hook2: 1.05,
  flash1: 1.72,
  m1: 1.75,
  m2: 2.55,
  m3: 3.35,
  neg1: 4.4,
  neg2: 5.1,
  neg3: 5.8,
  invert: 6.5,
  box: 7.35,
  type: 7.7,
  enter: 9.85,
  hero: 10.0,
  f1: 14.1,
  f2: 16.2,
  f3: 18.3,
  f4: 20.4,
  f5: 22.5,
  party: 24.6,
  cta: 26.8,
};

export const HITS: Hit[] = [
  { t: T.hook1 - 0.18, kind: 'whoosh' },
  { t: T.hook1, kind: 'kick' },
  { t: T.hook2 - 0.18, kind: 'whoosh' },
  { t: T.hook2, kind: 'kick' },
  { t: T.flash1, kind: 'impact', gain: 0.9 },
  { t: T.m2, kind: 'tick', gain: 2 },
  { t: T.m3, kind: 'tick', gain: 2 },
  { t: T.neg1 - 0.16, kind: 'whoosh', gain: 0.8 },
  { t: T.neg1, kind: 'kick' },
  { t: T.neg2 - 0.16, kind: 'whoosh', gain: 0.8 },
  { t: T.neg2, kind: 'kick' },
  { t: T.neg3 - 0.16, kind: 'whoosh', gain: 0.8 },
  { t: T.neg3, kind: 'kick' },
  { t: T.invert, kind: 'impact', gain: 0.7 },
  { t: T.box, kind: 'kick', gain: 0.6 },
  { t: T.enter - 1, kind: 'riser' },
  { t: T.enter, kind: 'impact' },
  { t: T.hero + 2.1, kind: 'impact', gain: 1.1 },
  { t: T.party, kind: 'impact', gain: 0.8 },
  { t: T.cta, kind: 'sting' },
  { t: T.cta + 0.1, kind: 'kick' },
  // the beat under the feature run
  ...Array.from({ length: 22 }, (_, i) => ({ t: T.f1 + i * 0.475, kind: 'hat' as const, gain: i % 2 ? 0.7 : 1 })),
  ...Array.from({ length: 11 }, (_, i) => ({ t: T.f1 + i * 0.95, kind: 'kick' as const, gain: 0.75 })),
  ...[T.f1, T.f2, T.f3, T.f4, T.f5].map((t) => ({ t: t - 0.15, kind: 'whoosh' as const, gain: 0.7 })),
  ...[T.f1, T.f2, T.f3, T.f4, T.f5].map((t) => ({ t, kind: 'sub' as const, gain: 0.8 })),
  // typing clicks
  ...Array.from({ length: 24 }, (_, i) => ({ t: T.type + i * 0.07, kind: 'tick' as const, gain: 0.8 })),
];

const off = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const stage = off(W, H);
const stageCtx = stage.getContext('2d')!;
const thumbs: { poses: HTMLCanvasElement[]; places: HTMLCanvasElement[]; layers: HTMLCanvasElement[] } = { poses: [], places: [], layers: [] };

/** Draws one project frame onto the shared stage canvas and returns it. */
function clip(p: Project, second: number): HTMLCanvasElement {
  renderFrame(p, Math.max(0, Math.round(second * 24)), stageCtx, { width: W, height: H });
  return stage;
}

/** Six motions from the library, each on a different character in a different place. */
const POSE_CARDS: { id: string; kind: 'boy' | 'girl' | 'man' | 'woman'; outfit: string; place: string; time: string }[] = [
  { id: 'dua', kind: 'man', outfit: 'massar', place: 'mountains', time: 'sunset' },
  { id: 'read', kind: 'girl', outfit: 'school', place: 'classroom', time: 'day' },
  { id: 'victory', kind: 'boy', outfit: 'dishdasha', place: 'fort', time: 'night' },
  { id: 'flagraise', kind: 'boy', outfit: 'school', place: 'city', time: 'day' },
  { id: 'serve', kind: 'man', outfit: 'dishdasha', place: 'home', time: 'night' },
  { id: 'explain', kind: 'woman', outfit: 'abaya', place: 'farm', time: 'day' },
];

export async function init(): Promise<void> {
  await ensureFontLoaded('cairo');
  await ensureFontLoaded('reemkufi');
  await document.fonts.ready;
  // six poses from the motion library, each drawn by the studio itself
  for (const card of POSE_CARDS) {
    const base = parseProject({
      aspect: 'portrait',
      cast: [{ ...newCharacter(card.kind, card.outfit as never, 'س'), id: 'b' }],
      shots: [{ id: 's1', duration: 3, place: card.place, time: card.time, size: 'medium', camera: 'still', actors: [{ cast: 'b', action: 'stand', x: 0.5 }], effects: [], transition: 'cut' }],
    });
    const c = off(320, 440);
    renderFrame(applyMotion(base, 0, card.id), 66, c.getContext('2d')!, { width: 320, height: 440 }, { noText: true });
    thumbs.poses.push(c);
  }
  void MOTIONS;
  for (const p of S.places) {
    const c = off(300, 420);
    renderFrame(p, 30, c.getContext('2d')!, { width: 300, height: 420 }, { noText: true });
    thumbs.places.push(c);
  }
  const sets: LayerSet[] = [
    { bg: true, chars: false, fx: false, text: false },
    { bg: false, chars: true, fx: false, text: false, background: 'clear' },
    { bg: false, chars: false, fx: true, text: true, background: 'clear' },
  ];
  for (const layers of sets) {
    const c = off(540, 960);
    renderFrame(S.beach, 40, c.getContext('2d')!, { width: 540, height: 960 }, { layers });
    thumbs.layers.push(c);
  }
}

/** A hard two-frame flash on a cut. */
const cutFlash = (ctx: Ctx2, t: number, at: number) => flash(ctx, span(t, at, at + 0.1));
type Ctx2 = CanvasRenderingContext2D;

function footer(ctx: Ctx2, text: string, alpha = 0.75) {
  ctx.save();
  ctx.globalAlpha = alpha;
  setFont(ctx, 34);
  ctx.fillStyle = PAPER;
  ctx.fillText(text, W / 2, H - 92);
  ctx.restore();
}

function montage(ctx: Ctx2, t: number) {
  const beats: [number, number, Project, string, number][] = [
    [T.m1, T.m2, S.classroom, 'الفصل · نهارًا', 1.2],
    [T.m2, T.m3, S.beach, 'البحر · غروبًا', 1.1],
    [T.m3, T.neg1 - 0.1, S.desert, 'الصحراء · ركض', 0.9],
  ];
  for (const [a, b, project, label, start] of beats) {
    if (t < a || t >= b) continue;
    const k = span(t, a, b);
    cover(ctx, clip(project, start + (t - a)), 0, 0, W, H);
    scanlines(ctx, 0, 0, W, H, 0.07);
    brackets(ctx, 60, 300, W - 120, H - 700, span(t, a, a + 0.25), 90, 8);
    tag(ctx, label, W / 2, 1420, span(t, a + 0.1, a + 0.3), 38);
    footer(ctx, 'كل لقطة هنا رسمتها الأداة نفسها', 0.55 + 0.2 * Math.sin(k * 6));
    cutFlash(ctx, t, a);
  }
}

function features(ctx: Ctx2, t: number) {
  // ١٠٠ حركة
  if (t >= T.f1 && t < T.f2) {
    const k = span(t, T.f1, T.f1 + 0.7);
    const n = Math.round(easeOut(k) * 100);
    ctx.save();
    shake(ctx, (1 - clamp(span(t, T.f1, T.f1 + 0.2))) * 8, 11);
    setFont(ctx, 230, 'Cairo');
    ctx.fillStyle = PAPER;
    ctx.fillText(arabicNum(n), W / 2, 420);
    slam(ctx, 'حركة جاهزة', { y: 620, size: 96, k: span(t, T.f1 + 0.15, T.f1 + 0.5) });
    const grid = span(t, T.f1 + 0.25, T.f1 + 1.5);
    thumbs.poses.forEach((c, i) => {
      const kk = clamp((grid * 6 - i) / 1.2);
      if (kk <= 0) return;
      const col = i % 3;
      const row = Math.floor(i / 3);
      const w = 320;
      const h = 440;
      const x = W / 2 + (1 - col) * (w + 18) - w / 2;
      const y = 800 + row * (h + 20);
      ctx.save();
      ctx.globalAlpha = kk;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(lerp(0.75, 1, easeOut(kk)), lerp(0.75, 1, easeOut(kk)));
      cover(ctx, c, -w / 2, -h / 2, w, h, 12);
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    });
    ctx.restore();
    cutFlash(ctx, t, T.f1);
  }
  // الأماكن والأوقات
  if (t >= T.f2 && t < T.f3) {
    slam(ctx, '٩ أماكن × ٣ أوقات', { y: 420, size: 108, k: span(t, T.f2, T.f2 + 0.4) });
    const grid = span(t, T.f2 + 0.15, T.f2 + 1.4);
    thumbs.places.forEach((c, i) => {
      const kk = clamp((grid * 9 - i) / 1.1);
      if (kk <= 0) return;
      const col = i % 3;
      const row = Math.floor(i / 3);
      const w = 290;
      const h = 400;
      const x = W / 2 + (1 - col) * (w + 18) - w / 2;
      const y = 620 + row * (h + 18);
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((1 - easeOut(kk)) * 0.25);
      ctx.scale(easeOut(kk), easeOut(kk));
      cover(ctx, c, -w / 2, -h / 2, w, h, 12);
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    });
    cutFlash(ctx, t, T.f2);
  }
  // الصوت
  if (t >= T.f3 && t < T.f4) {
    slam(ctx, 'أصوات بلا حقوق', { y: 700, size: 120, k: span(t, T.f3, T.f3 + 0.4) });
    wipeIn(ctx, 'مولّدة بالكود داخل متصفحك', 860, span(t, T.f3 + 0.3, T.f3 + 0.9), 56);
    const k = t - T.f3;
    ctx.save();
    ctx.fillStyle = PAPER;
    const bars = 42;
    for (let i = 0; i < bars; i++) {
      const p = i / (bars - 1);
      const env = Math.sin(p * Math.PI);
      const a = Math.sin(k * 9 + i * 0.7) * 0.5 + Math.sin(k * 15 + i * 0.31) * 0.5;
      const hgt = 40 + Math.abs(a) * env * 320 * clamp(span(t, T.f3 + 0.2, T.f3 + 0.6));
      const x = W * 0.1 + p * W * 0.8;
      ctx.fillRect(x - 7, 1180 - hgt / 2, 14, hgt);
    }
    ctx.restore();
    tag(ctx, 'ريح · موج · طبول · ألعاب نارية', W / 2, 1480, span(t, T.f3 + 0.5, T.f3 + 0.8), 40);
    cutFlash(ctx, t, T.f3);
  }
  // الطبقات
  if (t >= T.f4 && t < T.f5) {
    slam(ctx, 'طبقات للمونتاج', { y: 380, size: 120, k: span(t, T.f4, T.f4 + 0.4) });
    const k = easeOut(span(t, T.f4 + 0.2, T.f4 + 1.3));
    const labels = ['الخلفية', 'الشخصيات', 'المؤثرات والنص'];
    thumbs.layers.forEach((c, i) => {
      const w = 470;
      const h = 835;
      const x = W / 2 - w / 2 + (i - 1) * 60 * k;
      const y = 640 + (i - 1) * 150 * k;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-0.06 * k);
      ctx.globalAlpha = 0.35 + 0.65 * clamp(k * 2 - i * 0.2);
      ctx.fillStyle = INK;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      cover(ctx, c, -w / 2, -h / 2, w, h, 10);
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = clamp(k * 2 - i * 0.2);
      setFont(ctx, 36);
      ctx.fillStyle = PAPER;
      ctx.textAlign = 'right';
      ctx.fillText(labels[i], W - 70, y + h / 2 + (i - 1) * 40);
      ctx.textAlign = 'center';
      ctx.restore();
    });
    cutFlash(ctx, t, T.f4);
  }
  // التصدير
  if (t >= T.f5 && t < T.party) {
    slam(ctx, 'فيديو MP4', { y: 680, size: 150, k: span(t, T.f5, T.f5 + 0.4) });
    wipeIn(ctx, 'بضغطة واحدة، من المتصفح', 840, span(t, T.f5 + 0.25, T.f5 + 0.9), 56);
    progress(ctx, 1080, span(t, T.f5 + 0.4, T.f5 + 1.7), 'يُصدَّر');
    const done = t > T.f5 + 1.75;
    if (done) slam(ctx, '✓ جاهز', { y: 1320, size: 90, k: span(t, T.f5 + 1.75, T.f5 + 1.95) });
    tag(ctx, 'بلا خادم · بلا رفع · ملفك يبقى عندك', W / 2, 1520, span(t, T.f5 + 0.8, T.f5 + 1.1), 38);
    cutFlash(ctx, t, T.f5);
  }
}

export function draw(ctx: Ctx2, frame: number): void {
  const t = frame / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  bg(ctx, INK);

  // ── the hook ──
  if (t < T.m1) {
    brackets(ctx, 80, 560, W - 160, 820, span(t, 0.05, 0.45), 110, 9);
    if (t >= T.hook1) slam(ctx, 'جملة واحدة.', { y: 820, size: 150, k: span(t, T.hook1, T.hook1 + 0.35), out: span(t, T.flash1 - 0.06, T.flash1) });
    if (t >= T.hook2) slam(ctx, 'تصير أنمي.', { y: 1080, size: 170, k: span(t, T.hook2, T.hook2 + 0.35), out: span(t, T.flash1 - 0.06, T.flash1) });
    footer(ctx, 'استوديو الأنمي العربي', clamp(span(t, 0.3, 0.9)) * 0.6);
  }

  // ── what it makes ──
  montage(ctx, t);

  // ── what it does not ask of you ──
  if (t >= T.neg1 && t < T.invert) {
    const rows: [number, string, number][] = [
      [T.neg1, 'بلا برامج', 700],
      [T.neg2, 'بلا تحميل', 980],
      [T.neg3, 'بلا اشتراك', 1260],
    ];
    for (const [at, text, y] of rows) {
      if (t < at) continue;
      const k = span(t, at, at + 0.3);
      slam(ctx, text, { y, size: 140, k });
      if (t > at + 0.3) {
        const size = fitSize(ctx, text, W * 0.88, 140);
        strike(ctx, text, y, span(t, at + 0.3, at + 0.55), size);
      }
    }
    ctx.save();
    shake(ctx, Math.max(0, 10 - (t - T.neg3) * 40), 3);
    ctx.restore();
  }

  // ── your browser is enough ──
  if (t >= T.invert && t < T.box) {
    bg(ctx, PAPER);
    slam(ctx, 'متصفحك يكفي.', { y: H / 2 - 60, size: 180, k: span(t, T.invert, T.invert + 0.35), color: INK });
    wipeIn(ctx, 'افتح الرابط واكتب. هذا كل شيء.', H / 2 + 140, span(t, T.invert + 0.3, T.invert + 0.8), 62, INK);
    logo(ctx, W / 2, H - 420, 0.7, span(t, T.invert + 0.2, T.invert + 0.7), INK);
  }

  // ── describe the scene ──
  if (t >= T.box && t < T.hero) {
    tag(ctx, '١ — صِف المشهد بالعربية', W / 2, 520, span(t, T.box, T.box + 0.3), 44);
    const k = easeOut(span(t, T.box, T.box + 0.35));
    const bw = W * 0.86;
    const bh = 340;
    const bx = (W - bw) / 2;
    const by = 700;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(bx, by + (1 - k) * 40, bw, bh, 18);
    ctx.stroke();
    const line = 'ولد عُماني فوق قلعة نزوى ليلاً يضرب القمر';
    const n = Math.round(clamp(span(t, T.type, T.type + 1.6)) * line.length);
    const shown = line.slice(0, n);
    const fs = fitSize(ctx, line, bw - 90, 54);
    setFont(ctx, fs);
    ctx.textAlign = 'right';
    ctx.fillStyle = PAPER;
    ctx.fillText(shown, bx + bw - 40, by + 120);
    const wv = ctx.measureText(shown).width;
    if (Math.floor(t * 3) % 2 === 0 || n < line.length) ctx.fillRect(bx + bw - 44 - wv, by + 120 - fs / 2, 5, fs);
    ctx.textAlign = 'center';
    // the enter key, stamped when the line is done
    const ek = span(t, T.enter - 0.45, T.enter - 0.2);
    if (ek > 0) {
      ctx.globalAlpha = k;
      setFont(ctx, 46);
      const label = '⏎  اصنع المشهد';
      const tw = ctx.measureText(label).width + 90;
      ctx.save();
      ctx.translate(W / 2, by + 250);
      ctx.scale(lerp(1.3, 1, easeOut(ek)), lerp(1.3, 1, easeOut(ek)));
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -38, tw, 76, 12);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(label, 0, 2);
      ctx.restore();
    }
    ctx.restore();
    // the riser pulls the frame in before the reveal
    const pull = span(t, T.enter - 0.8, T.enter);
    if (pull > 0) {
      ctx.save();
      ctx.globalAlpha = pull * 0.9;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, H * 0.5 * easeIn2(pull));
      ctx.fillRect(0, H - H * 0.5 * easeIn2(pull), W, H * 0.5 * easeIn2(pull));
      ctx.restore();
    }
  }

  // ── the payoff: the scene it just described ──
  if (t >= T.hero && t < T.f1) {
    const local = t - T.hero;
    cover(ctx, clip(S.hero, 0.45 + local), 0, 0, W, H);
    scanlines(ctx, 0, 0, W, H, 0.06);
    ctx.save();
    shake(ctx, Math.max(0, 26 - Math.abs(local - 2.1) * 120), 7);
    ctx.restore();
    brackets(ctx, 50, 240, W - 100, H - 560, span(t, T.hero, T.hero + 0.3), 90, 8);
    tag(ctx, 'نفس الجملة… صارت مشهدًا', W / 2, 1500, span(t, T.hero + 0.2, T.hero + 0.5), 42);
    footer(ctx, 'صوت ومؤثرات وحركة كاميرا — تلقائيًا', 0.7);
    flash(ctx, span(t, T.hero, T.hero + 0.18));
    if (local > 2.05) flash(ctx, span(t, T.hero + 2.1, T.hero + 2.3));
  }

  // ── what is inside ──
  features(ctx, t);

  // ── free ──
  if (t >= T.party && t < T.cta) {
    cover(ctx, clip(S.celebrate, 0.4 + (t - T.party)), 0, 0, W, H);
    scanlines(ctx, 0, 0, W, H, 0.06);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 560, W, 520);
    ctx.restore();
    slam(ctx, 'وكل هذا…', { y: 700, size: 110, k: span(t, T.party + 0.1, T.party + 0.4) });
    slam(ctx, 'مجانًا', { y: 920, size: 210, k: span(t, T.party + 0.5, T.party + 0.85) });
    cutFlash(ctx, t, T.party);
  }

  // ── the invitation ──
  if (t >= T.cta) {
    const k0 = span(t, T.cta, T.cta + 0.4);
    logo(ctx, W / 2, 620, 1.05, k0);
    slam(ctx, 'استوديو الأنمي العربي', { y: 980, size: 120, k: span(t, T.cta + 0.25, T.cta + 0.6), family: 'Reem Kufi' });
    wipeIn(ctx, 'اكتب بالعربية · شاهد · نزّل الفيديو', 1120, span(t, T.cta + 0.6, T.cta + 1.2), 56);
    const uk = span(t, T.cta + 1.1, T.cta + 1.5);
    if (uk > 0) {
      const e = easeOut(uk);
      ctx.save();
      ctx.translate(W / 2, 1360);
      ctx.scale(lerp(1.25, 1, e), lerp(1.25, 1, e));
      setFont(ctx, 72, 'Cairo');
      ctx.direction = 'ltr';
      const label = 'anime.kamirtyai.com';
      const tw = ctx.measureText(label).width + 110;
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -62, tw, 124, 16);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(label, 0, 4);
      ctx.restore();
    }
    const gk = span(t, T.cta + 1.7, T.cta + 2.05);
    if (gk > 0) {
      slam(ctx, 'جرّبها الآن', { y: 1600, size: 110, k: gk });
      if (Math.floor(t * 2.6) % 2 === 0) {
        ctx.fillStyle = PAPER;
        ctx.fillRect(W / 2 - 250, 1670, 500, 5);
      }
    }
    footer(ctx, 'Kamirty.ai', 0.5);
  }
}

/** A sharper ease for the frame pulling in. */
function easeIn2(t: number): number {
  return clamp(t) * clamp(t);
}

void easeInOut;
