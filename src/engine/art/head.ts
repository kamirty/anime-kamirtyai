import type { Expression } from '../../domain/types';
import { INK, MOON, P, PRACTICAL, LINE, type Ctx, type Paint, cel, darken, fill, lighten, shade, stroke } from './paint';

/**
 * The approved Kamirty head: frontal face, centred nose and mouth, big anime eyes.
 * Units: the face centre is the origin; crown at y = -285, chin at y = 300.
 */

export type Headwear = 'kumma' | 'massar' | 'ghutra' | 'hijab' | 'lihaf' | 'hair';

export interface HeadOpts {
  skin: string;
  headwear: Headwear;
  /** Cap, scarf or turban colour. */
  wear: string;
  accent: string;
  hair: string;
  expression: Expression;
  gaze: { x: number; y: number };
  mouthOpen: boolean;
  /** 0 closed, 1 half, 2 open; overrides mouthOpen when set (lip-sync). */
  mouth?: number;
  blink: boolean;
  paint?: Paint;
  /** Line width multiplier so small heads keep readable outlines. */
  lw: number;
}

const FACE = 'M0,-285 C140,-285 240,-200 242,-80 C244,40 210,150 150,225 C105,278 55,300 0,300 C-55,300 -105,278 -150,225 C-210,150 -244,40 -242,-80 C-240,-200 -140,-285 0,-285 Z';
const FACE_SHADE = 'M-242,-80 C-244,40 -210,150 -150,225 C-120,258 -90,280 -60,292 C-120,220 -160,120 -172,-20 C-178,-80 -204,-112 -242,-80 Z';
const KUMMA = 'M-238,-132 L-236,-300 C-230,-350 230,-350 236,-300 L238,-132 Q0,-104 -238,-132 Z';
const KUMMA_SHADE = 'M-238,-132 L-236,-300 C-233,-322 -214,-334 -186,-342 C-194,-280 -196,-200 -194,-122 Q-218,-127 -238,-132 Z';
const EAR = 'M-236,-38 C-262,-38 -276,-6 -272,24 C-268,58 -248,78 -226,74 Z';
const EAR_R = 'M236,-38 C262,-38 276,-6 272,24 C268,58 248,78 226,74 Z';
const EAR_IN = 'M-240,-10 C-254,6 -252,34 -238,48';
const EAR_IN_R = 'M240,-10 C254,6 252,34 238,48';
const SIDE_HAIR = 'M-244,-140 C-262,-90 -258,-30 -238,0 L-228,-60 L-214,-20 L-206,-120 Z';
const SIDE_HAIR_R = 'M244,-140 C262,-90 258,-30 238,0 L228,-60 L214,-20 L206,-120 Z';
const CURLS = 'M-226,-128 L-200,-74 L-184,-124 L-160,-84 L-146,-122 Z';
const CURLS_R = 'M226,-128 L200,-74 L184,-124 L160,-84 L146,-122 Z';
const HAIR_TOP =
  'M-250,-110 C-268,-250 -150,-336 0,-338 C150,-336 268,-250 250,-110 L226,-146 L204,-92 L178,-150 L140,-100 L110,-162 L66,-108 L34,-168 L-6,-110 L-44,-166 L-82,-106 L-120,-160 L-152,-98 L-186,-150 L-210,-94 Z';
const HOOD = 'M0,-372 C200,-372 314,-236 314,-60 C314,110 306,300 350,580 L-350,580 C-306,300 -314,110 -314,-60 C-314,-236 -200,-372 0,-372 Z';
const HOOD_HOLE = 'M0,-222 C138,-222 214,-138 218,-34 C222,70 200,160 150,225 C105,278 55,300 0,300 C-55,300 -105,278 -150,225 C-200,160 -222,70 -218,-34 C-214,-138 -138,-222 0,-222 Z';
const HOOD_SHADE = 'M-314,-60 C-314,110 -306,300 -350,580 L-266,580 C-266,290 -272,110 -266,-60 C-262,-200 -194,-306 -110,-352 C-222,-332 -314,-236 -314,-60 Z';
const GHUTRA = 'M0,-362 C190,-362 302,-240 306,-70 C310,100 332,262 384,410 L262,440 C226,320 212,220 206,150 L-206,150 C-212,220 -226,320 -262,440 L-384,410 C-332,262 -310,100 -306,-70 C-302,-240 -190,-362 0,-362 Z';
const GHUTRA_HOLE = 'M0,-232 C140,-232 216,-142 220,-40 C224,60 216,140 206,150 L-206,150 C-216,140 -224,60 -220,-40 C-216,-142 -140,-232 0,-232 Z';
/**
 * The Omani massar: a wrapped turban, not a dome. It sits low over the brow, overhangs the
 * head at the sides, carries a printed border along the front of the wrap, is finished by a
 * twisted roll at the brim, and ends in the tucked corner that juts out above one ear.
 */
