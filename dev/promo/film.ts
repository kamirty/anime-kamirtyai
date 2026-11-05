import '../../src/design/fontImports';
import { ensureFontLoaded } from '../../src/design/fonts';
import { newCharacter, parseProject } from '../../src/domain/sanitize';
import type { Project } from '../../src/domain/types';
import { applyMotion } from '../../src/engine/motions';
import type { LayerSet } from '../../src/engine/renderer/renderFrame';
import { renderFrame } from '../../src/engine/renderer/renderFrame';
import * as S from './scenes';
import type { Hit } from './sound';
import {
  type Ctx,
  F,
  FPS,
  H,
  INK,
  PAPER,
  W,
  arabicNum,
  bg,
  block,
  brackets,
  chrome,
  clamp,
  cover,
  easeOut,
  fit,
  pop,
  lerp,
  logo,
  progress,
  setFont,
  shake,
  slashX,
  span,
  strike,
  tag,
  texture,
  vignette,
  word,
} from './kinetic';

/**
 * The promo film for anime.kamirtyai.com.
 *
 * Cut like the reels it is modelled on: a word every four or five frames, each smearing in and
 * stopping dead, blocks of words ripped away, the frame inverting, a hard flash on every cut and
 * never a still moment. The anime between the words is drawn by the studio's own renderer, so
 * the advert only ever shows what the tool actually makes.
 */

export const DURATION = 23.6;
export const FRAMES = Math.round(DURATION * FPS);

/** Cut points, in seconds. */
const C = {
  hook: 0.1,
  hook2: 0.98,
  shot1: 1.5,
  shot2: 2.05,
  shot3: 2.6,
  shot4: 3.15,
  neg: 3.72,
  slash: 4.6,
  enough: 5.05,
  type: 5.45,
  typeStart: 5.72,
  enter: 7.15,
  boom: 7.95,
  hero: 8.0,
  impact: 10.05,
  f1: 11.0,
  f2: 12.44,
  f3: 13.88,
  f4: 15.32,
  f5: 16.76,
  free: 18.2,
  cta: 19.9,
  blink: 22.2,
  back: 22.55,
};

const SENTENCE = 'ولد عُماني فوق قلعة نزوى ليلاً يضرب القمر';

