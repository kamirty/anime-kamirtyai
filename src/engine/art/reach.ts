import type { Joint } from '../../domain/types';

/**
 * Where the hand goes, not what the angles are.
 *
 * An arm is stored as [upper-arm angle, elbow bend], and a positive bend always swings the
 * forearm further *outward*. Posing by hand therefore sent every folded pose — a hand on the
 * chest, at the chin, two hands clapping — out to the side instead of in to the body.
 * `armTo` solves the two-bone chain instead: give it the point the hand must reach and it
 * returns the angles that put it there, with the elbow on the natural side.
 *
 * Frame: `out` is sideways, away from the body's midline (negative crosses the chest);
 * `down` is below the shoulder (negative is above it). Both are fractions of body height,
 * so one number fits adults and children, and the left and right arms mirror each other.
 */

/** Upper arm and forearm lengths, matching `rig()` in body.ts. */
const UA = 0.165;
const FA = 0.15;
const MIN = Math.abs(UA - FA) + 0.006;
const MAX = UA + FA - 0.004;

/** Sideways distance from the midline to a shoulder. */
export const SHOULDER = 0.1;
/** `out` of the body's midline, for hands that cross the chest. */
export const MID = -SHOULDER;

/** Heights measured down from the shoulder (negative is above it). */
export const AT = {
  overhead: -0.3,
  crown: -0.26,
  eye: -0.14,
  brow: -0.115,
  ear: -0.115,
  chin: -0.082,
  mouth: -0.055,
  neck: -0.02,
  shoulder: 0,
  chest: 0.07,
  waist: 0.14,
  belly: 0.185,
  hip: 0.27,
} as const;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Angles that put the hand at (out, down).
 * The elbow stays outside the shoulder-to-hand line; by default it hangs low for hands at or
 * below shoulder height and lifts for hands above it, which is how a real arm folds.
 */
export function armTo(out: number, down: number, elbow?: 1 | -1): Joint {
  const len = Math.hypot(out, down) || 1e-6;
  const d = clamp(len, MIN, MAX);
  const ox = (out / len) * d;
  const oy = (down / len) * d;
  const toward = Math.atan2(ox, oy);
  const spread = Math.acos(clamp((d * d + UA * UA - FA * FA) / (2 * d * UA), -1, 1));
  const side = elbow ?? (down >= -0.04 ? 1 : -1);
  const a = toward + side * spread;
  const ex = Math.sin(a) * UA;
  const ey = Math.cos(a) * UA;
  const f = Math.atan2(ox - ex, oy - ey);
  return [r3(a), r3(f - a)];
}

/** Where `armTo` actually lands the hand, for tests and for the pose editor. */
export function handAt(angles: Joint): { out: number; down: number } {
  const [a, b] = angles;
  return { out: Math.sin(a) * UA + Math.sin(a + b) * FA, down: Math.cos(a) * UA + Math.cos(a + b) * FA };
}

/** Both hands meeting at the same point in front of the body (clapping, holding, praying). */
export function bothTo(out: number, down: number, elbow?: 1 | -1): { armL: Joint; armR: Joint } {
  const j = armTo(out, down, elbow);
  return { armL: j, armR: j };
}