const MASSAR =
  'M-256,-150 C-288,-236 -276,-330 -150,-368 C-30,-398 170,-382 246,-300 C276,-262 278,-198 262,-154 C190,-128 60,-120 -40,-124 C-140,-130 -220,-140 -256,-150 Z';
/** Centre line of the twisted last fold that finishes the wrap, just above the brow. */
const MASSAR_ROLL: [number, number][] = [
  [-244, -174],
  [-150, -152],
  [60, -148],
  [250, -180],
];
/** Centre line of the printed border band across the front of the wrap. */
const MASSAR_BAND: [number, number][] = [
  [-250, -192],
  [-120, -330],
  [140, -340],
  [258, -214],
];
/** The tucked corner, a roll of cloth above the ear. */
const MASSAR_KNOT = 'M224,-196 C296,-186 318,-124 292,-80 C268,-40 206,-52 210,-98 C220,-134 234,-162 224,-196 Z';

/** A point on a Bézier of any degree, for laying motifs along a curve. */
function bez(pts: [number, number][], t: number): [number, number] {
  let p = pts;
  while (p.length > 1) p = p.slice(1).map((q, i) => [p[i][0] + (q[0] - p[i][0]) * t, p[i][1] + (q[1] - p[i][1]) * t] as [number, number]);
  return p[0];
}

const curve = (pts: [number, number][]) => `M${pts[0][0]},${pts[0][1]} ${pts.length === 4 ? 'C' : 'Q'}${pts.slice(1).map((q) => `${q[0]},${q[1]}`).join(' ')}`;

const EYE_O = 'M38,-20 C50,-60 140,-62 152,-20 C150,18 128,40 95,40 C62,40 40,18 38,-20 Z';
const EYE_N = 'M38,-6 C56,-36 136,-40 152,-8 C150,22 128,40 95,40 C62,40 40,22 38,-6 Z';
const EYE_W = 'M34,-28 C46,-74 144,-76 156,-28 C156,20 132,48 95,48 C58,48 34,20 34,-28 Z';
const LID_O = 'M32,-18 C46,-66 144,-68 158,-18 L170,-26';
const LID_N = 'M32,-4 C50,-44 140,-48 158,-6 L172,-12';
const LID_W = 'M28,-26 C42,-80 148,-82 162,-26 L174,-34';
const LID_SAD = 'M32,-14 C48,-58 138,-60 158,-10 L166,-4';
const LOWER = 'M70,38 C88,46 112,44 126,34';
const BROW_CALM = 'M40,-100 C80,-122 140,-120 168,-96 L162,-84 C130,-104 84,-104 46,-88 Z';
const BROW_SET = 'M36,-72 C80,-84 130,-102 170,-110 L170,-96 C130,-90 84,-74 42,-60 Z';
const BROW_UP = 'M40,-122 C80,-146 140,-144 168,-118 L162,-106 C130,-128 84,-128 46,-110 Z';
const BROW_SAD = 'M40,-112 C80,-118 130,-104 166,-84 L160,-72 C128,-92 84,-102 46,-98 Z';

