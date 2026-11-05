import { SKINS, isFemale, isKid, type Character, type Expression, type HandShape, type HeldProp } from '../../domain/types';
import { drawHand } from './hand';
import { drawHeld } from './held';
import { drawHead, drawNeck, type Headwear } from './head';
import { INK, PRACTICAL, LINE, type Ctx, type Paint, cel, darken, fill, lighten, shade, stroke, style } from './paint';

/**
 * A character in body units: feet at the origin, up is negative y.
 * Adults are 1000 units tall, children 780. Arms and legs are posed by angles so every action is data.
 */

export interface Rig {
  H: number;
  /** Head scale: head units → body units. */
  k: number;
  headCY: number;
  chin: number;
  sY: number;
  sw: number;
  hipY: number;
  hemY: number;
  ua: number;
  fa: number;
  sleeve: number;
  hand: number;
  thigh: number;
  shin: number;
  pant: number;
}

export function rig(ch: Character): Rig {
  const kid = isKid(ch.kind);
  const H = kid ? 780 : 1000;
  const k = kid ? 0.335 : 0.3;
  const headCY = -H + 285 * k;
  const chin = headCY + 300 * k;
  const sY = chin + 0.05 * H;
  const sw = (kid ? 0.125 : 0.118) * H;
  const hipY = sY + 0.31 * H;
  return {
    H,
    k,
    headCY,
    chin,
    sY,
    sw,
    hipY,
    hemY: -0.035 * H,
    ua: 0.165 * H,
    fa: 0.15 * H,
    sleeve: 0.062 * H,
    hand: 0.031 * H,
    thigh: (-hipY - 0.02 * H) / 2,
    shin: (-hipY - 0.02 * H) / 2,
    pant: 0.072 * H,
  };
}

export interface Pose {
  /** Vertical offset of the whole body (jumps), body units. */
  dy: number;
  /** 0 standing … 1 deep crouch */
  crouch: number;
  /** Vertical stretch for smear drawings (1 = none). */
  stretch: number;
  lean: number;
  headTilt: number;
  /** [upper-arm angle from straight down (positive = outward/up), elbow bend] for the viewer's left and right arms. */
  armL: [number, number];
  armR: [number, number];
  legL: [number, number];
  legR: [number, number];
  /** Horizontal foot offsets and lift for walking. */
  feet: [number, number, number, number];
  hem: number;
  expression: Expression;
  gaze: { x: number; y: number };
  mouthOpen: boolean;
  /** Lip-sync mouth level (0 closed, 1 half, 2 open). */
  mouth?: number;
  blink: boolean;
  /** Side view (walk and run). */
  side?: { facing: 1 | -1; phase: number; run: boolean };
  /** Energy orb in body units (power move). */
  orb?: { x: number; y: number; r: number };
  /** A small object held in the hands. */
  hold?: HeldProp;
  /** Shape of each hand; they turn with the forearm. */
  handL?: HandShape;
  handR?: HandShape;
}

export const restPose = (expression: Expression = 'calm'): Pose => ({
  dy: 0,
  crouch: 0,
  stretch: 1,
  lean: 0,
  headTilt: 0,
  armL: [0.12, 0.06],
  armR: [0.12, 0.06],
  legL: [0.04, 0],
  legR: [0.04, 0],
  feet: [0, 0, 0, 0],
  hem: 0,
  expression,
  gaze: { x: 0, y: 0 },
  mouthOpen: false,
  blink: false,
});

export const headwearFor = (ch: Character): Headwear => {
  switch (ch.outfit) {
    case 'dishdasha':
      return 'kumma';
    case 'massar':
      return 'massar';
    case 'ghutra':
      return 'ghutra';
    case 'omaniDress':
      return 'lihaf';
    case 'abaya':
    case 'school':
      return 'hijab';
    default:
      return isFemale(ch.kind) ? 'hijab' : 'hair';
  }
};

export const wearColor = (ch: Character): string => {
  switch (ch.outfit) {
    case 'dishdasha':
      return '#f6f3ee';
    case 'massar':
      return ch.accent;
    case 'ghutra':
      return '#f6f3ee';
    case 'abaya':
      return ch.color;
    case 'omaniDress':
      return ch.accent;
    case 'school':
      return '#f6f3ee';
    default:
      return ch.accent;
  }
};

