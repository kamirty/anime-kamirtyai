import type { Actor, Expression, HandShape } from '../../domain/types';
import { restPose, type Pose } from './body';
import { clamp, easeInOut, easeOut, hash, onTwos } from './paint';
import { AT, MID, armTo, bothTo } from './reach';

/**
 * Actions as drawings over time. Acting is on twos (each drawing held 2 frames), holds are real holds,
 * and the expensive moves (jump, power) use anticipation, smear drawings and a settle.
 */

export interface PowerState {
  phase: 'ready' | 'crouch' | 'launch' | 'rise' | 'spin' | 'release' | 'impact' | 'land';
  /** 0..1 progress of the crescent wave toward the target. */
  wave: number;
  /** Impact flash frame index (0, 1, 2 …) while phase === 'impact'. */
  flash: number;
  /** True once the hit has landed (shards, glow). */
  hit: boolean;
  /** Seconds since impact. */
  since: number;
}

export interface PoseResult {
  pose: Pose;
  /** Horizontal position override (walk), 0..1 */
  x: number;
  power?: PowerState;
  /** Frame-accurate event times (seconds, shot-local) for sound effects. */
}

const F = 1 / 24;

/** Power move timeline in seconds. */
export const POWER = { crouch: 0.6, launch: 0.77, rise: 0.85, spin: 1.5, release: 1.75, impact: 2.55, land: 2.8 };
/** Jump timeline in seconds. */
export const JUMP = { crouch: 0.3, launch: 0.47, air: 0.55, land: 1.2, settle: 1.33 };

function blinkAt(t: number, seed: number): boolean {
  const period = 2.6 + (seed % 7) * 0.17;
  const p = (t + (seed % 13) * 0.11) % period;
  return p > period - 2 * F;
}

function gazeFor(e: Expression, seed: number): { x: number; y: number } {
  if (e === 'look' || e === 'happy') return { x: 0, y: 0 };
  return { x: (seed % 2 ? 1 : -1) * 6, y: -6 };
}

/** Sets the hand shapes for a built-in action, unless the actor already names its own. */
function hands(p: Pose, actor: Actor, l?: HandShape, r?: HandShape) {
  if (actor.hands) return;
  if (l) p.handL = l;
  if (r) p.handR = r;
}

