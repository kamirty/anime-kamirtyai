import { describe, expect, it } from 'vitest';
import { MOTIONS, applyMotion } from '../engine/motions';
import { describeToProject } from '../engine/parser/describe';
import { parseProject } from '../domain/sanitize';
import { renderFrame } from '../engine/renderer/renderFrame';
import { poseAt } from '../engine/art/poses';

describe('motion library', () => {
  it('has exactly 50 motions with unique ids', () => {
    expect(MOTIONS).toHaveLength(50);
    expect(new Set(MOTIONS.map((m) => m.id)).size).toBe(50);
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