export const sleeveColor = (ch: Character): string => {
  const base = ch.outfit === 'school' ? '#f6f3ee' : ch.outfit === 'labcoat' ? '#f8f8f6' : ch.color;
  // without a black outline an arm would melt into the robe, so the sleeve takes a shade of its own
  return style.flat ? darken(base, 0.07) : base;
};

const dir = (side: -1 | 1, a: number): [number, number] => [side * Math.sin(a), Math.cos(a)];

export interface Limb {
  s: [number, number];
  e: [number, number];
  h: [number, number];
}

function limb(s: [number, number], side: -1 | 1, ang: [number, number], l1: number, l2: number): Limb {
  const d1 = dir(side, ang[0]);
  const e: [number, number] = [s[0] + d1[0] * l1, s[1] + d1[1] * l1];
  const d2 = dir(side, ang[0] + ang[1]);
  return { s, e, h: [e[0] + d2[0] * l2, e[1] + d2[1] * l2] };
}

export function strokeLimb(ctx: Ctx, L: Limb, color: string, width: number, outline: number, paint?: Paint) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(L.s[0], L.s[1]);
    ctx.lineTo(L.e[0], L.e[1]);
    ctx.lineTo(L.h[0], L.h[1]);
  };
  if (!paint?.sil) {
    if (style.flat) {
      // the arm casts a soft shadow on whatever it lies over, which is what separates them
      ctx.save();
      ctx.translate(outline * 1.6, outline * 2.2);
      path();
      ctx.strokeStyle = INK;
      ctx.globalAlpha = 0.1;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    } else {
      path();
      ctx.strokeStyle = INK;
      ctx.lineWidth = width + outline * 2;
      ctx.stroke();
    }
  }
  path();
  ctx.strokeStyle = paint?.sil ?? color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function circle(ctx: Ctx, x: number, y: number, r: number, color: string, outline: number, paint?: Paint) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = paint?.sil ?? color;
  ctx.fill();
  if (!paint?.sil && outline > 0 && !style.flat) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = outline;
    ctx.stroke();
  }
}

const n = (v: number) => v.toFixed(1);

/** The garment silhouette from shoulders to hem; `hemW` widens the hem relative to the shoulders. */
function robePath(r: Rig, top: number, hemY: number, hemW: number, sway: number, waist = 0.98): string {
  const H = r.H;
  const nw = 0.04 * H;
  const sw = r.sw;
  const sh = top + 0.035 * H;
  const hip = top + 0.31 * H;
  return (
    `M${n(-nw)},${n(top - 0.006 * H)} C${n(-nw - 0.05 * H)},${n(top - 0.004 * H)} ${n(-sw + 0.02 * H)},${n(sh - 0.03 * H)} ${n(-sw)},${n(sh)} ` +
    `L${n(-sw * waist)},${n(hip)} L${n(-sw * hemW + sway)},${n(hemY)} L${n(sw * hemW + sway)},${n(hemY)} L${n(sw * waist)},${n(hip)} L${n(sw)},${n(sh)} ` +
    `C${n(sw - 0.02 * H)},${n(sh - 0.03 * H)} ${n(nw + 0.05 * H)},${n(top - 0.004 * H)} ${n(nw)},${n(top - 0.006 * H)} Q0,${n(top + 0.05 * H)} ${n(-nw)},${n(top - 0.006 * H)} Z`
  );
}

function robeShade(r: Rig, top: number, hemY: number, hemW: number, sway: number): string {
  const H = r.H;
  const sw = r.sw;
  const sh = top + 0.035 * H;
  const hip = top + 0.31 * H;
  return `M${n(-sw)},${n(sh)} L${n(-sw * 0.98)},${n(hip)} L${n(-sw * hemW + sway)},${n(hemY)} L${n(-sw * hemW * 0.62 + sway)},${n(hemY)} L${n(-sw * 0.62)},${n(hip)} L${n(-sw * 0.66)},${n(sh + 0.01 * H)} Z`;
}

