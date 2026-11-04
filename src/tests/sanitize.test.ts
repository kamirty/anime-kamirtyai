import { describe, expect, it } from 'vitest';
import { extractJson, parseProjectLoose } from '../domain/sanitize';
import { totalFrames, shotAt } from '../domain/timeline';

const base = { cast: [{ id: 'c1', kind: 'boy', outfit: 'dishdasha' }], shots: [{ duration: 3, place: 'fort', actors: [{ cast: 'c1', action: 'power', x: 0.5 }] }] };

describe('sanitize', () => {
  it('enforces minimum durations per action and clamps values', () => {
    const { project } = parseProjectLoose(base);
    expect(project.shots[0].duration).toBeGreaterThanOrEqual(4);
    expect(totalFrames(project)).toBe(Math.round(project.shots[0].duration * 24));
  });
  it('drops actors pointing at unknown cast and unknown enums fall back', () => {
    const { project } = parseProjectLoose({ ...base, shots: [{ place: 'mars', time: 'noon', actors: [{ cast: 'zz' }] }] });
    expect(project.shots[0].place).toBe('fort');
    expect(project.shots[0].time).toBe('night');
    expect(project.shots[0].actors).toHaveLength(0);
  });
  it('rejects anything but SVG path data in props', () => {
    const { project, warnings } = parseProjectLoose({
      ...base,
      props: [
        { id: 'p1', parts: [{ d: 'M0,0 L10,10 Z', fill: '#ff0000' }, { d: 'javascript:alert(1)' }, { d: '<script>' }] },
        { id: 'p2', parts: [{ d: 'url(x)' }] },
      ],
    });
    expect(project.props).toHaveLength(1);
    expect(project.props[0].parts).toHaveLength(1);
    expect(warnings.length).toBe(1);
  });
  it('fixes outfits that do not fit the character', () => {
    const { project } = parseProjectLoose({ ...base, cast: [{ id: 'c1', kind: 'girl', outfit: 'massar' }] });
    expect(project.cast[0].outfit).not.toBe('massar');
  });
  it('extracts JSON from a fenced reply', () => {
    expect(extractJson('هذا المشهد:\n```json\n{"a":1}\n```\nبالتوفيق')).toEqual({ a: 1 });
    expect(() => extractJson('لا شيء هنا')).toThrow();
  });
  it('caps total length at 120 seconds', () => {
    const shots = Array.from({ length: 30 }, () => ({ duration: 15, place: 'sea' }));
    const { project } = parseProjectLoose({ ...base, shots });
    expect(project.shots.reduce((n, s) => n + s.duration, 0)).toBeLessThanOrEqual(120);
    expect(shotAt(project, 99999).index).toBe(project.shots.length - 1);
  });
});
