import { describe, expect, it } from 'vitest';
import { parseProjectLoose } from '../domain/sanitize';
import { poseAt } from '../engine/art/poses';
import { REST_RIG } from '../domain/types';

const base = { cast: [{ id: 'c1', kind: 'boy' }] };

describe('director mode, layers and custom poses', () => {
  it('keeps director keyframes within range', () => {
    const { project } = parseProjectLoose({ ...base, shots: [{ direct: { from: { zoom: 9, x: -4, y: 0 }, to: { zoom: 1.5, x: 0.3, y: 0.2 }, ease: 'nope', shake: true } }] });
    const d = project.shots[0].direct!;
    expect(d.from.zoom).toBe(3);
    expect(d.from.x).toBe(-1);
    expect(d.ease).toBe('inout');
    expect(d.shake).toBe(true);
  });
  it('validates hand-posed joints', () => {
    const { project } = parseProjectLoose({ ...base, shots: [{ actors: [{ cast: 'c1', action: 'custom', rig: { from: { armR: [2.7, 0.1], head: 5 }, to: { armR: ['x', 1] } } }] }] });
    const rig = project.shots[0].actors[0].rig!;
    expect(rig.from.armR).toEqual([2.7, 0.1]);
    expect(rig.from.head).toBe(0.6);
    expect(rig.to!.armR).toEqual([REST_RIG.armR[0], 1]);
  });
  it('moves from the first pose to the last and holds', () => {
    const actor = { cast: 'c1', action: 'custom' as const, expression: 'calm' as const, x: 0.5, rig: { from: { ...REST_RIG }, to: { ...REST_RIG, armR: [2.7, 0] as [number, number] } } };
    expect(poseAt(actor, 0, 3, 's', false).pose.armR[0]).toBeCloseTo(REST_RIG.armR[0]);
    expect(poseAt(actor, 2.9, 3, 's', false).pose.armR[0]).toBeCloseTo(2.7);
  });
});