export function poseAt(actor: Actor, t: number, duration: number, seed0: string, speaking: boolean, mouthLevel?: number): PoseResult {
  const seed = hash(seed0);
  const tq = onTwos(t);
  const p = restPose(actor.expression);
  p.gaze = gazeFor(actor.expression, seed);
  p.blink = blinkAt(t, seed);
  if (actor.hold) p.hold = actor.hold;
  if (actor.hands) {
    p.handL = actor.hands[0];
    p.handR = actor.hands[1];
  } else if (actor.hold) {
    // whatever is being carried is gripped
    p.handL = actor.hold === 'book' ? 'grip' : 'open';
    p.handR = 'grip';
  }
  let x = actor.x;
  // facing: point toward the frame centre
  const toCentre: 1 | -1 = actor.x > 0.5 ? -1 : 1;

  switch (actor.action) {
    case 'stand':
      break;
    case 'walk':
    case 'run': {
      // side view: an 8-drawing walk or a 6-drawing run, on twos
      const run = actor.action === 'run';
      const to = actor.to ?? (actor.x < 0.5 ? 0.8 : 0.2);
      const travelTime = Math.max(0.5, (run ? 0.75 : 1) * (duration - 0.6));
      const travel = clamp(tq / travelTime, 0, 1);
      x = actor.x + (to - actor.x) * travel;
      if (travel < 1) {
        const drawings = run ? 6 : 8;
        const phase = (Math.floor((t * 24) / 2) % drawings) / drawings;
        p.side = { facing: to >= actor.x ? 1 : -1, phase, run };
        if (run && actor.expression === 'calm') p.expression = 'set';
      }
      break;
    }
    case 'dance': {
      const cyc = Math.floor(t * 24 / 5) % 4;
      p.dy = cyc % 2 ? -42 : 0;
      p.lean = (cyc < 2 ? -1 : 1) * 0.09;
      p.headTilt = (cyc < 2 ? 1 : -1) * 0.08;
      p.armL = [cyc % 2 ? 1.9 : 2.8, 0.2];
      p.armR = [cyc % 2 ? 2.8 : 1.9, 0.2];
      p.hem = cyc % 2 ? 0.3 : -0.3;
      if (actor.expression === 'calm') p.expression = 'happy';
      break;
    }
    case 'custom': {
      // hand-posed joints; with an end pose the body moves there on twos, then holds
      const rig = actor.rig;
      if (!rig) break;
      const to = rig.to ?? rig.from;
      // looping gestures ping-pong between the two poses; the rest move once and hold
      const k = rig.loop && rig.to ? 0.5 - 0.5 * Math.cos(((tq % rig.loop) / rig.loop) * Math.PI * 2) : easeInOut(clamp(tq / Math.max(0.3, duration * 0.6), 0, 1));
      const mix = (a: number, b: number) => a + (b - a) * k;
      const mixJ = (a: [number, number], b: [number, number]): [number, number] => [mix(a[0], b[0]), mix(a[1], b[1])];
      p.armL = mixJ(rig.from.armL, to.armL);
      p.armR = mixJ(rig.from.armR, to.armR);
      p.legL = mixJ(rig.from.legL, to.legL);
      p.legR = mixJ(rig.from.legR, to.legR);
      p.headTilt = mix(rig.from.head, to.head);
      p.lean = mix(rig.from.lean, to.lean);
      p.crouch = mix(rig.from.crouch, to.crouch);
      p.dy = -mix(rig.from.lift ?? 0, to.lift ?? 0) * 300;
      break;
    }
    case 'nod': {
      const step = Math.floor(t * 24 / 6) % 4;
      p.headTilt = step === 1 ? 0.11 : step === 3 ? -0.03 : 0;
      p.gaze = { x: 0, y: step === 1 ? 10 : 0 };
      break;
    }
    case 'wave': {
      const cyc = Math.floor((t * 24) / 4) % 4;
      // the hand swings beside the head, elbow up
      const outs = [0.08, 0.13, 0.18, 0.13];
      const hand = armTo(outs[cyc], AT.eye - 0.05);
      if (toCentre > 0) p.armR = hand;
      else p.armL = hand;
      hands(p, actor, toCentre > 0 ? undefined : 'flat', toCentre > 0 ? 'flat' : undefined);
      if (actor.expression === 'calm') p.expression = 'look';
      p.gaze = { x: 0, y: 0 };
      p.headTilt = 0.04 * toCentre;
      break;
    }
    case 'talk': {
      const cyc = Math.floor((t * 24) / 6) % 4;
      // open hands in front of the body, not thrown out to the sides
      p.armR = armTo(0.17 + (cyc % 2) * 0.02, AT.chest + 0.04 + (cyc === 2 ? 0.03 : 0));
      p.armL = armTo(0.14, AT.waist + 0.03 + (cyc === 3 ? -0.04 : 0));
      p.gaze = { x: 0, y: 0 };
      break;
    }
    case 'point': {
      // the arm reaches out toward the middle of the frame, a little below shoulder height
      const hand = armTo(0.26, AT.shoulder + 0.05);
      if (toCentre > 0) {
        p.armR = hand;
        p.gaze = { x: 14, y: -2 };
        hands(p, actor, undefined, 'point');
      } else {
        p.armL = hand;
        p.gaze = { x: -14, y: -2 };
        hands(p, actor, 'point', undefined);
      }
      p.headTilt = 0.03 * toCentre;
      break;
    }
    case 'greet': {
      // palm flat on the chest, over the heart
      p.armR = armTo(MID + 0.03, AT.chest + 0.01);
      p.armL = armTo(0.04, AT.hip);
      hands(p, actor, 'open', 'flat');
      p.headTilt = 0.06;
      if (actor.expression === 'calm') p.expression = 'happy';
      break;
    }
    case 'think': {
      // right hand at the chin, left hand under the right elbow
      p.armR = armTo(MID + 0.07, AT.chin + 0.02);
      p.armL = armTo(MID + 0.09, AT.belly + 0.02);
      hands(p, actor, 'flat', 'fist');
      p.gaze = { x: 10, y: -14 };
      p.headTilt = -0.05;
      break;
    }
    case 'clap': {
      // both hands meet on the midline, then open a little
      const together = Math.floor((t * 24) / 3) % 2 === 0;
      hands(p, actor, 'flat', 'flat');
      const j = bothTo(together ? MID + 0.01 : MID + 0.07, AT.chest + 0.02);
      p.armL = j.armL;
      p.armR = j.armR;
      if (actor.expression === 'calm') p.expression = 'happy';
      p.mouthOpen = true;
      break;
    }
    case 'cheer': {
      const cyc = Math.floor((t * 24) / 4) % 3;
      const j = bothTo(0.055, AT.overhead + 0.02);
      p.armL = j.armL;
      p.armR = j.armR;
      p.dy = cyc === 1 ? -55 : cyc === 2 ? -20 : 0;
      if (actor.expression === 'calm') p.expression = 'happy';
      p.mouthOpen = true;
      break;
    }
    case 'jump': {
      const tt = tq % Math.max(2.4, duration);
      if (tt < JUMP.crouch) break;
      if (tt < JUMP.launch) {
        p.crouch = 0.7;
        p.armL = armTo(0.06, AT.hip + 0.02);
        p.armR = armTo(0.06, AT.hip + 0.02);
        break;
      }
      if (tt < JUMP.air) {
        p.stretch = 1.18;
        p.dy = -90;
        p.armL = [2.8, 0];
        p.armR = [2.8, 0];
        break;
      }
      if (tt < JUMP.land) {
        const q = (tt - JUMP.air) / (JUMP.land - JUMP.air);
        p.dy = -Math.sin(Math.PI * q) * 360 - 40 * (1 - q);
        p.armL = [2.4, 0.3];
        p.armR = [2.4, 0.3];
        p.legL = [0.3, -0.6];
        p.legR = [0.3, -0.6];
        p.hem = 0.5;
        if (actor.expression === 'calm') p.expression = 'happy';
        p.mouthOpen = true;
        break;
      }
      if (tt < JUMP.settle) {
        p.crouch = 0.45;
        p.armL = [0.6, 0.2];
        p.armR = [0.6, 0.2];
      }
      break;
    }
    case 'power':
      return powerPose(actor, t, x);
  }

  if (speaking) {
    // mouth flaps on twos with a pause every few drawings
    const step = Math.floor((t * 24) / 3);
    if (mouthLevel !== undefined) {
      // recorded voice: closed, half or open, following the loudness
      p.mouth = mouthLevel;
      p.mouthOpen = false;
    } else p.mouthOpen = step % 2 === 0 && step % 7 !== 6;
    if (p.expression === 'happy') p.expression = 'look';
    if (!p.side) p.gaze = { x: 0, y: 0 };
  }
  return { pose: p, x };
}

