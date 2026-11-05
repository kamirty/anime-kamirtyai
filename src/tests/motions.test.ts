import { describe, expect, it } from 'vitest';
import { MOTIONS, MOTION_CATEGORIES, applyMotion } from '../engine/motions';
import { AT, armTo, handAt } from '../engine/art/reach';
import { describeToProject } from '../engine/parser/describe';
import { parseProject } from '../domain/sanitize';
import { renderFrame } from '../engine/renderer/renderFrame';
import { poseAt } from '../engine/art/poses';

describe('motion library', () => {
  it('has exactly 100 motions with unique ids in known categories', () => {
    expect(MOTIONS).toHaveLength(100);
    expect(new Set(MOTIONS.map((m) => m.id)).size).toBe(100);
    const cats = new Set(MOTION_CATEGORIES.map((c) => c.id));
    for (const m of MOTIONS) expect(cats.has(m.cat)).toBe(true);
    // every category is worth opening
    for (const c of MOTION_CATEGORIES) expect(MOTIONS.filter((m) => m.cat === c.id).length).toBeGreaterThan(8);
  });
  it('puts the hand where the pose asks, on both arms', () => {
    for (const [out, down] of [
      [AT.shoulder - 0.1, AT.chest],
      [0.02, AT.chin],
      [0.2, AT.waist],
      [-0.05, AT.eye],
      [0.06, AT.overhead],
      [0.09, AT.hip],
    ]) {
      const got = handAt(armTo(out, down));
      expect(Math.hypot(got.out - out, got.down - down)).toBeLessThan(0.001);
    }
  });
  it('changes only motion: place, characters, outfits, text and effects stay', () => {
    const { project } = describeToProject('ولد بالدشداشة في المزرعة صباحاً يقول «مرحبا» ثم تظهر عبارة أهلاً بكم');
    const idx = project.shots.findIndex((s) => s.actors.length > 0);
    for (const m of MOTIONS) {
      const next = applyMotion(project, idx, m.id);
      const a = project.shots[idx];
      const b = next.shots[idx];
      expect(b.place).toBe(a.place);
      expect(b.time).toBe(a.time);
      expect(b.text).toEqual(a.text);
      expect(b.effects).toEqual(a.effects);
      expect(b.dialogue).toEqual(a.dialogue);
      expect(b.actors.map((x) => x.cast)).toEqual(a.actors.map((x) => x.cast));
      expect(next.cast).toBe(project.cast);
      // survives a save/load round trip
      const again = parseProject(JSON.parse(JSON.stringify(next)));
      expect(again.shots[idx].actors.map((x) => x.action)).toEqual(b.actors.map((x) => x.action));
      expect(again.shots[idx].actors.map((x) => x.hold)).toEqual(b.actors.map((x) => x.hold));
    }
  });
  it('every motion poses without errors over a whole shot', () => {
    for (const m of MOTIONS.filter((x) => !x.cam)) {
      const { project } = describeToProject('ولد في المزرعة');
      const next = applyMotion(project, project.shots.length - 1, m.id);
      const actor = next.shots[next.shots.length - 1].actors[0];
      for (let f = 0; f < 72; f += 5) {
        const p = poseAt(actor, f / 24, 3, 's', false).pose;
        expect(Number.isFinite(p.armR[0]) && Number.isFinite(p.dy)).toBe(true);
      }
    }
  });
  it('camera motions set director keyframes only', () => {
    const { project } = describeToProject('ولد في المزرعة');
    const next = applyMotion(project, 0, 'cam-shake');
    expect(next.shots[0].direct?.shake).toBe(true);
    expect(next.shots[0].actors).toEqual(project.shots[0].actors);
    void renderFrame;
  });
});