export const HITS: Hit[] = [
  { t: C.hook, kind: 'kick' },
  { t: C.hook + 0.18, kind: 'kick', gain: 0.85 },
  { t: C.hook + 0.36, kind: 'impact', gain: 0.6 },
  { t: C.hook2, kind: 'kick' },
  { t: C.hook2 + 0.18, kind: 'impact', gain: 0.75 },
  ...[C.shot1, C.shot2, C.shot3, C.shot4].map((t) => ({ t, kind: 'impact' as const, gain: 0.6 })),
  ...[C.shot1, C.shot2, C.shot3, C.shot4].map((t) => ({ t: t - 0.12, kind: 'whoosh' as const, gain: 0.6 })),
  { t: C.neg, kind: 'kick' },
  { t: C.neg + 0.18, kind: 'kick', gain: 0.9 },
  { t: C.neg + 0.36, kind: 'kick', gain: 0.9 },
  { t: C.slash, kind: 'whoosh' },
  { t: C.slash + 0.16, kind: 'whoosh', gain: 0.8 },
  { t: C.enough - 0.1, kind: 'impact' },
  { t: C.type, kind: 'kick', gain: 0.6 },
  ...Array.from({ length: 20 }, (_, i) => ({ t: C.typeStart + i * 0.07, kind: 'tick' as const, gain: 0.9 })),
  { t: C.enter, kind: 'kick' },
  { t: C.boom - 1, kind: 'riser' },
  { t: C.boom, kind: 'impact', gain: 1.15 },
  { t: 8.15, kind: 'tick', gain: 1.5 },
  { t: 8.33, kind: 'tick', gain: 1.5 },
  { t: C.impact, kind: 'impact', gain: 1.2 },
  ...[C.f1, C.f2, C.f3, C.f4, C.f5].map((t) => ({ t, kind: 'impact' as const, gain: 0.6 })),
  ...[C.f1, C.f2, C.f3, C.f4, C.f5].flatMap((t) => [
    { t: t + 0.18, kind: 'kick' as const, gain: 0.7 },
    { t: t - 0.1, kind: 'whoosh' as const, gain: 0.55 },
  ]),
  ...Array.from({ length: 30 }, (_, i) => ({ t: C.f1 + i * 0.24, kind: 'hat' as const, gain: i % 2 ? 0.55 : 0.85 })),
  ...Array.from({ length: 15 }, (_, i) => ({ t: C.f1 + i * 0.48, kind: 'kick' as const, gain: 0.6 })),
  { t: C.free, kind: 'impact', gain: 0.95 },
  { t: C.free + 0.35, kind: 'kick' },
  { t: C.cta, kind: 'sting' },
  { t: C.cta, kind: 'kick' },
  { t: C.cta + 0.25, kind: 'kick', gain: 0.85 },
  { t: C.cta + 0.43, kind: 'kick', gain: 0.85 },
  { t: C.cta + 0.61, kind: 'impact', gain: 0.7 },
  { t: C.blink, kind: 'whoosh', gain: 0.75 },
  { t: C.back, kind: 'kick', gain: 0.85 },
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

/** Draws one project second onto the shared stage and returns it. */
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
  for (const f of ['cairo', 'reemkufi', 'lalezar', 'baloo', 'tajawal', 'marhey']) await ensureFontLoaded(f);
  await document.fonts.ready;
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
  for (const p of S.places) {
    const c = off(320, 440);
    renderFrame(p, 30, c.getContext('2d')!, { width: 320, height: 440 }, { noText: true });
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

/** A two-frame white flash on a cut. */
const cut = (ctx: Ctx, t: number, at: number) => pop(ctx, t, at, 2);

/** A clip filling the frame, always pushing in, with a label and a viewfinder. */
function shot(ctx: Ctx, t: number, at: number, dur: number, p: Project, from: number, label: string, zoom = 1.14) {
  const k = span(t, at, at + dur);
  cover(ctx, clip(p, from + (t - at)), 0, 0, W, H, lerp(1, zoom, k));
  vignette(ctx, 0.45);
  brackets(ctx, 54, 300, W - 108, H - 760, span(t, at, at + 4 * F), 80, 8);
  tag(ctx, label, W / 2, H - 330, t - at - 0.06, 40);
  cut(ctx, t, at);
}

/** Thumbnails punching in one after another. */
function grid(ctx: Ctx, t: number, at: number, cards: HTMLCanvasElement[], top: number, spin = false) {
  const w = 320;
  const h = 440;
  cards.forEach((c, i) => {
    const kk = clamp((t - at - 0.1 - i * 0.07) / 0.16);
    if (kk <= 0) return;
    const e = easeOut(kk);
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = W / 2 + (1 - col) * (w + 16) - w / 2;
    const y = top + row * (h + 16);
    ctx.save();
    ctx.translate(x + w / 2 + (1 - e) * 130, y + h / 2);
    if (spin) ctx.rotate((1 - e) * 0.3);
    ctx.scale(lerp(1.3, 1, e), lerp(1.3, 1, e));
    ctx.globalAlpha = clamp(kk * 2);
    cover(ctx, c, -w / 2, -h / 2, w, h, 1, 10);
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 4;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  });
}

export function draw(ctx: Ctx, frame: number): void {
  const t = frame / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const inverted = t >= C.neg && t < C.enough;
  bg(ctx, inverted ? PAPER : INK);

  ctx.save();
  // the whole frame breathes and twitches; harder while the beat runs
  shake(ctx, t > C.f1 && t < C.free ? 2.6 : 1.2, Math.floor(t * 30));

  // ── 1. the hook ──
  if (t < C.shot1) {
    block(
      ctx,
      t,
      [
        { t: C.hook, text: 'جملة', y: 680, size: 240, family: 'Lalezar', align: 'r' },
        { t: C.hook + 0.18, text: 'عربية', y: 900, size: 240, family: 'Lalezar', look: 'outline', align: 'l' },
        { t: C.hook + 0.36, text: 'واحدة', y: 1125, size: 240, family: 'Lalezar', em: true, align: 'r' },
      ],
      0.84,
    );
    block(
      ctx,
      t,
      [
        { t: C.hook2, text: 'تصير', y: 820, size: 240, family: 'Baloo Bhaijaan 2', look: 'extrude', align: 'l' },
        { t: C.hook2 + 0.18, text: 'أنمي', y: 1090, size: 300, family: 'Lalezar', em: true },
      ],
      1.42,
    );
  }

  // ── 2. four shots, hard cuts ──
  if (t >= C.shot1 && t < C.neg) {
    if (t < C.shot2) shot(ctx, t, C.shot1, 0.55, S.hero, 1.75, 'قلعة · ليلاً');
    else if (t < C.shot3) shot(ctx, t, C.shot2, 0.55, S.classroom, 1.2, 'فصل · نهارًا');
    else if (t < C.shot4) shot(ctx, t, C.shot3, 0.55, S.beach, 1.1, 'بحر · غروبًا');
    else shot(ctx, t, C.shot4, 0.57, S.desert, 0.9, 'صحراء · ركض');
    ctx.save();
    setFont(ctx, 40);
    ctx.fillStyle = PAPER;
    ctx.globalAlpha = 0.9;
    ctx.fillText('كل لقطة رسمتها الأداة نفسها', W / 2, H - 200);
    ctx.restore();
  }

  // ── 3. what it never asks of you ──
  if (inverted) {
    const rows: [number, string, number][] = [
      [C.neg, 'بلا برامج', 700],
      [C.neg + 0.18, 'بلا تحميل', 950],
      [C.neg + 0.36, 'بلا اشتراك', 1200],
    ];
    const out = span(t, C.slash + 0.3, C.slash + 0.3 + 5 * F);
    for (const [at, text, y] of rows) {
      if (t < at) continue;
      word(ctx, text, W / 2, y, t - at, out, { size: 190, color: INK, on: PAPER, family: 'Lalezar' });
      const sk = span(t, at + 0.42, at + 0.6);
      if (sk > 0 && out < 1) {
        const size = fit(ctx, text, W * 0.92, 190, 'Lalezar');
        setFont(ctx, size, 'Lalezar');
        strike(ctx, ctx.measureText(text).width / 2 + 20, y + 6, sk, INK);
      }
    }
    if (t >= C.slash && out < 1) slashX(ctx, W / 2, 950, 430, span(t, C.slash, C.slash + 0.3), INK, 26);
    cut(ctx, t, C.neg);
  }

  // ── 4. your browser is enough ──
  if (t >= C.enough && t < C.type + 0.1) {
    block(ctx, t, [{ t: C.enough, text: 'متصفحك يكفي', y: 960, size: 185, em: true, family: 'Baloo Bhaijaan 2' }], C.type - 0.02);
    cut(ctx, t, C.enough);
  }

  // ── 5. describe it in Arabic ──
  if (t >= C.type && t < C.boom) {
    tag(ctx, 'اكتب بالعربية', W / 2, 560, t - C.type, 46);
    const k = easeOut(clamp((t - C.type) / 0.14));
    const bw = W * 0.88;
    const bh = 330;
    const bx = (W - bw) / 2;
    const by = 720;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(bx + (1 - k) * 90, by, bw, bh, 18);
    ctx.stroke();
    const n = Math.round(clamp((t - C.typeStart) / 1.35) * SENTENCE.length);
    const shown = SENTENCE.slice(0, n);
    const fs = fit(ctx, SENTENCE, bw - 90, 56);
    setFont(ctx, fs);
    ctx.textAlign = 'right';
    ctx.fillStyle = PAPER;
    ctx.fillText(shown, bx + bw - 44, by + 118);
    const wv = ctx.measureText(shown).width;
    if (n < SENTENCE.length || Math.floor(t * 6) % 2 === 0) ctx.fillRect(bx + bw - 48 - wv, by + 118 - fs / 2, 6, fs);
    ctx.textAlign = 'center';
    ctx.restore();
    if (t >= C.enter) {
      const e = easeOut(clamp((t - C.enter) / 0.12));
      setFont(ctx, 50);
      const label = '⏎  اصنع المشهد';
      const tw = ctx.measureText(label).width + 100;
      ctx.save();
      ctx.translate(W / 2, by + 250);
      ctx.scale(lerp(1.4, 1, e), lerp(1.4, 1, e));
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -42, tw, 84, 12);
      ctx.fill();
      ctx.fillStyle = INK;
      setFont(ctx, 50);
      ctx.fillText(label, 0, 2);
      ctx.restore();
    }
    // the frame squeezes shut before the reveal
    const pull = span(t, C.boom - 0.55, C.boom);
    if (pull > 0) {
      const g = easeOut(pull) * H * 0.52;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, g);
      ctx.fillRect(0, H - g, W, g);
    }
    cut(ctx, t, C.type);
  }

  // ── 6. the payoff ──
  if (t >= C.hero && t < C.f1) {
    const local = t - C.hero;
    cover(ctx, clip(S.hero, 0.5 + local), 0, 0, W, H, lerp(1.04, 1.2, span(t, C.hero, C.f1)));
    vignette(ctx, 0.4);
    ctx.restore();
    ctx.save();
    shake(ctx, Math.max(0, 34 - Math.abs(local - 2.05) * 150), Math.floor(t * 40));
    brackets(ctx, 46, 250, W - 92, H - 700, span(t, C.hero, C.hero + 4 * F), 80, 8);
    block(
      ctx,
      t,
      [
        { t: 8.15, text: 'نفس الجملة', y: 1320, size: 120, family: 'Tajawal', align: 'r' },
        { t: 8.33, text: 'صارت مشهدًا', y: 1490, size: 135, em: true, family: 'Lalezar', align: 'l' },
      ],
      8.9,
    );
    block(
      ctx,
      t,
      [
        { t: 10.3, text: 'صوت', y: 1320, size: 120, family: 'Tajawal', align: 'r' },
        { t: 10.48, text: 'ومؤثرات', y: 1490, size: 135, em: true, family: 'Lalezar', align: 'l' },
      ],
      10.9,
    );
    pop(ctx, t, C.hero, 3);
    pop(ctx, t, C.impact, 3);
  }

  // ── 7. what is inside ──
  if (t >= C.f1 && t < C.free) {
    if (t < C.f2) {
      const k = span(t, C.f1, C.f1 + 0.55);
      setFont(ctx, 240);
      ctx.fillStyle = PAPER;
      ctx.fillText(arabicNum(easeOut(k) * 100), W / 2, 430);
      block(ctx, t, [{ t: C.f1 + 0.18, text: 'حركة جاهزة', y: 650, size: 135, em: true, family: 'Baloo Bhaijaan 2' }], C.f2 - 0.1);
      grid(ctx, t, C.f1, thumbs.poses, 810);
      cut(ctx, t, C.f1);
    } else if (t < C.f3) {
      block(
        ctx,
        t,
        [
          { t: C.f2, text: '٩ أماكن', y: 390, size: 165, family: 'Lalezar', align: 'r' },
          { t: C.f2 + 0.18, text: '٣ أوقات', y: 610, size: 165, em: true, family: 'Lalezar', align: 'l' },
        ],
        C.f3 - 0.1,
      );
      grid(ctx, t, C.f2, thumbs.places, 790, true);
      cut(ctx, t, C.f2);
    } else if (t < C.f4) {
      block(
        ctx,
        t,
        [
          { t: C.f3, text: 'أصوات', y: 620, size: 190, family: 'Lalezar', look: 'extrude', align: 'r' },
          { t: C.f3 + 0.18, text: 'بلا حقوق', y: 850, size: 165, em: true, family: 'Baloo Bhaijaan 2', align: 'l' },
        ],
        C.f4 - 0.1,
      );
      const k = t - C.f3;
      ctx.save();
      ctx.fillStyle = PAPER;
      const bars = 46;
      for (let i = 0; i < bars; i++) {
        const p = i / (bars - 1);
        const e = Math.sin(p * Math.PI);
        const a = Math.sin(k * 11 + i * 0.7) * 0.5 + Math.sin(k * 19 + i * 0.31) * 0.5;
        const hgt = 30 + Math.abs(a) * e * 420 * clamp(span(t, C.f3 + 0.1, C.f3 + 0.3));
        ctx.fillRect(W * 0.08 + p * W * 0.84 - 7, 1260 - hgt / 2, 15, hgt);
      }
      ctx.restore();
      tag(ctx, 'ريح · موج · طبول · ألعاب نارية', W / 2, 1580, t - C.f3 - 0.3, 42);
      cut(ctx, t, C.f3);
    } else if (t < C.f5) {
      block(
        ctx,
        t,
        [
          { t: C.f4, text: 'طبقات', y: 350, size: 180, family: 'Lalezar', align: 'r' },
          { t: C.f4 + 0.18, text: 'للمونتاج', y: 570, size: 155, em: true, family: 'Baloo Bhaijaan 2', align: 'l' },
        ],
        C.f5 - 0.1,
      );
      const k = easeOut(span(t, C.f4 + 0.15, C.f4 + 0.7));
      const labels = ['الخلفية', 'الشخصيات', 'المؤثرات والنص'];
      thumbs.layers.forEach((c, i) => {
        const w = 460;
        const h = 818;
        const x = W / 2 - w / 2 + (i - 1) * 64 * k;
        const y = 790 + (i - 1) * 140 * k;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(-0.07 * k);
        ctx.fillStyle = INK;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        cover(ctx, c, -w / 2, -h / 2, w, h, 1, 8);
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 4;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = clamp(k * 2 - i * 0.2);
        setFont(ctx, 38);
        ctx.fillStyle = PAPER;
        ctx.textAlign = 'right';
        ctx.fillText(labels[i], W - 60, y + h / 2 + (i - 1) * 46);
        ctx.restore();
      });
      cut(ctx, t, C.f4);
    } else {
      block(
        ctx,
        t,
        [
          { t: C.f5, text: 'فيديو MP4', y: 630, size: 185, family: 'Lalezar' },
          { t: C.f5 + 0.18, text: 'بضغطة واحدة', y: 870, size: 145, em: true, family: 'Baloo Bhaijaan 2' },
        ],
        C.free - 0.1,
      );
      progress(ctx, 1140, span(t, C.f5 + 0.25, C.f5 + 1.1), 'يُصدَّر');
      if (t > C.f5 + 1.12) word(ctx, '✓ جاهز', W / 2, 1400, t - C.f5 - 1.12, 0, { size: 110 });
      tag(ctx, 'بلا خادم · ملفك يبقى عندك', W / 2, 1620, t - C.f5 - 0.5, 40);
      cut(ctx, t, C.f5);
    }
  }

  // ── 8. and all of it, free ──
  if (t >= C.free && t < C.cta) {
    cover(ctx, clip(S.celebrate, 0.5 + (t - C.free)), 0, 0, W, H, lerp(1.02, 1.16, span(t, C.free, C.cta)));
    vignette(ctx, 0.5);
    block(
      ctx,
      t,
      [
        { t: C.free + 0.12, text: 'وكل هذا', y: 770, size: 145, family: 'Tajawal', align: 'r' },
        { t: C.free + 0.33, text: 'مجانًا', y: 1030, size: 270, em: true, family: 'Lalezar' },
      ],
      C.cta - 0.12,
    );
    cut(ctx, t, C.free);
  }

  // ── 9. the invitation ──
  if (t >= C.cta) {
    if (t >= C.blink && t < C.back) {
      cover(ctx, clip(S.hero, 2.0 + (t - C.blink)), 0, 0, W, H, 1.2);
      vignette(ctx, 0.5);
      cut(ctx, t, C.blink);
    }
    logo(ctx, W / 2, 500, 0.78, span(t, C.cta, C.cta + 0.18));
    block(
      ctx,
      t,
      [
        { t: C.cta + 0.25, text: 'استوديو الأنمي', y: 900, size: 145, family: 'Reem Kufi', align: 'r' },
        { t: C.cta + 0.43, text: 'العربي', y: 1095, size: 165, em: true, family: 'Reem Kufi', align: 'l' },
      ],
      99,
    );
    if (t > C.cta + 0.7) word(ctx, 'اكتب · شاهد · نزّل الفيديو', W / 2, 1270, t - C.cta - 0.7, 0, { size: 62, family: 'Tajawal' });
    if (t > C.cta + 0.95) {
      const e = easeOut(clamp((t - C.cta - 0.95) / 0.14));
      ctx.save();
      ctx.translate(W / 2, 1450);
      ctx.scale(lerp(1.3, 1, e), lerp(1.3, 1, e));
      setFont(ctx, 76);
      ctx.direction = 'ltr';
      const label = 'anime.kamirtyai.com';
      const tw = ctx.measureText(label).width + 110;
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -64, tw, 128, 16);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(label, 0, 4);
      ctx.restore();
    }
    if (t > C.cta + 1.25) word(ctx, 'جرّبها الآن', W / 2, 1680, t - C.cta - 1.25, 0, { size: 130, family: 'Lalezar', em: Math.floor(t * 3) % 2 === 0 });
  }

  ctx.restore();

  // ── the frame itself ──
  texture(ctx, t, inverted ? 0.03 : 0.06);
  if (!inverted) vignette(ctx, 0.28);
  chrome(ctx, t, inverted);
}
