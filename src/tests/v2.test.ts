import { describe, expect, it } from 'vitest';
import { describeToProject } from '../engine/parser/describe';
import { poseAt } from '../engine/art/poses';

describe('v2 features', () => {
  it('reads anime expressions and running from Arabic', () => {
    const { project } = describeToProject('ولد محرج في الفصل. ثم بنت غاضبة. ثم الولد يركض في الصحراء');
    const ex = project.shots.flatMap((s) => s.actors.map((a) => a.expression));
    const acts = project.shots.flatMap((s) => s.actors.map((a) => a.action));
    expect(ex).toContain('embarrassed');
    expect(ex).toContain('angry');
    expect(acts).toContain('run');
  });
  it('walks and runs in side view, facing the destination', () => {
    const run = poseAt({ cast: 'c', action: 'run', expression: 'calm', x: 0.8, to: 0.2 }, 0.5, 3, 's', false);
    expect(run.pose.side?.facing).toBe(-1);
    expect(run.pose.side?.run).toBe(true);
    const walk = poseAt({ cast: 'c', action: 'walk', expression: 'calm', x: 0.2, to: 0.8 }, 0.5, 4, 's', false);
    expect(walk.pose.side?.facing).toBe(1);
    // arrived: back to the front view
    expect(poseAt({ cast: 'c', action: 'walk', expression: 'calm', x: 0.2, to: 0.8 }, 3.9, 4, 's', false).pose.side).toBeUndefined();
  });
  it('writes the lesson topic on the classroom board, never placeholder text', () => {
    const { project } = describeToProject('في الفصل معلمة تقول «اليوم نتعلم حرف الضاد»');
    expect(project.shots.every((s) => s.place !== 'classroom' || s.board === 'حرف الضاد')).toBe(true);
  });
  it('maps voice energy to three mouth drawings', () => {
    const p = poseAt({ cast: 'c', action: 'talk', expression: 'calm', x: 0.5 }, 1, 3, 's', true, 1);
    expect(p.pose.mouth).toBe(1);
    expect(p.pose.mouthOpen).toBe(false);
  });
});