export interface CharacterDraw {
  /** Screen anchors in body units, for speech bubbles and effects. */
  headTop: number;
  headCY: number;
  hands: [[number, number], [number, number]];
}

/** Draws a character with its feet at (0,0). Returns anchor points in body units. */
export function drawCharacter(ctx: Ctx, ch: Character, pose: Pose, paint?: Paint): CharacterDraw {
  const r = rig(ch);
  const H = r.H;
  const skin = SKINS[Math.max(0, Math.min(3, ch.skin))];
  const o = 0.0055 * H; // outline width in body units
  const female = isFemale(ch.kind);
  // a light crouch dips a little; a deep one really sits down
  const drop = (pose.crouch <= 0.5 ? pose.crouch * 0.13 : 0.065 + (pose.crouch - 0.5) * 0.42) * H;
  // leaning shears the body above the ground instead of turning the whole figure on its feet,
  // so the hem stays planted and the character bends rather than tipping over like a plank
  const shear = pose.lean * 0.5;
  const top = r.sY + drop;
  const legsVisible = ch.outfit === 'casual' ? !female : ch.outfit === 'labcoat';
  const robeHemY = ch.outfit === 'labcoat' ? top + 0.5 * H : ch.outfit === 'omaniDress' ? -0.17 * H : ch.outfit === 'casual' && !female ? top + 0.33 * H : r.hemY;
  const hemW = (ch.outfit === 'abaya' ? 1.16 : ch.outfit === 'omaniDress' ? 1.18 : ch.outfit === 'school' || (ch.outfit === 'casual' && female) ? 1.1 : 1.0) + pose.crouch * 0.28;
  const sway = pose.hem * 0.02 * H;

  ctx.save();
  ctx.translate(0, pose.dy);
  if (pose.stretch !== 1) ctx.scale(1 / Math.sqrt(pose.stretch), pose.stretch);
  if (shear) ctx.transform(1, 0, -shear, 1, 0, 0);

  // ── legs / feet ──
  const hip = r.hipY + drop;
  if (legsVisible) {
    const pantsColor = ch.outfit === 'labcoat' ? '#33363f' : '#2b2f3a';
    const lift = (i: number) => pose.feet[i + 2];
    const L = limb([-0.045 * H, hip], -1, [pose.legL[0] + pose.crouch * 0.45, pose.legL[1] - pose.crouch * 0.9], r.thigh, r.shin);
    const R = limb([0.045 * H, hip], 1, [pose.legR[0] + pose.crouch * 0.45, pose.legR[1] - pose.crouch * 0.9], r.thigh, r.shin);
    L.h = [L.h[0] + pose.feet[0], L.h[1] - lift(0)];
    R.h = [R.h[0] + pose.feet[1], R.h[1] - lift(1)];
    for (const [Lb, side] of [[L, -1], [R, 1]] as const) {
      strokeLimb(ctx, Lb, pantsColor, r.pant, o, paint);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(Lb.h[0] + side * 0.012 * H, Lb.h[1] + 0.008 * H, 0.05 * H, 0.022 * H, 0, 0, Math.PI * 2);
      ctx.fillStyle = paint?.sil ?? '#1d1d22';
      ctx.fill();
      if (!paint?.sil && !style.flat) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = o;
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    for (const side of [-1, 1] as const) {
      const i = side < 0 ? 0 : 1;
      const fx = side * 0.052 * H + pose.feet[i];
      const fy = -pose.feet[i + 2];
      ctx.beginPath();
      ctx.ellipse(fx, fy - 0.004 * H, 0.05 * H, 0.016 * H, 0, 0, Math.PI * 2);
      ctx.fillStyle = paint?.sil ?? '#2a1d17';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(fx, fy - 0.016 * H, 0.036 * H, 0.014 * H, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = paint?.sil ?? skin;
      ctx.fill();
      if (!paint?.sil && !style.flat) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = o * 0.6;
        ctx.stroke();
      }
    }
    if (ch.outfit === 'omaniDress') {
      // embroidered sirwal under the dress
      for (const side of [-1, 1] as const) {
        const x = side * 0.055 * H + pose.feet[side < 0 ? 0 : 1];
        const d = `M${n(x - 0.04 * H)},${n(robeHemY - 0.01 * H)} L${n(x - 0.034 * H)},${n(-0.03 * H)} L${n(x + 0.034 * H)},${n(-0.03 * H)} L${n(x + 0.04 * H)},${n(robeHemY - 0.01 * H)} Z`;
        cel(ctx, d, ch.accent, o, paint);
        for (let b = 0; b < 3; b++) {
          const y = -0.05 * H - b * 0.03 * H;
          stroke(ctx, `M${n(x - 0.036 * H)},${n(y)} L${n(x + 0.036 * H)},${n(y)}`, darken(ch.accent, 0.35), 0.008 * H, paint);
        }
      }
    }
  }

  // ── neck ──
  ctx.save();
  ctx.translate(0, r.headCY + drop);
  ctx.scale(r.k, r.k);
  // under a hijab the scarf wraps the neck, so the neck takes the scarf colour
  const wrapped = headwearFor(ch) === 'hijab' || headwearFor(ch) === 'lihaf';
  drawNeck(ctx, wrapped ? wearColor(ch) : skin, 1, paint);
  ctx.restore();

  // ── garment ──
  const garment = ch.outfit === 'school' ? ch.color : ch.outfit === 'labcoat' ? ch.color : ch.color;
  if (ch.outfit === 'labcoat') {
    // shirt underneath, then the open white coat
    const shirt = robePath(r, top, top + 0.33 * H, 0.98, 0);
    cel(ctx, shirt, garment, o, paint);
    const coat = robePath(r, top, robeHemY, 1.08, sway);
    cel(ctx, coat, '#f8f8f6', o, paint);
    shade(ctx, robeShade(r, top, robeHemY, 1.08, sway), paint);
    // opening shows the shirt and tie
    cel(ctx, `M${n(-0.03 * H)},${n(top + 0.02 * H)} L${n(-0.02 * H)},${n(robeHemY)} L${n(0.02 * H)},${n(robeHemY)} L${n(0.03 * H)},${n(top + 0.02 * H)} Z`, garment, o * 0.8, paint);
    stroke(ctx, `M${n(-0.11 * H)},${n(top + 0.24 * H)} L${n(-0.05 * H)},${n(top + 0.24 * H)}`, style.flat ? '#d8d4cc' : INK, o * 0.7, paint);
    stroke(ctx, `M${n(0.05 * H)},${n(top + 0.36 * H)} L${n(0.11 * H)},${n(top + 0.36 * H)}`, style.flat ? '#d8d4cc' : INK, o * 0.7, paint);
  } else if (ch.outfit === 'casual' && !female) {
    const shirt = robePath(r, top, robeHemY, 0.98, 0);
    cel(ctx, shirt, garment, o, paint);
    shade(ctx, robeShade(r, top, robeHemY, 0.98, 0), paint);
    stroke(ctx, `M${n(-0.04 * H)},${n(top)} L0,${n(top + 0.05 * H)} L${n(0.04 * H)},${n(top)}`, darken(garment, 0.35), o, paint);
    stroke(ctx, `M${n(-0.1 * H)},${n(top + 0.12 * H)} C${n(-0.05 * H)},${n(top + 0.16 * H)} ${n(0.05 * H)},${n(top + 0.16 * H)} ${n(0.1 * H)},${n(top + 0.12 * H)}`, lighten(garment, 0.3), o * 1.2, paint, 0.8);
  } else {
    const robe = robePath(r, top, robeHemY, hemW, sway);
    cel(ctx, robe, garment, o, paint);
    shade(ctx, robeShade(r, top, robeHemY, hemW, sway), paint);
    if (ch.outfit === 'dishdasha' || ch.outfit === 'massar' || ch.outfit === 'ghutra') {
      // embroidered round collar, placket, button and the white tassel
      stroke(ctx, `M${n(-0.05 * H)},${n(top)} Q0,${n(top + 0.07 * H)} ${n(0.05 * H)},${n(top)}`, style.flat ? darken(garment, 0.14) : INK, o * 0.6, paint);
      cel(ctx, `M${n(-0.008 * H)},${n(top + 0.034 * H)} L${n(-0.008 * H)},${n(top + 0.2 * H)} L${n(0.008 * H)},${n(top + 0.2 * H)} L${n(0.008 * H)},${n(top + 0.034 * H)} Z`, garment, o * 0.45, paint);
      if (ch.outfit !== 'ghutra') {
        const tx = 0;
        const ty = top + 0.034 * H;
        const s = 0.00072 * H;
        const tas = `M${n(tx)},${n(ty)} C${n(tx - 20 * s)},${n(ty + 8 * s)} ${n(tx - 45 * s)},${n(ty + 22 * s)} ${n(tx - 55 * s)},${n(ty + 48 * s)}`;
        stroke(ctx, tas, style.flat ? darken(garment, 0.14) : INK, 9 * s, paint);
        stroke(ctx, tas, garment, 4.5 * s, paint);
        cel(ctx, `M${n(tx - 55 * s)},${n(ty + 44 * s)} C${n(tx - 40 * s)},${n(ty + 64 * s)} ${n(tx - 42 * s)},${n(ty + 104 * s)} ${n(tx - 58 * s)},${n(ty + 122 * s)} C${n(tx - 72 * s)},${n(ty + 104 * s)} ${n(tx - 72 * s)},${n(ty + 64 * s)} ${n(tx - 55 * s)},${n(ty + 44 * s)} Z`, garment, 3 * s, paint);
        cel(ctx, `M${n(tx - 58 * s)},${n(ty + 128 * s)} C${n(tx - 46 * s)},${n(ty + 148 * s)} ${n(tx - 40 * s)},${n(ty + 176 * s)} ${n(tx - 38 * s)},${n(ty + 198 * s)} L${n(tx - 78 * s)},${n(ty + 198 * s)} C${n(tx - 76 * s)},${n(ty + 176 * s)} ${n(tx - 70 * s)},${n(ty + 148 * s)} ${n(tx - 58 * s)},${n(ty + 128 * s)} Z`, garment, 3 * s, paint);
      }
    } else if (ch.outfit === 'abaya') {
      stroke(ctx, `M0,${n(top + 0.05 * H)} L${n(sway)},${n(robeHemY)}`, ch.accent, o * 0.9, paint);
      stroke(ctx, `M${n(-r.sw * hemW + sway)},${n(robeHemY - 0.02 * H)} L${n(r.sw * hemW + sway)},${n(robeHemY - 0.02 * H)}`, ch.accent, o * 0.9, paint);
    } else if (ch.outfit === 'omaniDress') {
      // embroidered yoke on the chest
      const yoke = `M${n(-0.1 * H)},${n(top + 0.03 * H)} Q0,${n(top + 0.2 * H)} ${n(0.1 * H)},${n(top + 0.03 * H)} L${n(0.06 * H)},${n(top + 0.01 * H)} Q0,${n(top + 0.13 * H)} ${n(-0.06 * H)},${n(top + 0.01 * H)} Z`;
      cel(ctx, yoke, ch.accent, o * 0.6, paint);
      if (!paint?.sil) {
        for (let i = -3; i <= 3; i++) {
          const x = i * 0.026 * H;
          const y = top + 0.06 * H + (1 - Math.abs(i) / 3.6) * 0.075 * H;
          circle(ctx, x, y, 0.008 * H, darken(ch.accent, 0.35), 0, paint);
        }
      }
      stroke(ctx, `M${n(-r.sw * hemW + sway)},${n(robeHemY - 0.025 * H)} L${n(r.sw * hemW + sway)},${n(robeHemY - 0.025 * H)}`, ch.accent, o * 2.2, paint);
    } else if (ch.outfit === 'school') {
      // white shirt collar above the pinafore
      cel(ctx, `M${n(-0.07 * H)},${n(top - 0.004 * H)} L0,${n(top + 0.06 * H)} L${n(0.07 * H)},${n(top - 0.004 * H)} L${n(0.05 * H)},${n(top + 0.04 * H)} L0,${n(top + 0.08 * H)} L${n(-0.05 * H)},${n(top + 0.04 * H)} Z`, '#f6f3ee', o * 0.6, paint);
      stroke(ctx, `M${n(-r.sw * 0.98)},${n(top + 0.29 * H)} L${n(r.sw * 0.98)},${n(top + 0.29 * H)}`, darken(ch.color, 0.35), o * 1.3, paint);
    }
  }

  // ── arms ──
  const sleeve = sleeveColor(ch);
  const sl = ch.outfit === 'abaya' ? r.sleeve * 1.25 : ch.outfit === 'casual' && !female ? r.sleeve * 0.85 : r.sleeve;
  const sy = top + 0.032 * H;
  const AL = limb([-r.sw * 0.84, sy], -1, pose.armL, r.ua, r.fa);
  const AR = limb([r.sw * 0.84, sy], 1, pose.armR, r.ua, r.fa);
  const shortSleeve = ch.outfit === 'casual' && !female;
  for (const A of [AL, AR]) {
    if (shortSleeve) {
      // sleeve to the elbow, skin forearm
      strokeLimb(ctx, { s: A.e, e: A.e, h: A.h }, skin, sl * 0.62, o, paint);
      strokeLimb(ctx, { s: A.s, e: A.s, h: A.e }, sleeve, sl, o, paint);
    } else {
      strokeLimb(ctx, A, sleeve, sl, o, paint);
    }
    // hide the outline seam where the sleeve meets the body
    circle(ctx, A.s[0], A.s[1], sl / 2 - o * 0.2, sleeve, 0, paint);
  }

  // ── energy orb (power move) ──
  if (pose.orb && !paint?.sil) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    circle(ctx, pose.orb.x, pose.orb.y + drop, pose.orb.r * 2.2, PRACTICAL, 0);
    ctx.globalAlpha = 1;
    circle(ctx, pose.orb.x, pose.orb.y + drop, pose.orb.r, PRACTICAL, 0);
    circle(ctx, pose.orb.x, pose.orb.y + drop, pose.orb.r * 0.45, LINE, 0);
    ctx.restore();
  }

  // ── head ──
  ctx.save();
  ctx.translate(0, r.headCY + drop);
  // undo the shear on the head itself: it travels with the lean but keeps its shape
  if (shear) ctx.transform(1, 0, shear, 1, 0, 0);
  if (pose.headTilt || shear) ctx.rotate(pose.headTilt + shear * 0.8);
  ctx.scale(r.k, r.k);
  drawHead(ctx, {
    skin,
    headwear: headwearFor(ch),
    wear: wearColor(ch),
    accent: ch.accent,
    hair: ch.hair,
    expression: pose.expression,
    gaze: pose.gaze,
    mouthOpen: pose.mouthOpen,
    mouth: pose.mouth,
    blink: pose.blink,
    paint,
    lw: 1,
  });
  ctx.restore();

  // what the hands hold, then the hands themselves: drawn after the head so a palm on the face
  // reads as a palm on the face, not a hand hidden behind it
  if (pose.hold) drawHeld(ctx, pose.hold, [AL.h, AR.h], H, ch.accent, paint);
  for (const [A, shape] of [
    [AL, pose.handL ?? 'open'],
    [AR, pose.handR ?? 'open'],
  ] as const) {
    drawHand(ctx, A.h[0], A.h[1], Math.atan2(A.h[1] - A.e[1], A.h[0] - A.e[0]), shape, r.hand, skin, o * 0.9, paint);
  }
  ctx.restore();

  const sx = 1 / Math.sqrt(pose.stretch);
  const syk = pose.stretch;
  const lx = (x: number, y: number) => (x - shear * y) * sx;
  return {
    headTop: (r.headCY + drop - 372 * r.k) * syk + pose.dy,
    headCY: (r.headCY + drop) * syk + pose.dy,
    hands: [
      [lx(AL.h[0], AL.h[1]), AL.h[1] * syk + pose.dy],
      [lx(AR.h[0], AR.h[1]), AR.h[1] * syk + pose.dy],
    ],
  };
}

export { fill };