/** Kumma embroidery rows, built once per colour set: zig-zags, diamonds and triangles that narrow toward the edges. */
export const embCache = new Map<string, { d: string; color: string; stroke?: number }[]>();
export function kummaEmbroidery(colors: [string, string, string]) {
  const key = colors.join();
  const hit = embCache.get(key);
  if (hit) return hit;
  const yb = (x: number) => -118 - 14 * (x / 238) * (x / 238);
  const pts = (n: number) => Array.from({ length: n }, (_, i) => -1.42 + (2.84 * i) / (n - 1));
  const X = (t: number) => 238 * Math.sin(t);
  const out: { d: string; color: string; stroke?: number }[] = [];
  const zig = (d0: number, d1: number, n: number, c: string, w: number) => {
    const P2 = pts(n).map((t, i) => {
      const x = X(t);
      return `${x.toFixed(1)},${(yb(x) - (i % 2 ? d1 : d0)).toFixed(1)}`;
    });
    out.push({ d: `M${P2.join(' L')}`, color: c, stroke: w });
  };
  const diamonds = (d: number, n: number, s: number, c: string) => {
    let path = '';
    for (const t of pts(n)) {
      const x = X(t);
      const y = yb(x) - d;
      const w = s * Math.cos(t);
      path += `M${(x - w).toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${(y - s).toFixed(1)} L${(x + w).toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${(y + s).toFixed(1)} Z `;
    }
    out.push({ d: path, color: c });
  };
  const tris = (d0: number, d1: number, n: number, c: string) => {
    let path = '';
    pts(n).forEach((t, i) => {
      const x = X(t);
      const w = 9 * Math.cos(t) + 2;
      const yA = yb(x) - d0;
      const yB = yb(x) - d1;
      path +=
        i % 2
          ? `M${(x - w).toFixed(1)},${yA.toFixed(1)} L${(x + w).toFixed(1)},${yA.toFixed(1)} L${x.toFixed(1)},${yB.toFixed(1)} Z `
          : `M${(x - w).toFixed(1)},${yB.toFixed(1)} L${(x + w).toFixed(1)},${yB.toFixed(1)} L${x.toFixed(1)},${yA.toFixed(1)} Z `;
    });
    out.push({ d: path, color: c });
  };
  const [a, b, c] = colors;
  zig(14, 34, 41, a, 6);
  diamonds(52, 17, 10, b);
  tris(68, 98, 25, c);
  diamonds(114, 21, 6, a);
  zig(130, 152, 33, b, 5);
  diamonds(170, 15, 9, a);
  tris(184, 210, 23, b);
  embCache.set(key, out);
  return out;
}

function clipTo(ctx: Ctx, d: string, rule: CanvasFillRule = 'nonzero') {
  ctx.save();
  ctx.clip(P(d), rule);
}

const LID_HALF = 'M32,2 C52,-26 138,-30 158,2 L168,8';
const EYE_HALF = 'M38,4 C56,-22 136,-26 152,4 C150,26 128,40 95,40 C62,40 40,26 38,4 Z';
const BROW_ANGRY = 'M30,-58 C80,-76 130,-104 172,-122 L174,-104 C132,-88 84,-62 38,-44 Z';
const BROW_WORRY = 'M40,-104 C80,-112 128,-100 166,-80 L160,-68 C126,-86 84,-96 46,-90 Z';

/** Which drawing each expression uses for eyes, brows and mouth. */
function look(e: Expression) {
  switch (e) {
    case 'set':
      return { eye: EYE_N, lid: LID_N, brow: BROW_SET };
    case 'angry':
      return { eye: EYE_N, lid: LID_N, brow: BROW_ANGRY };
    case 'surprised':
    case 'amazed':
      return { eye: EYE_W, lid: LID_W, brow: BROW_UP };
    case 'sad':
      return { eye: EYE_O, lid: LID_SAD, brow: BROW_SAD };
    case 'gloom':
      return { eye: EYE_HALF, lid: LID_HALF, brow: BROW_SAD };
    case 'embarrassed':
    case 'shy':
      return { eye: EYE_O, lid: LID_O, brow: BROW_WORRY };
    case 'happy':
      return { eye: EYE_O, lid: LID_O, brow: BROW_UP };
    default:
      return { eye: EYE_O, lid: LID_O, brow: BROW_CALM };
  }
}

