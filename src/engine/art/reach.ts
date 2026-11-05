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

/**
 * Heights measured down from the shoulder (negative is above it), in body heights.
 * Taken from the head drawing: the face spans crown −285 to chin 300 in head units at a scale
 * of 0.3, so the mouth, eyes and brow sit far higher above the shoulder than they look on paper.
 * Children have larger heads, so their face is a little higher again; these sit between the two.
 */
export const AT = {
  overhead: -0.3,
  crown: -0.262,
  brow: -0.212,
  eye: -0.178,
  ear: -0.17,
  mouth: -0.126,
  chin: -0.082,
  neck: -0.03,
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
 *
 * Two elbow positions reach any point. A real arm picks the one gravity picks — the lower of
 * the two — but never one that would drive the elbow through the body, so the elbow must stay
 * outside the shoulder. That single rule gives a straight arm when pointing, a hanging elbow
 * when gesturing at the waist, and a raised elbow when the hand goes to the face.
 */
export function armTo(out: number, down: number, elbow?: 1 | -1): Joint {
  const len = Math.hypot(out, down) || 1e-6;
  const d = clamp(len, MIN, MAX);
  const ox = (out / len) * d;
  const oy = (down / len) * d;
  const toward = Math.atan2(ox, oy);
  const spread = Math.acos(clamp((d * d + UA * UA - FA * FA) / (2 * d * UA), -1, 1));
  const pick = (a: number): Joint => {
    const ex = Math.sin(a) * UA;
    const ey = Math.cos(a) * UA;
    return [r3(a), r3(Math.atan2(ox - ex, oy - ey) - a)];
  };
  if (elbow) return pick(toward + elbow * spread);
  const options = [toward + spread, toward - spread].map((a) => ({ a, out: Math.sin(a) * UA, down: Math.cos(a) * UA }));
  // the elbow may not sit inside the torso; of what is left, the lower one wins
  const clear = options.filter((o) => o.out >= -0.025);
  const best = (clear.length ? clear : options).reduce((m, o) => (clear.length ? (o.down > m.down ? o : m) : o.out > m.out ? o : m));
  return pick(best.a);
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
