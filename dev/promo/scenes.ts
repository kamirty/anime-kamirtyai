import { newCharacter, parseProject } from '../../src/domain/sanitize';
import { AT, armTo } from '../../src/engine/art/reach';
import type { Project } from '../../src/domain/types';

/**
 * The anime shots used inside the promo film. Every one of them is a real project rendered by
 * the studio's own `renderFrame`, so the advert only ever shows what the tool actually makes.
 */

const ch = (kind: Parameters<typeof newCharacter>[0], outfit: Parameters<typeof newCharacter>[1], name: string, id: string, extra: Record<string, unknown> = {}) => ({
  ...newCharacter(kind, outfit, name),
  id,
  ...extra,
});

const build = (cast: unknown[], shots: unknown[]): Project => parseProject({ aspect: 'portrait', font: 'cairo', cast, shots });

/** The headline shot: a boy on Nizwa fort strikes the moon. */
export const hero = build(
  [ch('boy', 'massar', 'سالم', 'b', { accent: '#b03030', skin: 2 })],
  [
    {
      id: 's1',
      duration: 5,
      place: 'fort',
      time: 'night',
      size: 'medium',
      camera: 'push',
      actors: [{ cast: 'b', action: 'power', expression: 'set', x: 0.5 }],
      effects: ['sparkles'],
      transition: 'cut',
    },
  ],
);

/** A teacher and her class: the everyday use. */
export const classroom = build(
  [
    ch('woman', 'abaya', 'المعلمة', 't', { color: '#1d1f2b', accent: '#c8a24a' }),
    ch('boy', 'school', 'طالب', 'k1', { color: '#2f5d8a' }),
    ch('girl', 'school', 'طالبة', 'k2', { color: '#2f5d8a' }),
  ],
  [
    {
      id: 's1',
      duration: 4,
      place: 'classroom',
      time: 'day',
      size: 'wide',
      camera: 'still',
      actors: [
        { cast: 't', action: 'custom', expression: 'look', x: 0.32, hold: 'book', rig: { from: { armL: armTo(-0.02, AT.chest + 0.04), armR: armTo(-0.02, AT.chest + 0.04) }, to: { armL: armTo(-0.02, AT.chest - 0.02), armR: armTo(-0.02, AT.chest - 0.02) }, loop: 2.2 } },
        { cast: 'k1', action: 'clap', expression: 'happy', x: 0.62 },
        { cast: 'k2', action: 'clap', expression: 'happy', x: 0.82 },
      ],
      effects: [],
      transition: 'cut',
    },
  ],
);

/** Sunset on the beach: a girl waves. */
export const beach = build(
  [ch('girl', 'omaniDress', 'مريم', 'g', { color: '#7b2d4a', accent: '#e4c15a' })],
  [
    {
      id: 's1',
      duration: 4,
      place: 'sea',
      time: 'sunset',
      size: 'medium',
      camera: 'still',
      actors: [{ cast: 'g', action: 'wave', expression: 'happy', x: 0.5 }],
      effects: ['sparkles'],
      transition: 'cut',
    },
  ],
);

/** The desert run, in profile. */
export const desert = build(
  [ch('man', 'massar', 'خالد', 'm', { accent: '#5b7a3a', skin: 2 })],
  [
    {
      id: 's1',
      duration: 4,
      place: 'desert',
      time: 'day',
      size: 'wide',
      camera: 'still',
      actors: [{ cast: 'm', action: 'run', expression: 'set', x: 0.15, to: 0.85 }],
      effects: ['dust'],
      transition: 'cut',
    },
  ],
);

/** The celebration that closes the film. */
export const celebrate = build(
  [
    ch('boy', 'dishdasha', 'ولد', 'a', { accent: '#b03030' }),
    ch('girl', 'school', 'بنت', 'c', { color: '#2f5d8a' }),
  ],
  [
    {
      id: 's1',
      duration: 4,
      place: 'fort',
      time: 'sunset',
      size: 'wide',
      camera: 'still',
      actors: [
        { cast: 'a', action: 'cheer', expression: 'happy', x: 0.38 },
        { cast: 'c', action: 'custom', expression: 'happy', x: 0.64, hold: 'flag', rig: { from: { armR: armTo(0.1, AT.chin) }, to: { armR: armTo(0.16, AT.eye - 0.04) }, loop: 0.8 } },
      ],
      effects: ['fireworks', 'confetti'],
      transition: 'cut',
    },
  ],
);

/** Nine thumbnails of places and times, for the "9 places" beat. */
export const places = (
  [
    ['fort', 'night'],
    ['desert', 'day'],
    ['sea', 'sunset'],
    ['mountains', 'day'],
    ['farm', 'day'],
    ['city', 'night'],
    ['classroom', 'day'],
    ['home', 'night'],
    ['space', 'night'],
  ] as const
).map(([place, time]) =>
  build(
    [ch('boy', 'dishdasha', 'ولد', 'b')],
    [{ id: 's1', duration: 3, place, time, size: 'wide', camera: 'still', actors: [{ cast: 'b', action: 'stand', expression: 'calm', x: 0.5 }], effects: [], transition: 'cut' }],
  ),
);