function star(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function drawEye(ctx: Ctx, o: HeadOpts, side: 1 | -1) {
  const p = o.paint;
  ctx.save();
  ctx.scale(side, 1);
  const lw = o.lw;
  if (o.blink || o.expression === 'happy') {
    const d = o.expression === 'happy' ? 'M42,0 C60,-46 132,-46 150,0' : 'M40,4 C60,22 130,22 150,4';
    stroke(ctx, d, '#120e0c', 13 * lw, p);
    ctx.restore();
    return;
  }
  const L = look(o.expression);
  fill(ctx, L.eye, '#f6f3ee', p);
  if (!p?.sil) {
    clipTo(ctx, L.eye);
    let gx = o.gaze.x * side;
    let gy = o.gaze.y;
    if (o.expression === 'shy') gy = 14;
    if (o.expression === 'embarrassed') gx = 16 * side;
    const small = o.expression === 'surprised' ? 0.72 : o.expression === 'angry' ? 0.86 : 1;
    ctx.fillStyle = '#4a2a16';
    ctx.beginPath();
    ctx.ellipse(95 + gx, -6 + gy, 30 * small, 38 * small, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120e0c';
    ctx.beginPath();
    ctx.ellipse(97 + gx, -8 + gy, 14 * small, 20 * small, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.expression === 'amazed') {
      // star-shaped highlights: the "sparkly eyes" of anime
      star(ctx, 104 + gx, -20 + gy, 26, LINE);
      star(ctx, 80 + gx, 16 + gy, 12, PRACTICAL);
    } else {
      ctx.fillStyle = LINE;
      ctx.fillRect(102 + gx, -34 + gy, 12, 14);
      ctx.fillStyle = o.expression === 'set' || o.expression === 'angry' ? PRACTICAL : MOON;
      ctx.beginPath();
      ctx.arc(84 + gx, 14 + gy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  stroke(ctx, L.lid, '#120e0c', 12 * lw, p);
  stroke(ctx, LOWER, '#120e0c', 4 * lw, p);
  ctx.restore();
}

function drawBrows(ctx: Ctx, o: HeadOpts) {
  const d = look(o.expression).brow;
  fill(ctx, d, o.hair, o.paint);
  ctx.save();
  ctx.scale(-1, 1);
  fill(ctx, d, o.hair, o.paint);
  ctx.restore();
}

function blush(ctx: Ctx, strong: boolean) {
  fill(ctx, 'M150,92 m-34,0 a34,16 0 1,0 68,0 a34,16 0 1,0 -68,0 Z', '#d7192a', undefined, strong ? 0.38 : 0.26);
  fill(ctx, 'M-150,92 m-34,0 a34,16 0 1,0 68,0 a34,16 0 1,0 -68,0 Z', '#d7192a', undefined, strong ? 0.38 : 0.26);
  if (strong) {
    for (const sx of [1, -1]) for (let i = 0; i < 3; i++) stroke(ctx, `M${sx * (128 + i * 18)},104 l${sx * 12},-22`, '#b3121f', 4, undefined, 0.8);
  }
}

/** Mouth: `level` 0 closed, 1 half open, 2 open (lip-sync and talking use the levels). */
function drawMouth(ctx: Ctx, o: HeadOpts) {
  const p = o.paint;
  const lw = o.lw;
  const level = o.mouth ?? (o.mouthOpen ? 2 : 0);
  const e = o.expression;
  if (!p?.sil && (e === 'happy' || e === 'amazed' || (level > 0 && e === 'look'))) blush(ctx, false);
  if (!p?.sil && (e === 'embarrassed' || e === 'shy')) blush(ctx, true);
  if (level === 1) {
    cel(ctx, 'M-26,168 C-22,186 22,186 26,168 C12,172 -12,172 -26,168 Z', '#3a1410', 4 * lw, p);
    return;
  }
  if (e === 'angry') {
    // gritted teeth, or a shout when talking
    if (level === 2) {
      cel(ctx, 'M-58,150 C-50,222 50,222 58,150 C30,164 -30,164 -58,150 Z', '#3a1410', 4 * lw, p);
      fill(ctx, 'M-48,156 C-24,164 24,164 48,156 L44,170 C22,176 -22,176 -44,170 Z', '#f6f3ee', p);
      return;
    }
    cel(ctx, 'M-46,162 L46,162 L40,192 L-40,192 Z', '#f6f3ee', 5 * lw, p);
    stroke(ctx, 'M-44,177 L44,177 M-20,162 L-20,192 M0,162 L0,192 M20,162 L20,192', INK, 3 * lw, p);
    return;
  }
  if (level === 2 || e === 'happy' || e === 'amazed') {
    if (e === 'happy' || e === 'amazed' || e === 'look') {
      cel(ctx, 'M-62,154 C-40,216 40,216 62,154 C30,170 -30,170 -62,154 Z', '#3a1410', 4 * lw, p);
      fill(ctx, 'M-52,160 C-26,168 26,168 52,160 L48,174 C24,180 -24,180 -48,174 Z', '#f6f3ee', p);
      fill(ctx, 'M-24,198 C-10,188 14,188 26,198 C10,206 -10,206 -24,198 Z', '#d7192a', p, 0.6);
      return;
    }
    cel(ctx, 'M-30,162 C-28,200 28,200 30,162 C14,170 -14,170 -30,162 Z', '#3a1410', 4 * lw, p);
    fill(ctx, 'M-16,190 C-6,182 8,182 16,190 C6,196 -6,196 -16,190 Z', '#d7192a', p, 0.6);
    return;
  }
  if (e === 'surprised') {
    ctx.save();
    ctx.fillStyle = p?.sil ?? '#3a1410';
    ctx.beginPath();
    ctx.ellipse(0, 182, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const d =
    e === 'set'
      ? 'M-30,178 C-10,173 10,173 30,178'
      : e === 'sad' || e === 'gloom'
        ? 'M-32,186 C-12,172 12,172 32,186'
        : e === 'embarrassed'
          ? 'M-40,176 q10,-10 20,0 q10,10 20,0 q10,-10 20,0 q10,10 20,0'
          : e === 'shy'
            ? 'M-22,172 C-8,180 8,180 22,172'
            : e === 'look'
              ? 'M-40,166 C-16,188 16,188 40,166'
              : 'M-34,170 C-14,184 14,184 34,170';
  stroke(ctx, d, INK, (e === 'set' ? 6 : 5) * lw, p);
}

/** Anime symbols drawn on top of the head: sweat drop, anger vein, sparkles, gloom lines. */
function drawMarks(ctx: Ctx, o: HeadOpts) {
  if (o.paint?.sil) return;
  const e = o.expression;
  if (e === 'embarrassed') {
    const drop = 'M262,-250 C286,-206 302,-176 286,-150 C272,-130 244,-136 240,-160 C236,-184 250,-210 262,-250 Z';
    fill(ctx, drop, '#a9dcf5');
    stroke(ctx, drop, INK, 5);
    stroke(ctx, 'M256,-196 C252,-180 252,-168 258,-160', '#ffffff', 6);
  }
  if (e === 'angry') {
    ctx.save();
    ctx.translate(230, -300);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      stroke(ctx, 'M14,-40 C14,-18 18,-14 40,-14', '#d7192a', 12);
    }
    ctx.restore();
  }
  if (e === 'amazed') {
    star(ctx, -330, -250, 48, '#ffcf6e');
    star(ctx, 340, -150, 36, '#fbf8f1');
    star(ctx, 300, -340, 26, '#ffcf6e');
  }
}

function drawGloom(ctx: Ctx, o: HeadOpts) {
  if (o.paint?.sil || o.expression !== 'gloom') return;
  ctx.save();
  ctx.clip(P(FACE));
  fill(ctx, 'M-260,-300 L260,-300 L260,-40 L-260,-40 Z', '#1b2a5a', undefined, 0.28);
  for (let i = -3; i <= 3; i++) stroke(ctx, `M${i * 52},-200 L${i * 52},${-90 + Math.abs(i) * 10}`, '#1b2a5a', 7, undefined, 0.55);
  ctx.restore();
}

/** Neck only, drawn before the clothes so collars sit on top of it. */
export function drawNeck(ctx: Ctx, skin: string, lw: number, paint?: Paint): void {
  cel(ctx, 'M-70,230 L-76,520 L76,520 L70,230 Z', skin, 6 * lw, paint);
  shade(ctx, 'M-72,262 C-30,318 30,318 72,262 L70,230 L-70,230 Z', paint);
}

export function drawHead(ctx: Ctx, o: HeadOpts): void {
  const p = o.paint;
  const lw = o.lw;
  const wrapped = o.headwear === 'hijab' || o.headwear === 'lihaf';
  if (!wrapped && o.headwear !== 'ghutra') {
    fill(ctx, SIDE_HAIR, o.hair, p);
    fill(ctx, SIDE_HAIR_R, o.hair, p);
    cel(ctx, EAR, o.skin, 6 * lw, p);
    cel(ctx, EAR_R, o.skin, 6 * lw, p);
    stroke(ctx, EAR_IN, INK, 3 * lw, p);
    stroke(ctx, EAR_IN_R, INK, 3 * lw, p);
  }
  if (o.headwear === 'ghutra') {
    // the back fall of the ghutra sits behind the face
    fill(ctx, GHUTRA, o.wear, p);
  }
  cel(ctx, FACE, o.skin, 6 * lw, p);
  shade(ctx, FACE_SHADE, p);
  if (!wrapped && o.headwear !== 'ghutra') {
    fill(ctx, CURLS, o.hair, p);
    fill(ctx, CURLS_R, o.hair, p);
  }
  shade(ctx, 'M-16,54 C-26,78 -20,98 -8,102 L-2,96 C-12,86 -12,72 -8,54 Z', p);
  stroke(ctx, 'M-14,94 C-6,106 6,106 14,94', INK, 4 * lw, p);
  drawEye(ctx, o, 1);
  drawEye(ctx, o, -1);
  drawBrows(ctx, o);
  drawMouth(ctx, o);
  drawGloom(ctx, o);

  switch (o.headwear) {
    case 'kumma': {
      fill(ctx, KUMMA, o.wear, p);
      if (!p?.sil) {
        clipTo(ctx, KUMMA);
        for (const e of kummaEmbroidery([o.accent, '#d7192a', '#7a4f35'])) {
          if (e.stroke) stroke(ctx, e.d, e.color, e.stroke);
          else fill(ctx, e.d, e.color);
        }
        shade(ctx, KUMMA_SHADE, p);
        ctx.restore();
      }
      stroke(ctx, KUMMA, INK, 6 * lw, p);
      break;
    }
    case 'massar': {
      const dark = darken(o.accent, 0.32);
      const light = lighten(o.accent, 0.3);
      cel(ctx, MASSAR, o.accent, 6 * lw, p);
      if (!p?.sil) {
        clipTo(ctx, MASSAR);
        // the folds of the cloth, wrapping up and across the head
        for (let i = -6; i <= 7; i++) {
          const x = i * 54;
          stroke(ctx, `M${x - 200},-96 C${x - 100},-200 ${x - 20},-286 ${x + 110},-392`, i % 2 ? light : dark, i % 2 ? 13 : 8, undefined, 0.42);
        }
        // the printed border of the cloth, laid along the front of the wrap
        ctx.lineCap = 'butt';
        stroke(ctx, curve(MASSAR_BAND), dark, 92, undefined, 0.95);
        for (let i = 0; i <= 13; i++) {
          const t = i / 13;
          const [x, y] = bez(MASSAR_BAND, t);
          const [x2, y2] = bez(MASSAR_BAND, Math.min(1, t + 0.02));
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.atan2(y2 - y, x2 - x));
          // the woven motif of a kashmir border: a curled leaf between two rules
          fill(ctx, 'M-14,-18 C4,-28 18,-12 10,4 C2,18 -14,14 -14,-18 Z', light, undefined, 0.9);
          fill(ctx, 'M-17,18 L17,18 L17,26 L-17,26 Z', light, undefined, 0.7);
          fill(ctx, 'M-17,-36 L17,-36 L17,-29 L-17,-29 Z', light, undefined, 0.55);
          ctx.restore();
        }
        ctx.lineCap = 'round';
        shade(ctx, 'M-256,-150 C-288,-236 -276,-330 -150,-368 C-232,-300 -250,-224 -236,-144 Z', p);
        ctx.restore();
      }
      stroke(ctx, MASSAR, INK, 6 * lw, p);
      // the twisted roll that finishes the wrap: a rope of cloth along the brow, drawn as a
      // thick outlined stroke so it reads as a rolled edge and not as a printed stripe
      {
        const roll = curve(MASSAR_ROLL);
        stroke(ctx, roll, p?.sil ?? INK, 62, p);
        stroke(ctx, roll, p?.sil ?? o.accent, 50, p);
        if (!p?.sil) {
          for (let i = 0; i <= 11; i++) {
            const [x, y] = bez(MASSAR_ROLL, i / 11);
            stroke(ctx, `M${x - 14},${y + 20} L${x + 10},${y - 20}`, dark, 6, undefined, 0.5);
          }
          stroke(ctx, curve(MASSAR_ROLL.map(([x, y]) => [x, y - 13] as [number, number])), light, 8, undefined, 0.5);
        }
      }
      // the tucked corner, a roll of cloth folded over the brim above the ear
      cel(ctx, MASSAR_KNOT, darken(o.accent, 0.14), 6 * lw, p);
      if (!p?.sil) {
        clipTo(ctx, MASSAR_KNOT);
        for (let i = 0; i < 4; i++) stroke(ctx, `M${206 + i * 8},${-186 + i * 34} C${272 + i * 8},${-174 + i * 32} ${298 + i * 4},${-132 + i * 28} ${280 + i * 2},${-94 + i * 26}`, i % 2 ? light : dark, 10, undefined, 0.6);
        ctx.restore();
        stroke(ctx, MASSAR_KNOT, INK, 6 * lw, p);
      }
      break;
    }
    case 'ghutra': {
      ctx.save();
      const path = new Path2D(GHUTRA);
      path.addPath(P(GHUTRA_HOLE));
      ctx.fillStyle = p?.sil ?? o.wear;
      ctx.fill(path, 'evenodd');
      if (!p?.sil) {
        ctx.clip(path, 'evenodd');
        ctx.strokeStyle = o.accent;
        ctx.lineWidth = 7;
        ctx.globalAlpha = 0.85;
        for (let i = -14; i <= 14; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 42 - 500, -400);
          ctx.lineTo(i * 42 + 500, 600);
          ctx.moveTo(i * 42 + 500, -400);
          ctx.lineTo(i * 42 - 500, 600);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = INK;
        ctx.globalAlpha = 0.18;
        ctx.fillRect(-400, -400, 150, 900);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (!p?.sil) {
        ctx.save();
        ctx.lineWidth = 6 * lw;
        ctx.strokeStyle = INK;
        ctx.stroke(P(GHUTRA));
        ctx.stroke(P(GHUTRA_HOLE));
        ctx.restore();
      }
      // agal: two black cords on top
      ctx.save();
      ctx.strokeStyle = p?.sil ?? '#111111';
      ctx.lineWidth = 26;
      for (const y of [-262, -228]) {
        ctx.beginPath();
        ctx.ellipse(0, y, 214, 44, 0, Math.PI * 1.02, Math.PI * 1.98);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'hijab':
    case 'lihaf': {
      const path = new Path2D(HOOD);
      path.addPath(P(HOOD_HOLE));
      ctx.save();
      ctx.fillStyle = p?.sil ?? o.wear;
      ctx.fill(path, 'evenodd');
      ctx.restore();
      if (!p?.sil) {
        ctx.save();
        ctx.clip(path, 'evenodd');
        fill(ctx, HOOD_SHADE, INK, undefined, 0.2);
        stroke(ctx, 'M-150,-250 C-200,-150 -230,40 -250,300', darken(o.wear, 0.25), 6, undefined, 0.6);
        stroke(ctx, 'M150,-250 C200,-150 230,40 250,300', darken(o.wear, 0.25), 6, undefined, 0.6);
        if (o.headwear === 'lihaf') {
          // embroidered trim around the face opening
          ctx.setLineDash([2, 22]);
          stroke(ctx, 'M0,-246 C150,-246 236,-150 240,-34 C244,74 222,170 168,240', o.accent, 16);
          stroke(ctx, 'M0,-246 C-150,-246 -236,-150 -240,-34 C-244,74 -222,170 -168,240', o.accent, 16);
          ctx.setLineDash([]);
          stroke(ctx, 'M0,-256 C156,-256 246,-154 250,-34 C254,78 232,176 176,250', o.accent, 5);
          stroke(ctx, 'M0,-256 C-156,-256 -246,-154 -250,-34 C-254,78 -232,176 -176,250', o.accent, 5);
        }
        ctx.restore();
        ctx.save();
        ctx.lineWidth = 6 * lw;
        ctx.strokeStyle = INK;
        ctx.lineJoin = 'round';
        ctx.stroke(P(HOOD));
        ctx.stroke(P(HOOD_HOLE));
        ctx.restore();
      }
      break;
    }
    case 'hair': {
      cel(ctx, HAIR_TOP, o.hair, 6 * lw, p);
      if (!p?.sil) stroke(ctx, 'M-120,-290 C-60,-310 0,-312 40,-306', lighten(o.hair, 0.3), 10, undefined, 0.7);
      break;
    }
  }
  drawMarks(ctx, o);
}

export const HEAD_CROWN = -285;
export const HEAD_CHIN = 300;
