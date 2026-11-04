import {
  ACTIONS,
  ASPECTS,
  CAMERAS,
  EFFECTS,
  EXPRESSIONS,
  KINDS,
  MAX_ACTORS_PER_SHOT,
  MAX_CAST,
  MAX_SHOTS,
  MAX_SHOT_SECONDS,
  MAX_TOTAL_SECONDS,
  MIN_SHOT_SECONDS,
  MUSIC,
  OUTFITS,
  PLACES,
  SIZES,
  TIMES,
  TRANSITIONS,
  isFemale,
  outfitsFor,
  type ActionId,
  type Actor,
  type Aspect,
  type CharKind,
  type Character,
  type CustomProp,
  type Project,
  type PropMotion,
  type PropPlacement,
  type Shot,
  type RigPose,
  REST_RIG,
} from './types';
import { FONT_IDS, DEFAULT_FONT } from '../design/fonts';

/** Untrusted JSON (saved files, autosave, or text pasted from an AI assistant) becomes a valid Project here. */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number, fallback = ''): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : fallback;
const num = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const oneOf = <T extends string>(v: unknown, list: readonly { id: T }[], fallback: T): T =>
  typeof v === 'string' && list.some((x) => x.id === v) ? (v as T) : fallback;
const HEX = /^#[0-9a-fA-F]{6}$/;
export const color = (v: unknown, fallback: string): string => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback);
const ID = /^[a-zA-Z0-9_-]{1,32}$/;
const safeId = (v: unknown, fallback: string): string => (typeof v === 'string' && ID.test(v) ? v : fallback);

/** SVG path data only: commands, numbers, separators. Nothing that could run code. */
const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]+$/;
const MAX_PATH = 6000;

const PROP_MOTIONS: { id: PropMotion }[] = ['none', 'float', 'bounce', 'spin', 'fly', 'grow', 'pulse'].map((id) => ({ id: id as PropMotion }));

export const DEFAULT_COLORS: Record<string, { color: string; accent: string }> = {
  dishdasha: { color: '#f6f3ee', accent: '#0b8a3c' },
  massar: { color: '#f6f3ee', accent: '#c0392b' },
  ghutra: { color: '#f6f3ee', accent: '#d7192a' },
  abaya: { color: '#17151c', accent: '#c9a227' },
  omaniDress: { color: '#c2185b', accent: '#ffc107' },
  school: { color: '#1f5fa8', accent: '#f6f3ee' },
  casual: { color: '#2e86c1', accent: '#8e44ad' },
  labcoat: { color: '#5d9cec', accent: '#455a64' },
};

let counter = 0;
export const newId = (prefix: string): string => `${prefix}${Date.now().toString(36).slice(-4)}${(counter++).toString(36)}`;

export function newCharacter(kind: CharKind = 'boy', outfit?: Character['outfit'], name?: string): Character {
  const o = outfit && outfitsFor(kind).some((x) => x.id === outfit) ? outfit : isFemale(kind) ? 'school' : 'dishdasha';
  return {
    id: newId('c'),
    name: name ?? KINDS.find((k) => k.id === kind)!.label,
    kind,
    outfit: o,
    skin: 2,
    color: DEFAULT_COLORS[o].color,
    accent: DEFAULT_COLORS[o].accent,
    hair: '#16110e',
  };
}

export function newShot(partial: Partial<Shot> = {}): Shot {
  return {
    id: newId('s'),
    duration: 3,
    place: 'fort',
    time: 'night',
    size: 'wide',
    camera: 'still',
    actors: [],
    effects: [],
    transition: 'dip',
    ...partial,
  };
}

export function fixCharacter(v: unknown, i: number): Character | null {
  if (!isObj(v)) return null;
  const kind = oneOf<CharKind>(v.kind, KINDS, 'boy');
  const allowed = outfitsFor(kind);
  const outfit = oneOf(v.outfit, allowed, allowed[0].id);
  return {
    id: safeId(v.id, `c${i + 1}`),
    name: str(v.name, 40, KINDS.find((k) => k.id === kind)!.label),
    kind,
    outfit,
    skin: Math.round(num(v.skin, 0, 3, 2)),
    color: color(v.color, DEFAULT_COLORS[outfit].color),
    accent: color(v.accent, DEFAULT_COLORS[outfit].accent),
    hair: color(v.hair, '#16110e'),
  };
}

const PI = Math.PI;
const joint = (v: unknown, d: [number, number]): [number, number] =>
  Array.isArray(v) && v.length === 2 ? [num(v[0], -PI, PI, d[0]), num(v[1], -PI, PI, d[1])] : d;

