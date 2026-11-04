import type { Actor, Expression } from '../../domain/types';
import { restPose, type Pose } from './body';
import { clamp, easeOut, hash, onTwos } from './paint';

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

export function poseAt(actor: Actor, t: number, duration: number, seed0: string, speaking: boolean): PoseResult {
  const seed = hash(seed0);
  const tq = onTwos(t);
  const p = restPose(actor.expression);
  p.gaze = gazeFor(actor.expression, seed);
  p.blink = blinkAt(t, seed);
  let x = actor.x;
  // facing: point toward the frame centre
  const toCentre: 1 | -1 = actor.x > 0.5 ? -1 : 1;

  switch (actor.action) {
    case 'stand':
      break;
    case 'walk': {
      const to = actor.to ?? (actor.x < 0.5 ? 0.7 : 0.3);
      const travel = clamp(tq / Math.max(0.5, duration - 0.6), 0, 1);
      x = actor.x + (to - actor.x) * travel;
      const moving = travel < 1;
      if (moving) {
        const cyc = Math.floor((t * 24) / 4) % 4; // four drawings, 4 frames each
        const side = to > actor.x ? 1 : -1;
        p.dy = cyc % 2 ? -0.014 * 1000 : 0;
        const a = cyc === 0 ? 1 : cyc === 2 ? -1 : 0;
        p.feet = [a * 30 * side, -a * 30 * side, cyc === 1 ? 14 : 0, cyc === 3 ? 14 : 0];
        p.legL = [0.04 + a * 0.22, a < 0 ? 0.25 : 0];
        p.legR = [0.04 - a * 0.22, a > 0 ? 0.25 : 0];
        p.armL = [0.12 - a * 0.25, 0.1];
        p.armR = [0.12 + a * 0.25, 0.1];
        p.hem = a * 0.6;
        p.lean = side * 0.03;
        p.gaze = { x: side * 10, y: 0 };
      }
      break;
    }
    case 'wave': {
      const cyc = Math.floor((t * 24) / 4) % 4;
      const bends = [-0.55, -0.15, 0.3, -0.15];
      if (toCentre > 0) p.armR = [2.55, bends[cyc]];
      else p.armL = [2.55, bends[cyc]];
      if (actor.expression === 'calm') p.expression = 'look';
      p.gaze = { x: 0, y: 0 };
      p.headTilt = 0.04 * toCentre;
      break;
    }
    case 'talk': {
      const cyc = Math.floor((t * 24) / 6) % 4;
      p.armR = [0.55 + (cyc % 2) * 0.12, 1.1 - (cyc === 2 ? 0.25 : 0)];
      p.armL = [0.3, 0.5 + (cyc === 3 ? 0.2 : 0)];
      p.gaze = { x: 0, y: 0 };
      break;
    }
    case 'point': {
      if (toCentre > 0) {
        p.armR = [1.5, 0.02];
        p.gaze = { x: 14, y: -2 };
      } else {
        p.armL = [1.5, 0.02];
        p.gaze = { x: -14, y: -2 };
      }
      p.headTilt = 0.03 * toCentre;
      break;
    }
    case 'greet': {
      p.armR = [-0.3, 2.0];
      p.headTilt = 0.06;
      if (actor.expression === 'calm') p.expression = 'happy';
      break;
    }
    case 'think': {
      p.armR = [-0.15, 2.55];
      p.armL = [-0.42, 1.25];
      p.gaze = { x: 10, y: -14 };
      p.headTilt = -0.05;
      break;
    }
    case 'clap': {
      const together = Math.floor((t * 24) / 3) % 2 === 0;
      p.armL = [-0.15, together ? 1.75 : 1.35];
      p.armR = [-0.15, together ? 1.75 : 1.35];
      if (actor.expression === 'calm') p.expression = 'happy';
      p.mouthOpen = true;
      break;
    }
    case 'cheer': {
      const cyc = Math.floor((t * 24) / 4) % 3;
      p.armL = [2.75, 0.18];
      p.armR = [2.75, 0.18];
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
        p.armL = [-0.25, 0.4];
        p.armR = [-0.25, 0.4];
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
    p.mouthOpen = step % 2 === 0 && step % 7 !== 6;
    if (p.expression === 'happy') p.expression = 'look';
    p.gaze = { x: 0, y: 0 };
  }
  return { pose: p, x };
}

function powerPose(actor: Actor, t: number, x: number): PoseResult {
  const tq = onTwos(t);
  const p = restPose('set');
  p.gaze = { x: 0, y: -12 };
  const st: PowerState = { phase: 'ready', wave: 0, flash: 0, hit: false, since: 0 };
  if (t < POWER.crouch) {
    p.armL = [-0.35, 1.55];
    p.armR = [-0.35, 1.55];
    p.orb = { x: 0, y: -560, r: 22 + 10 * Math.sin(t * 24 * 0.9) };
    st.phase = 'ready';
  } else if (t < POWER.launch) {
    p.crouch = 0.8;
    p.armL = [-0.1, 0.6];
    p.armR = [-0.1, 0.6];
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
    p.armL = [0.5, 0.3];
    p.armR = [0.25, 1.6];
    p.gaze = { x: 0, y: -16 };
    p.headTilt = -0.05;
    st.phase = 'land';
    st.hit = true;
    st.since = t - POWER.land;
    if (actor.expression === 'happy') p.expression = 'happy';
  }
  return { pose: p, x, power: st };
}
