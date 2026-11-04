import { FPS, type Project, type Shot } from './types';

export const shotFrames = (shot: Shot): number => Math.max(1, Math.round(shot.duration * FPS));

export const totalFrames = (project: Project): number => project.shots.reduce((n, s) => n + shotFrames(s), 0);

export const totalSeconds = (project: Project): number => totalFrames(project) / FPS;

export const frameToSeconds = (frame: number): number => frame / FPS;

export interface ShotAt {
  index: number;
  shot: Shot;
  /** First frame of the shot. */
  start: number;
  frames: number;
  /** Frame inside the shot. */
  local: number;
}

/** The shot that owns `frame` (clamped to the last frame). */
export function shotAt(project: Project, frame: number): ShotAt {
  let start = 0;
  for (let i = 0; i < project.shots.length; i++) {
    const frames = shotFrames(project.shots[i]);
    if (frame < start + frames || i === project.shots.length - 1) {
      return { index: i, shot: project.shots[i], start, frames, local: Math.min(frames - 1, Math.max(0, frame - start)) };
    }
    start += frames;
  }
  throw new Error('project has no shots');
}

export function shotStarts(project: Project): number[] {
  const out: number[] = [];
  let s = 0;
  for (const shot of project.shots) {
    out.push(s);
    s += shotFrames(shot);
  }
  return out;
}

export const fmtTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