export function fixRig(v: unknown): RigPose | null {
  if (!isObj(v)) return null;
  return {
    armL: joint(v.armL, REST_RIG.armL),
    armR: joint(v.armR, REST_RIG.armR),
    legL: joint(v.legL, REST_RIG.legL),
    legR: joint(v.legR, REST_RIG.legR),
    head: num(v.head, -0.6, 0.6, 0),
    lean: num(v.lean, -0.5, 0.5, 0),
    crouch: num(v.crouch, 0, 1, 0),
  };
}

const camKey = (v: unknown, d: { zoom: number; x: number; y: number }) =>
  isObj(v) ? { zoom: num(v.zoom, 1, 3, d.zoom), x: num(v.x, -1, 1, d.x), y: num(v.y, -1, 1, d.y) } : d;

function fixActor(v: unknown, castIds: string[]): Actor | null {
  if (!isObj(v)) return null;
  const cast = typeof v.cast === 'string' && castIds.includes(v.cast) ? v.cast : null;
  if (!cast) return null;
  const action = oneOf<ActionId>(v.action, ACTIONS, 'stand');
  const a: Actor = { cast, action, expression: oneOf(v.expression, EXPRESSIONS, 'calm'), x: num(v.x, 0.05, 0.95, 0.5) };
  if (action === 'walk' || action === 'run') a.to = num(v.to, 0.05, 0.95, a.x < 0.5 ? 0.7 : 0.3);
  if (isObj(v.rig)) {
    const from = fixRig(v.rig.from);
    if (from) a.rig = { from, to: fixRig(v.rig.to) ?? undefined };
  }
  return a;
}

