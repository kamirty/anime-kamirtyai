import { describe, expect, it } from 'vitest';
import { encodeIndexedGif } from '../engine/export/gif';
import { createLipSync } from '../engine/audio/lipsync';
import { poseAt } from '../engine/art/poses';

describe('new creator tools', () => {
  it('encodes a self-contained GIF with a loop extension and a trailer', async () => {
    const pixel = new Uint8Array(20 * 12).fill(34);
    const blob = encodeIndexedGif(20, 12, [pixel, new Uint8Array(20 * 12).fill(250)], 8);
    expect(blob.type).toBe('image/gif');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe('GIF89a');
    expect(bytes[6]).toBe(20);
    expect(bytes[8]).toBe(12);
    expect(bytes[bytes.length - 1]).toBe(0x3b);
    expect(new TextDecoder().decode(bytes).includes('NETSCAPE2.0')).toBe(true);
  });
  it('rejects invalid GIF frame sizes', () => {
    expect(() => encodeIndexedGif(10, 10, [new Uint8Array(4)])).toThrow();
  });
  it('creates a mouth envelope from voice energy aligned to frames', () => {
    const n = 48000;
    const silent = new Float32Array(n);
    const active = new Float32Array(n);
    active.fill(0.4, 24000, 32000);
    const tracks = createLipSync({ shot1: { L: active, R: active }, shot2: { L: silent, R: silent } });
    expect(tracks.shot1.length).toBe(24);
    expect(tracks.shot1[0]).toBe(0);
    expect(tracks.shot1[14]).toBeGreaterThan(0.9);
    expect(tracks.shot2.every((x) => x === 0)).toBe(true);
  });
  it('new poses change movement or expression and remain deterministic', () => {
    const actor = { cast: 'c1', action: 'run' as const, expression: 'calm' as const, x: 0.2, to: 0.9 };
    expect(poseAt(actor, 1, 3, 'fixed', false).x).toBeGreaterThan(actor.x);
    const dancer = poseAt({ ...actor, action: 'dance' }, 0.6, 3, 'fixed', false);
    expect(dancer.pose.armL).not.toEqual([0, 0]);
    expect(poseAt({ ...actor, action: 'nod' }, 0.25, 3, 'fixed', false)).toEqual(
      poseAt({ ...actor, action: 'nod' }, 0.25, 3, 'fixed', false),
    );
  });
});
