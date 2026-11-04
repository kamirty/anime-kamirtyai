import { describe, expect, it } from 'vitest';
import { describeToProject } from '../engine/parser/describe';
import { lipLevels, levelAt } from '../engine/audio/lipsync';
import { parseProjectLoose } from '../domain/sanitize';

describe('v2 features', () => {
  it('reads anime expressions and running from Arabic', () => {
    const { project } = describeToProject('ولد محرج في الفصل. ثم بنت غاضبة. ثم الولد يركض في الصحراء');
    const ex = project.shots.flatMap((s) => s.actors.map((a) => a.expression));
    const acts = project.shots.flatMap((s) => s.actors.map((a) => a.action));
    expect(ex).toContain('embarrassed');
    expect(ex).toContain('angry');
    expect(acts).toContain('run');
  });
  it('turns loudness into mouth levels on twos', () => {
    const sr = 48000;
    const pcm = new Float32Array(sr);
    for (let i = sr * 0.25; i < sr * 0.75; i++) pcm[i] = Math.sin(i * 0.05) * 0.8;
    const lv = lipLevels(pcm, sr, 24);
    expect(lv.length).toBe(24);
    expect(lv[0]).toBe('0');
    expect(lv[12]).toBe('2');
    for (let i = 0; i < lv.length; i += 2) expect(lv[i]).toBe(lv[i + 1] ?? lv[i]);
    expect(levelAt(lv, 6 + 12)).toBe(2);
    expect(levelAt(lv, 2)).toBeUndefined();
  });
  it('keeps valid voices and drops malformed ones', () => {
    const base = { cast: [{ id: 'c1', kind: 'boy' }], shots: [{ actors: [{ cast: 'c1' }], dialogue: { actor: 0, text: 'مرحبا' }, voice: { id: 'v1', levels: '0011220' } }, { voice: { id: 'v2', levels: '<script>' } }] };
    const { project } = parseProjectLoose(base);
    expect(project.shots[0].voice?.levels).toBe('0011220');
    expect(project.shots[1].voice).toBeUndefined();
  });
});