function powerPose(actor: Actor, t: number, x: number): PoseResult {
  const tq = onTwos(t);
  const p = restPose('set');
  p.gaze = { x: 0, y: -12 };
  const st: PowerState = { phase: 'ready', wave: 0, flash: 0, hit: false, since: 0 };
  if (t < POWER.crouch) {
    p.armL = armTo(MID + 0.06, AT.belly);
    p.armR = armTo(MID + 0.06, AT.belly);
    p.handL = 'open';
    p.handR = 'open';
    p.orb = { x: 0, y: -560, r: 22 + 10 * Math.sin(t * 24 * 0.9) };
    st.phase = 'ready';
  } else if (t < POWER.launch) {
    p.crouch = 0.8;
    p.armL = armTo(0.05, AT.hip);
    p.armR = armTo(0.05, AT.hip);
    p.orb = { x: 0, y: -470, r: 30 };
    st.phase = 'crouch';
  } else if (t < POWER.rise) {
    p.stretch = 1.3;
    p.dy = -120;
    p.armL = [2.9, 0];
    p.armR = [2.9, 0];
    st.phase = 'launch';
  } else if (t < POWER.spin) {
    const q = easeOut(clamp((tq - POWER.rise) / (POWER.spin - POWER.rise), 0, 1));
    p.dy = -200 - q * 520;
    p.crouch = 0.35;
    p.armL = [0.9, 1.7];
    p.armR = [0.9, 1.7];
    p.legL = [0.4, -0.8];
    p.legR = [0.4, -0.8];
    p.orb = { x: 0, y: -620, r: 34 };
    p.hem = 0.8;
    st.phase = 'rise';
  } else if (t < POWER.release) {
    p.dy = -720;
    p.stretch = 1.12;
    p.lean = 0.35 * Math.sin(t * 40);
    p.armL = [2.2, 0.6];
    p.armR = [1.2, 0.9];
    st.phase = 'spin';
  } else if (t < POWER.impact) {
    p.dy = -700;
    p.stretch = 1.06;
    p.armL = [3.0, 0];
    p.armR = [3.0, 0];
    p.hem = -0.8;
    st.phase = 'release';
    st.wave = Math.pow(clamp((t - POWER.release) / (POWER.impact - POWER.release), 0, 1), 1.8);
  } else if (t < POWER.land) {
    p.dy = -700;
    p.armL = [3.0, 0];
    p.armR = [3.0, 0];
    st.phase = 'impact';
    st.flash = Math.floor((t - POWER.impact) * 24);
    st.hit = true;
  } else {
    p.crouch = 0.6;
    p.armL = armTo(0.1, AT.hip + 0.02);
    p.armR = armTo(0.02, AT.hip + 0.06);
    p.gaze = { x: 0, y: -16 };
    p.headTilt = -0.05;
    st.phase = 'land';
    st.hit = true;
    st.since = t - POWER.land;
    if (actor.expression === 'happy') p.expression = 'happy';
  }
  return { pose: p, x, power: st };
}