function fixProp(v: unknown, i: number, warnings: string[]): CustomProp | null {
  if (!isObj(v) || !Array.isArray(v.parts)) return null;
  const parts = v.parts
    .slice(0, 40)
    .filter(isObj)
    .map((p) => {
      const d = typeof p.d === 'string' ? p.d.trim() : '';
      if (!d || d.length > MAX_PATH || !PATH_D.test(d)) return null;
      return {
        d,
        fill: p.fill === 'none' ? undefined : color(p.fill, '#000000'),
        stroke: p.stroke === undefined || p.stroke === 'none' ? undefined : color(p.stroke, '#000000'),
        width: num(p.width, 0, 30, 3),
        opacity: num(p.opacity, 0, 1, 1),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  if (!parts.length) {
    warnings.push(`تجاهلت رسمة «${str(v.name, 30, String(i + 1))}» لأن مساراتها غير صالحة.`);
    return null;
  }
  return { id: safeId(v.id, `p${i + 1}`), name: str(v.name, 40, `رسمة ${i + 1}`), parts };
}

function fixPlacement(v: unknown, propIds: string[]): PropPlacement | null {
  if (!isObj(v) || typeof v.ref !== 'string' || !propIds.includes(v.ref)) return null;
  return { ref: v.ref, x: num(v.x, -0.2, 1.2, 0.5), y: num(v.y, -0.2, 1.2, 0.5), size: num(v.size, 0.03, 1, 0.2), motion: oneOf(v.motion, PROP_MOTIONS, 'none') };
}

function fixShot(v: unknown, i: number, castIds: string[], propIds: string[]): Shot | null {
  if (!isObj(v)) return null;
  const actors = (Array.isArray(v.actors) ? v.actors : [])
    .map((a) => fixActor(a, castIds))
    .filter((a): a is Actor => a !== null)
    .slice(0, MAX_ACTORS_PER_SHOT);
  const minDur = Math.max(MIN_SHOT_SECONDS, ...actors.map((a) => ACTIONS.find((x) => x.id === a.action)?.minSeconds ?? 0));
  const shot: Shot = {
    id: safeId(v.id, `s${i + 1}`),
    duration: Math.round(num(v.duration, minDur, MAX_SHOT_SECONDS, Math.max(3, minDur)) * 2) / 2,
    place: oneOf(v.place, PLACES, 'fort'),
    time: oneOf(v.time, TIMES, 'night'),
    size: oneOf(v.size, SIZES, 'wide'),
    camera: oneOf(v.camera, CAMERAS, 'still'),
    actors,
    effects: [...new Set((Array.isArray(v.effects) ? v.effects : []).filter((e): e is string => typeof e === 'string' && EFFECTS.some((x) => x.id === e)))] as Shot['effects'],
    transition: oneOf(v.transition, TRANSITIONS, 'dip'),
  };
  if (isObj(v.text)) {
    const main = str(v.text.main, 120);
    if (main) shot.text = { style: v.text.style === 'title' ? 'title' : 'caption', main, sub: str(v.text.sub, 80) || undefined };
  }
  if (isObj(v.dialogue)) {
    const text = str(v.dialogue.text, 160);
    const idx = Math.round(num(v.dialogue.actor, 0, MAX_ACTORS_PER_SHOT - 1, 0));
    if (text && actors[idx]) shot.dialogue = { actor: idx, text };
  }
  const board = str(v.board, 60);
  if (board) shot.board = board;
  if (isObj(v.direct)) {
    const ease = (['inout', 'in', 'out', 'linear'] as const).find((e) => e === (v.direct as Obj).ease) ?? 'inout';
    shot.direct = { from: camKey(v.direct.from, { zoom: 1, x: 0, y: 0 }), to: camKey(v.direct.to, { zoom: 1.3, x: 0, y: 0 }), ease, shake: v.direct.shake === true || undefined };
  }
  if (Array.isArray(v.props)) {
    const props = v.props.map((p) => fixPlacement(p, propIds)).filter((p): p is PropPlacement => p !== null).slice(0, 6);
    if (props.length) shot.props = props;
  }
  return shot;
}

export interface ParseResult {
  project: Project;
  warnings: string[];
}

/** Accepts any value and returns a project that is safe to render. Throws only when nothing usable is left. */
export function parseProjectLoose(data: unknown): ParseResult {
  const warnings: string[] = [];
  if (!isObj(data)) throw new Error('المحتوى ليس مشروعًا (يجب أن يكون كائن JSON).');
  const cast = (Array.isArray(data.cast) ? data.cast : [])
    .map(fixCharacter)
    .filter((c): c is Character => c !== null)
    .slice(0, MAX_CAST);
  // duplicate ids would make actors ambiguous
  const seen = new Set<string>();
  for (const c of cast) {
    if (seen.has(c.id)) c.id = newId('c');
    seen.add(c.id);
  }
  const castIds = cast.map((c) => c.id);
  const props = (Array.isArray(data.props) ? data.props : []).map((p, i) => fixProp(p, i, warnings)).filter((p): p is CustomProp => p !== null).slice(0, 12);
  const propIds = props.map((p) => p.id);
  let shots = (Array.isArray(data.shots) ? data.shots : [])
    .map((s, i) => fixShot(s, i, castIds, propIds))
    .filter((s): s is Shot => s !== null)
    .slice(0, MAX_SHOTS);
  if (!shots.length) throw new Error('لا يوجد في المحتوى أي لقطة صالحة (shots).');
  // keep the total under the limit by trimming from the end
  let total = 0;
  shots = shots.filter((s) => {
    if (total + s.duration > MAX_TOTAL_SECONDS) return false;
    total += s.duration;
    return true;
  });
  const rawShots = Array.isArray(data.shots) ? data.shots.length : 0;
  if (shots.length < rawShots) warnings.push(`استعملت ${shots.length} لقطة من ${rawShots}؛ تجاهلت الباقي لأنه غير صالح أو تجاوز الحد (${MAX_TOTAL_SECONDS} ثانية).`);
  const audio = isObj(data.audio) ? data.audio : {};
  const project: Project = {
    version: 1,
    title: str(data.title, 80, 'مشهد أنمي'),
    aspect: (Object.keys(ASPECTS) as Aspect[]).includes(data.aspect as Aspect) ? (data.aspect as Aspect) : 'portrait',
    font: typeof data.font === 'string' && FONT_IDS.includes(data.font) ? data.font : DEFAULT_FONT,
    cast,
    shots,
    props,
    audio: { ambience: audio.ambience !== false, sfx: audio.sfx !== false, music: oneOf(audio.music, MUSIC, 'none') },
    fadeOut: data.fadeOut !== false,
  };
  return { project, warnings };
}

export const parseProject = (data: unknown): Project => parseProjectLoose(data).project;

/** Pulls the first JSON object out of text that may contain prose or ``` fences around it. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('لم أجد كود JSON في النص الملصق. انسخ رد Claude كاملًا أو الجزء الذي بين ```json و```.');
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch (e) {
    throw new Error(`الكود الملصق ليس JSON صالحًا (${e instanceof Error ? e.message : 'خطأ في الصياغة'}). اطلب من Claude إعادة إرساله كاملًا.`);
  }
}

export const OUTFIT_LABEL = (id: string) => OUTFITS.find((o) => o.id === id)?.label ?? id;
