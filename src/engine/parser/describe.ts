import { ACTIONS, EFFECTS, PLACES, TIMES, type ActionId, type Actor, type Aspect, type CharKind, type Character, type EffectId, type Expression, type MusicId, type OutfitId, type PlaceId, type Project, type Shot, type ShotSize, type TimeOfDay } from '../../domain/types';
import { DEFAULT_COLORS, newCharacter, newShot, parseProject } from '../../domain/sanitize';
import { DEFAULT_FONT } from '../../design/fonts';
import {
  ACTION_PATTERNS,
  CAPTION_CUES,
  COLORS,
  EFFECT_WORDS,
  EXPRESSION_WORDS,
  GROUPS,
  OCCASIONS,
  OUTFIT_WORDS,
  PEOPLE,
  PLACE_WORDS,
  SIZE_WORDS,
  SPEECH_VERBS,
  STOP,
  TIME_WORDS,
  norm,
  stems,
} from './lexicon';

/**
 * Turns an Arabic scene description into a storyboard, deterministically. It only uses what is written
 * (and the director's grammar: establish, approach, the action, the button); it never invents facts,
 * and it reports the words it did not understand so the visitor can rephrase or ask an assistant.
 */

export interface Chip {
  kind: 'place' | 'time' | 'person' | 'action' | 'effect' | 'text' | 'occasion' | 'outfit' | 'size';
  label: string;
}

export interface ParseReport {
  understood: Chip[];
  unknown: string[];
  notes: string[];
}

const n = (list: string[]) => new Set(list.map(norm));
const PLACE_SET = PLACE_WORDS.map(([id, w]) => [id, n(w)] as const);
const TIME_SET = TIME_WORDS.map(([id, w]) => [id, n(w)] as const);
const EXPR_SET = EXPRESSION_WORDS.map(([id, w]) => [id, n(w)] as const);
const EFFECT_SET = EFFECT_WORDS.map(([id, w]) => [id, n(w)] as const);
const SIZE_SET = SIZE_WORDS.map(([id, w]) => [id, n(w)] as const);
const COLOR_SET = COLORS.map(([hex, w]) => [hex, n(w)] as const);
const OUTFIT_SINGLE = OUTFIT_WORDS.map(([id, w]) => [id, n(w.filter((x) => !x.includes(' ')))] as const);
const OUTFIT_MULTI = OUTFIT_WORDS.flatMap(([id, w]) => w.filter((x) => x.includes(' ')).map((x) => [id, norm(x)] as const));
const HEADWEAR_WORDS = n(['كمه', 'كمته', 'الكمه', 'مصر', 'مصره', 'عمامه', 'لحاف', 'شيله', 'غتره', 'شماغ']);
const PEOPLE_MAP = new Map(PEOPLE.map((p) => [norm(p.w), p]));
const GROUP_MAP = new Map(GROUPS.map((g) => [norm(g.w), g]));

const label = <T extends string>(list: { id: T; label: string }[], id: T) => list.find((x) => x.id === id)?.label ?? id;

interface Quote {
  text: string;
  kind: 'speech' | 'caption' | 'auto';
}

interface PersonRef {
  key: string;
  kind: CharKind;
  name: string;
  outfit?: OutfitId;
  color?: string;
  accent?: string;
  explicitName?: boolean;
}

interface Seg {
  place?: PlaceId;
  time?: TimeOfDay;
  persons: PersonRef[];
  action?: ActionId;
  expression?: Expression;
  effects: EffectId[];
  size?: ShotSize;
  quotes: Quote[];
  occasion: boolean;
  title: boolean;
}

const ACTION_RANK: ActionId[] = ['power', 'jump', 'run', 'dance', 'nod', 'cheer', 'clap', 'wave', 'greet', 'point', 'think', 'talk', 'walk', 'stand'];

