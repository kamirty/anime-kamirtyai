/** Kamirty Anime project model (v1). Everything the renderer, audio and export need lives here. */

export const FPS = 24;
export const MAX_TOTAL_SECONDS = 120;
export const MIN_SHOT_SECONDS = 1.5;
export const MAX_SHOT_SECONDS = 15;
export const MAX_SHOTS = 30;
export const MAX_CAST = 8;
export const MAX_ACTORS_PER_SHOT = 3;

export interface Size {
  width: number;
  height: number;
}

export type Aspect = 'portrait' | 'landscape' | 'square';

export const ASPECTS: Record<Aspect, { label: string; design: Size; sd: Size; hd: Size }> = {
  portrait: { label: 'عمودي 9:16', design: { width: 1080, height: 1920 }, sd: { width: 720, height: 1280 }, hd: { width: 1080, height: 1920 } },
  landscape: { label: 'أفقي 16:9', design: { width: 1920, height: 1080 }, sd: { width: 1280, height: 720 }, hd: { width: 1920, height: 1080 } },
  square: { label: 'مربع 1:1', design: { width: 1080, height: 1080 }, sd: { width: 720, height: 720 }, hd: { width: 1080, height: 1080 } },
};

export type PlaceId = 'fort' | 'desert' | 'sea' | 'mountains' | 'city' | 'classroom' | 'home' | 'farm' | 'space';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type ShotSize = 'wide' | 'medium' | 'close';
export type CameraMove = 'still' | 'push' | 'pan';
export type Transition = 'cut' | 'dip' | 'flash';
export type CharKind = 'boy' | 'girl' | 'man' | 'woman';
export type OutfitId = 'dishdasha' | 'massar' | 'ghutra' | 'abaya' | 'omaniDress' | 'school' | 'casual' | 'labcoat';
export type ActionId = 'stand' | 'walk' | 'run' | 'dance' | 'nod' | 'wave' | 'talk' | 'point' | 'cheer' | 'jump' | 'think' | 'greet' | 'clap' | 'power';
export type Expression = 'calm' | 'happy' | 'set' | 'surprised' | 'sad' | 'look';
export type EffectId = 'fireworks' | 'confetti' | 'rain' | 'sparkles' | 'speedlines' | 'ribbons' | 'balloons' | 'dust' | 'shootingStars';
export type MusicId = 'none' | 'calm' | 'festive' | 'epic';
export type PropMotion = 'none' | 'float' | 'bounce' | 'spin' | 'fly' | 'grow' | 'pulse';

export interface Character {
  id: string;
  name: string;
  kind: CharKind;
  outfit: OutfitId;
  /** 0 light … 3 deep */
  skin: number;
  /** Main garment colour. */
  color: string;
  /** Embroidery, scarf or turban colour. */
  accent: string;
  hair: string;
}

export interface Actor {
  /** Character id from project.cast */
  cast: string;
  action: ActionId;
  expression: Expression;
  /** Horizontal position, 0 (left edge) … 1 (right edge) of the world. */
  x: number;
  /** Walk destination (only for walk). */
  to?: number;
}

export interface ShotText {
  style: 'caption' | 'title';
  main: string;
  sub?: string;
}

export interface Dialogue {
  /** Index into shot.actors */
  actor: number;
  text: string;
}

export interface PropPlacement {
  ref: string;
  x: number;
  y: number;
  /** Height as a fraction of the frame height. */
  size: number;
  motion: PropMotion;
}

export interface Shot {
  id: string;
  duration: number;
  place: PlaceId;
  time: TimeOfDay;
  size: ShotSize;
  camera: CameraMove;
  actors: Actor[];
  effects: EffectId[];
  text?: ShotText;
  dialogue?: Dialogue;
  props?: PropPlacement[];
  /** How this shot hands over to the next one. */
  transition: Transition;
}

export interface PropPart {
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
  opacity?: number;
}

/** A drawing that is not in the built-in library, usually written by an AI assistant as SVG paths. */
export interface CustomProp {
  id: string;
  name: string;
  /** viewBox is 0 0 200 200 */
  parts: PropPart[];
}

export interface AudioSettings {
  ambience: boolean;
  sfx: boolean;
  music: MusicId;
}

export interface Project {
  version: 1;
  title: string;
  aspect: Aspect;
  font: string;
  cast: Character[];
  shots: Shot[];
  props: CustomProp[];
  audio: AudioSettings;
  fadeOut: boolean;
}

export const PLACES: { id: PlaceId; label: string }[] = [
  { id: 'fort', label: 'قلعة' },
  { id: 'desert', label: 'صحراء' },
  { id: 'sea', label: 'بحر وشاطئ' },
  { id: 'mountains', label: 'جبال ووادٍ' },
  { id: 'farm', label: 'مزرعة نخيل' },
  { id: 'city', label: 'مدينة' },
  { id: 'classroom', label: 'فصل دراسي' },
  { id: 'home', label: 'مجلس البيت' },
  { id: 'space', label: 'فضاء' },
];

