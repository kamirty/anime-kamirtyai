import { describe, expect, it } from 'vitest';
import { buildSoundtrack } from '../engine/audio/soundtrack';
import { describeToProject } from '../engine/parser/describe';

describe('soundtrack', () => {
  it('is deterministic, the right length, and under the ceiling', () => {
    const { project } = describeToProject('ولد فوق قلعة نزوى ليلاً يضرب القمر ليظهر عبارة كل عام وعُماننا بخير .. اليوم الوطني 56');
    const t0 = performance.now();
    const a = buildSoundtrack(project);
    const ms = performance.now() - t0;
    const b = buildSoundtrack(project);
    const secs = project.shots.reduce((n, s) => n + Math.round(s.duration * 24), 0) / 24;
    expect(a.L.length).toBe(Math.round(secs * 48000));
    let peak = 0, sum = 0;
    for (let i = 0; i < a.L.length; i++) { peak = Math.max(peak, Math.abs(a.L[i])); sum += a.L[i] * a.L[i]; }
    console.log('seconds', secs, 'build ms', Math.round(ms), 'peak', peak.toFixed(3), 'rms', Math.sqrt(sum / a.L.length).toFixed(3));
    expect(peak).toBeLessThan(0.9);
    expect(Math.sqrt(sum / a.L.length)).toBeGreaterThan(0.02);
    expect(a.L[123456]).toBe(b.L[123456]);
  });
});