const QUOTE_RE = /[«"“„]([^«»"“”„]{1,200})[»"”“]/g;
const CAPTION_RE = /(?:عبارة|عباره|جملة|جمله|عنوان|رسالة|رساله|شعار|لافتة|لافته|مكتوب(?:ة|ه)?(?:\s+عليها|\s+عليه)?|نص)\s*[:：]?\s*([^\n«»"“”]{2,160})$/m;
const NAME_RE = /(?:اسمه|اسمها|يدعى|تدعى|يُدعى|تُدعى|اسمهُ)\s+([ء-ي]{2,20})/g;
const SPLIT_RE = /(?:[.!؟?\n]+|\s(?:ثم|بعدها|وبعدها|وبعد ذلك|بعد ذلك|فجأة|فجاة|وفجأة|وفي النهاية|وفي الختام|في النهاية|وأخيرا|وأخيراً|أخيرا|أخيراً)\s)/;

export function splitMainSub(text: string): { main: string; sub?: string } {
  const parts = text
    .split(/\s*(?:\.{2,}|…|\||—|–|\s-\s|\n)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return { main: parts[0], sub: parts.slice(1).join(' ') };
  return { main: text.trim() };
}

export function describeToProject(description: string, opts: { aspect?: Aspect; font?: string } = {}): { project: Project; report: ParseReport } {
  const report: ParseReport = { understood: [], unknown: [], notes: [] };
  const chip = (c: Chip) => {
    if (!report.understood.some((x) => x.kind === c.kind && x.label === c.label)) report.understood.push(c);
  };
  let text = description.replace(/\r/g, '').trim();
  if (!text) throw new Error('اكتب وصف المشهد أولًا.');

  // 1. quoted text and "عبارة …" captions become placeholders so splitting never breaks them
  const quotes: Quote[] = [];
  text = text.replace(QUOTE_RE, (_m, q: string) => {
    quotes.push({ text: q.trim(), kind: 'auto' });
    return ` ⟦${quotes.length - 1}⟧ `;
  });
  const cap = text.match(CAPTION_RE);
  if (cap && !/⟦\d+⟧/.test(cap[1])) {
    quotes.push({ text: cap[1].trim().replace(/[.،,]+$/, ''), kind: 'caption' });
    text = text.slice(0, cap.index! + cap[0].length - cap[1].length) + ` ⟦${quotes.length - 1}⟧`;
  }

  const names: string[] = [];
  for (const m of text.matchAll(NAME_RE)) names.push(m[1]);

  // 2. segments → facts
  const rawSegs = text.split(SPLIT_RE).map((s) => s.trim()).filter((s) => s.length > 0);
  const segs: Seg[] = [];
  const allPersons: PersonRef[] = [];
  const unknown = new Set<string>();
  let current: PersonRef[] = [];
  let music: MusicId = 'calm';

  const findPerson = (p: PersonRef) => allPersons.find((x) => x.key === p.key);

  for (const raw of rawSegs) {
    const seg: Seg = { persons: [], effects: [], quotes: [], occasion: false, title: false };
    const tokens = raw.split(/[\s،,؛:()\[\]]+/).filter(Boolean);
    const normSeg = norm(raw);
    let lastOutfitIdx = -9;
    let lastOutfitHead = false;
    let pendingName: string | null = null;
    const actionsHere: ActionId[] = [];
    let speakerIdx = -1;

    tokens.forEach((tok, i) => {
      const q = tok.match(/^⟦(\d+)⟧$/);
      if (q) {
        const quote = quotes[Number(q[1])];
        if (quote.kind === 'auto') {
          const before = norm(tokens.slice(Math.max(0, i - 3), i).join(' '));
          quote.kind = SPEECH_VERBS.test(before) ? 'speech' : CAPTION_CUES.test(before) ? 'caption' : 'auto';
        }
        if (quote.kind === 'speech') speakerIdx = Math.max(0, seg.persons.length - 1);
        seg.quotes.push(quote);
        return;
      }
      const t = norm(tok).replace(/[^ء-ي0-9]/g, '');
      if (!t) return;
      if (pendingName === null && /^(اسمه|اسمها|يدعي|تدعي)$/.test(t)) {
        pendingName = '';
        return;
      }
      if (pendingName === '') {
        pendingName = tok;
        const last = seg.persons[seg.persons.length - 1] ?? current[current.length - 1];
        if (last) {
          last.name = tok;
          last.explicitName = true;
        }
        return;
      }
      const st = stems(t);
      const has = (set: Set<string>) => st.some((s) => set.has(s));
      let used = false;

      for (const [id, set] of PLACE_SET) if (has(set)) {
        used = true;
        if (!seg.place) seg.place = id;
      }
      for (const [id, set] of TIME_SET) if (has(set)) {
        used = true;
        if (!seg.time) seg.time = id;
      }

      // people: a known name, a single person, or a group
      const byName = allPersons.find((p) => p.explicitName && norm(p.name) === t);
      const pw = st.map((s) => PEOPLE_MAP.get(s)).find(Boolean);
      const gw = st.map((s) => GROUP_MAP.get(s)).find(Boolean);
      if (byName) {
        if (!seg.persons.includes(byName)) seg.persons.push(byName);
        used = true;
      } else if (pw) {
        const ref: PersonRef = { key: `${pw.kind}:${pw.name}`, kind: pw.kind, name: pw.name, outfit: pw.outfit };
        const existing = findPerson(ref);
        const p = existing ?? ref;
        if (!existing) allPersons.push(p);
        if (!seg.persons.includes(p)) seg.persons.push(p);
        used = true;
      } else if (gw) {
        gw.kinds.forEach((k, gi) => {
          const ref: PersonRef = { key: `${k}:${gw.w}:${gi}`, kind: k, name: PEOPLE.find((x) => x.kind === k)!.name };
          const existing = findPerson(ref);
          const p = existing ?? ref;
          if (!existing) allPersons.push(p);
          if (!seg.persons.includes(p)) seg.persons.push(p);
        });
        used = true;
      }

      for (const [id, set] of OUTFIT_SINGLE) {
        if (has(set)) {
          const target = seg.persons[seg.persons.length - 1] ?? current[current.length - 1] ?? allPersons[allPersons.length - 1];
          if (target) target.outfit = id;
          lastOutfitIdx = i;
          lastOutfitHead = has(HEADWEAR_WORDS);
          used = true;
        }
      }
      for (const [hex, set] of COLOR_SET) {
        if (has(set) && i - lastOutfitIdx <= 3) {
          const target = seg.persons[seg.persons.length - 1] ?? current[current.length - 1] ?? allPersons[allPersons.length - 1];
          if (target) {
            if (lastOutfitHead) target.accent = hex;
            else target.color = hex;
          }
          used = true;
        }
      }
      for (const [id, re] of ACTION_PATTERNS) {
        if (st.some((s) => re.test(s))) {
          actionsHere.push(id);
          used = true;
          break;
        }
      }
      for (const [id, set] of EXPR_SET) if (has(set)) ((seg.expression = id), (used = true));
      for (const [id, set] of EFFECT_SET) if (has(set)) {
        if (id === 'fireworks' && !/العاب ناريه|الالعاب الناريه|مفرقعات/.test(normSeg)) continue;
        if (id === 'ribbons' && !/علم|اعلام/.test(normSeg)) continue;
        if (!seg.effects.includes(id)) seg.effects.push(id);
        used = true;
      }
      for (const [id, set] of SIZE_SET) if (has(set)) ((seg.size = id), (used = true));
      for (const o of OCCASIONS) {
        if (st.some((s) => o.w.map(norm).includes(s))) {
          seg.occasion = true;
          for (const e of o.effects) if (!seg.effects.includes(e)) seg.effects.push(e);
          if (o.time && !seg.time) seg.time = o.time;
          music = o.music;
          chip({ kind: 'occasion', label: o.label });
          used = true;
        }
      }
      if (/^(عنوان|العنوان)$/.test(t)) seg.title = true;
      if (!used && !STOP.has(t) && !st.some((s) => STOP.has(s)) && t.length >= 3 && !/^\d+$/.test(t)) unknown.add(tok.replace(/[^؀-ۿ]/g, ''));
    });

    for (const id of OUTFIT_MULTI) {
      if (normSeg.includes(id[1])) {
        const target = seg.persons[seg.persons.length - 1] ?? current[current.length - 1];
        if (target) target.outfit = id[0];
      }
    }
    // the strongest action in the sentence wins
    seg.action = ACTION_RANK.find((a) => actionsHere.includes(a));
    if (seg.quotes.some((q) => q.kind === 'speech') && !seg.action) seg.action = 'talk';
    if (!seg.persons.length && (seg.action || seg.quotes.some((q) => q.kind === 'speech'))) seg.persons = [...current];
    if (seg.persons.length) current = seg.persons;
    (seg as Seg & { speaker?: number }).speaker = speakerIdx;
    segs.push(seg);
  }

  // 3. cast
  const cast: Character[] = [];
  const castOf = new Map<PersonRef, Character>();
  const anyClassroom = segs.some((s) => s.place === 'classroom');
  for (const p of allPersons.slice(0, 8)) {
    let outfit = p.outfit;
    if (!outfit) outfit = p.kind === 'girl' ? (anyClassroom ? 'school' : 'casual') : p.kind === 'woman' ? 'abaya' : 'dishdasha';
    const c = newCharacter(p.kind, outfit, p.name);
    if (p.color) c.color = p.color;
    if (p.accent) c.accent = p.accent;
    if (!p.color && !p.accent) Object.assign(c, DEFAULT_COLORS[c.outfit]);
    c.id = `c${cast.length + 1}`;
    cast.push(c);
    castOf.set(p, c);
    chip({ kind: 'person', label: `${c.name} (${label([{ id: c.outfit, label: OUTFIT_LABEL[c.outfit] }], c.outfit)})` });
  }

  // 4. shots
  let place: PlaceId | undefined = segs.find((s) => s.place)?.place;
  let time: TimeOfDay | undefined = segs.find((s) => s.time)?.time;
  const shots: Shot[] = [];
  let carryText: Shot['text'] | undefined;
  for (const seg of segs) {
    if (seg.place) place = seg.place;
    if (seg.time) time = seg.time;
    const actors: Actor[] = seg.persons
      .map((p) => castOf.get(p))
      .filter((c): c is Character => !!c)
      .slice(0, 3)
      .map((c, i, arr) => ({
        cast: c.id,
        action: seg.action ?? 'stand',
        expression: seg.expression ?? (seg.action === 'cheer' || seg.action === 'clap' || seg.action === 'wave' || seg.action === 'greet' ? 'happy' : seg.action === 'power' ? 'set' : 'calm'),
        x: arr.length === 1 ? 0.5 : arr.length === 2 ? [0.3, 0.7][i] : [0.2, 0.5, 0.8][i],
      }));
    const speech = seg.quotes.find((q) => q.kind === 'speech' || (q.kind === 'auto' && actors.length > 0));
    const captionQ = seg.quotes.find((q) => q !== speech);
    const hasContent = actors.length || seg.quotes.length || seg.effects.length || seg.action;
    if (!hasContent) {
      // place/time-only sentence: it shapes the next shot
      continue;
    }
    const shot = newShot({ place: place ?? 'farm', time: time ?? 'day', actors, effects: [...seg.effects] });
    if (actors.length && speech) {
      const sp = Math.min(actors.length - 1, Math.max(0, (seg as Seg & { speaker?: number }).speaker ?? 0));
      shot.dialogue = { actor: sp, text: speech.text.slice(0, 160) };
      if (actors[sp].action === 'stand') actors[sp].action = 'talk';
      chip({ kind: 'text', label: `حوار: «${speech.text.slice(0, 30)}${speech.text.length > 30 ? '…' : ''}»` });
    } else if (speech && !actors.length) {
      shot.text = { style: 'caption', ...splitMainSub(speech.text) };
    }
    if (captionQ && captionQ !== speech) {
      shot.text = { style: seg.title ? 'title' : 'caption', ...splitMainSub(captionQ.text) };
    }
    if (shot.text) chip({ kind: 'text', label: `عبارة: «${shot.text.main.slice(0, 30)}»` });
    // framing
    const action = actors[0]?.action;
    shot.size = seg.size ?? (action === 'power' || action === 'walk' || action === 'run' || action === 'jump' || actors.length === 0 ? 'wide' : shot.dialogue ? (actors.length > 1 ? 'medium' : 'close') : 'medium');
    if (action === 'power') shot.size = 'wide';
    shot.camera = shot.size === 'wide' && !action ? 'push' : shot.size === 'close' ? 'push' : 'still';
    const words = shot.dialogue ? shot.dialogue.text.split(/\s+/).length : 0;
    shot.duration = Math.max(
      3,
      shot.dialogue ? Math.min(8, 1.6 + words * 0.5) : 0,
      action === 'power' ? 4.5 : action === 'walk' ? 3.5 : action === 'run' ? 3 : action === 'jump' ? 2.5 : 0,
      shot.text ? 4 : 0,
    );
    shot.duration = Math.round(shot.duration * 2) / 2;
    // a power move and its message are two beats: the hit, then the result with the line
    if (action === 'power' && shot.text) {
      carryText = shot.text;
      delete shot.text;
      shot.transition = 'flash';
      shots.push(shot);
      const after = newShot({
        place: shot.place,
        time: shot.time,
        size: 'medium',
        camera: 'push',
        duration: 4.5,
        actors: actors.map((a) => ({ ...a, action: 'cheer' as ActionId, expression: 'happy' as Expression })),
        effects: [...new Set<EffectId>([...shot.effects, 'fireworks', 'sparkles'])],
        text: carryText,
      });
      shot.effects = shot.effects.filter((e) => e !== 'fireworks' && e !== 'ribbons' && e !== 'confetti' && e !== 'balloons');
      shots.push(after);
      report.notes.push('قسمت الضربة والعبارة إلى لقطتين: الضربة أولًا، ثم النتيجة مع العبارة.');
      continue;
    }
    if (action === 'power') shot.transition = 'flash';
    shots.push(shot);
  }

  if (!shots.length) {
    // nothing but a place: show it
    shots.push(newShot({ place: place ?? 'farm', time: time ?? 'day', size: 'wide', camera: 'push', duration: 4 }));
    report.notes.push('لم أجد شخصيات أو أحداثًا في الوصف، فصنعت لقطة للمكان فقط.');
  }

  // 5. director's grammar: open on the place
  const first = shots[0];
  if (shots.length < 30 && first.actors.length && first.size !== 'wide') {
    shots.unshift(
      newShot({
        place: first.place,
        time: first.time,
        size: 'wide',
        camera: 'push',
        duration: 2.5,
        actors: first.actors.map((a) => ({ ...a, action: 'stand', expression: 'calm' })),
        effects: first.effects.filter((e) => e === 'rain' || e === 'dust' || e === 'shootingStars'),
      }),
    );
    report.notes.push('أضفت لقطة افتتاحية واسعة تعرّف بالمكان قبل الاقتراب من الشخصية.');
  }
  const last = shots[shots.length - 1];
  if (last.text && last.duration < 4) last.duration = 4;

  // the classroom board shows the lesson topic taken from the scene's own words
  const classShots = shots.filter((s) => s.place === 'classroom');
  if (classShots.length) {
    const said = classShots.flatMap((s) => [s.dialogue?.text, s.text?.main]).filter((x): x is string => !!x);
    let topic: string | undefined;
    for (const line of said) {
      const m = line.match(/(?:نتعلم|سنتعلم|نتعرف على|سنتعرف على|نتعلّم|سنتعلّم|درسنا اليوم|درس اليوم|درسنا|موضوعنا|موضوع اليوم|عنوان الدرس)\s*(?:عن)?\s*[:：]?\s*([^،,.!؟?]{2,40})/);
      if (m) {
        topic = m[1].trim();
        break;
      }
    }
    topic ??= classShots.find((s) => s.text)?.text?.main;
    if (topic) {
      for (const s of classShots) s.board ??= topic;
      chip({ kind: 'text', label: `على السبورة: «${topic.slice(0, 30)}»` });
    }
  }
  if (shots.some((s) => s.actors.some((a) => a.action === 'power')) && music === 'calm') music = 'epic';

  // chips for what was used
  for (const s of shots) {
    chip({ kind: 'place', label: label(PLACES, s.place) });
    chip({ kind: 'time', label: label(TIMES, s.time) });
    for (const a of s.actors) if (a.action !== 'stand') chip({ kind: 'action', label: label(ACTIONS, a.action) });
    for (const e of s.effects) chip({ kind: 'effect', label: label(EFFECTS, e) });
  }
  const castNames = new Set(cast.map((c) => norm(c.name)));
  report.unknown = [...unknown].filter((w) => w.length >= 3 && !castNames.has(norm(w)) && !names.includes(w)).slice(0, 12);
  if (!segs.some((s) => s.place)) report.notes.push('لم تذكر مكانًا، فاخترت «مزرعة نخيل». يمكنك تغييره من لوحة اللقطة.');

  const title = shots.find((s) => s.text)?.text?.main ?? description.replace(/[«»"“”]/g, '').split(/\s+/).slice(0, 6).join(' ');
  const project = parseProject({
    version: 1,
    title: title.slice(0, 60),
    aspect: opts.aspect ?? 'portrait',
    font: opts.font ?? DEFAULT_FONT,
    cast,
    shots,
    props: [],
    audio: { ambience: true, sfx: true, music },
    fadeOut: true,
  });
  return { project, report };
}

const OUTFIT_LABEL: Record<OutfitId, string> = {
  dishdasha: 'دشداشة وكمّة',
  massar: 'دشداشة ومصرّ',
  ghutra: 'ثوب وغترة',
  abaya: 'عباءة وشيلة',
  omaniDress: 'زي عُماني',
  school: 'زي مدرسي',
  casual: 'لبس عادي',
  labcoat: 'معطف مختبر',
};