export const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: 'day', label: 'نهار' },
  { id: 'sunset', label: 'غروب' },
  { id: 'night', label: 'ليل' },
];

export const SIZES: { id: ShotSize; label: string; hint: string }[] = [
  { id: 'wide', label: 'واسعة', hint: 'المكان كله والشخصيات صغيرة' },
  { id: 'medium', label: 'متوسطة', hint: 'الشخصية كاملة' },
  { id: 'close', label: 'قريبة', hint: 'الوجه والكتفان' },
];

export const CAMERAS: { id: CameraMove; label: string }[] = [
  { id: 'still', label: 'ثابتة' },
  { id: 'push', label: 'اقتراب بطيء' },
  { id: 'pan', label: 'حركة جانبية' },
];

export const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: 'dip', label: 'إظلام سريع' },
  { id: 'flash', label: 'ومضة بيضاء' },
  { id: 'cut', label: 'قطع مباشر' },
];

export const KINDS: { id: CharKind; label: string }[] = [
  { id: 'boy', label: 'ولد' },
  { id: 'girl', label: 'بنت' },
  { id: 'man', label: 'رجل' },
  { id: 'woman', label: 'امرأة' },
];

export const OUTFITS: { id: OutfitId; label: string; for: 'male' | 'female' | 'both' }[] = [
  { id: 'dishdasha', label: 'دشداشة وكمّة', for: 'male' },
  { id: 'massar', label: 'دشداشة ومصرّ', for: 'male' },
  { id: 'ghutra', label: 'ثوب وغترة وعقال', for: 'male' },
  { id: 'abaya', label: 'عباءة وشيلة', for: 'female' },
  { id: 'omaniDress', label: 'زي عُماني تقليدي', for: 'female' },
  { id: 'school', label: 'زي مدرسي', for: 'female' },
  { id: 'casual', label: 'لبس عادي', for: 'both' },
  { id: 'labcoat', label: 'معطف مختبر', for: 'both' },
];

export const ACTIONS: { id: ActionId; label: string; minSeconds?: number }[] = [
  { id: 'stand', label: 'يقف' },
  { id: 'walk', label: 'يمشي' },
  { id: 'run', label: 'يركض' },
  { id: 'dance', label: 'يرقص' },
  { id: 'nod', label: 'يهزّ رأسه موافقًا' },
  { id: 'wave', label: 'يلوّح' },
  { id: 'talk', label: 'يتكلم' },
  { id: 'point', label: 'يشير' },
  { id: 'greet', label: 'يرحّب (يده على صدره)' },
  { id: 'think', label: 'يفكّر' },
  { id: 'clap', label: 'يصفّق' },
  { id: 'cheer', label: 'يحتفل' },
  { id: 'jump', label: 'يقفز', minSeconds: 2 },
  { id: 'power', label: 'ضربة قوة (أنمي)', minSeconds: 4 },
];

export const EXPRESSIONS: { id: Expression; label: string }[] = [
  { id: 'calm', label: 'هادئ' },
  { id: 'happy', label: 'سعيد' },
  { id: 'look', label: 'ينظر إلينا' },
  { id: 'set', label: 'حازم' },
  { id: 'surprised', label: 'متفاجئ' },
  { id: 'sad', label: 'حزين' },
];

export const EFFECTS: { id: EffectId; label: string }[] = [
  { id: 'fireworks', label: 'ألعاب نارية' },
  { id: 'confetti', label: 'قصاصات احتفال' },
  { id: 'balloons', label: 'بالونات' },
  { id: 'ribbons', label: 'أشرطة بألوان علم عُمان' },
  { id: 'sparkles', label: 'لمعان' },
  { id: 'shootingStars', label: 'شهب' },
  { id: 'rain', label: 'مطر' },
  { id: 'dust', label: 'غبار ورمال' },
  { id: 'speedlines', label: 'خطوط سرعة' },
];

export const MUSIC: { id: MusicId; label: string }[] = [
  { id: 'none', label: 'بلا موسيقى' },
  { id: 'calm', label: 'هادئة' },
  { id: 'festive', label: 'احتفالية (طبول وتصفيق)' },
  { id: 'epic', label: 'حماسية' },
];

export const SKINS = ['#f1c9a5', '#d9a07a', '#b97a55', '#8a5536'];

export const isFemale = (k: CharKind) => k === 'girl' || k === 'woman';
export const isKid = (k: CharKind) => k === 'boy' || k === 'girl';

export const outfitsFor = (k: CharKind) => OUTFITS.filter((o) => o.for === 'both' || o.for === (isFemale(k) ? 'female' : 'male'));
