import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
import type { Project } from '../src/domain/types';

const q = new URLSearchParams(location.search);
const sheet = q.get('sheet') ?? 'chars';

function mk(): { p: Project; frames: number[] } {
  const boy = { ...newCharacter('boy', 'dishdasha', 'سالم'), id: 'b' };
  const girl = { ...newCharacter('girl', 'school', 'مريم'), id: 'g' };
  const man = { ...newCharacter('man', 'massar', 'جد'), id: 'm' };
  const woman = { ...newCharacter('woman', 'omaniDress', 'أم'), id: 'w' };
  const m2 = { ...newCharacter('man', 'ghutra', 'خالد'), id: 'm2' };
  const k2 = { ...newCharacter('boy', 'casual', 'أحمد'), id: 'k2' };
  const w2 = { ...newCharacter('woman', 'abaya', 'نورة'), id: 'w2' };
  const w3 = { ...newCharacter('woman', 'labcoat', 'د. ليلى'), id: 'w3' };
  const cast = [boy, girl, man, woman, m2, k2, w2, w3];
  if (sheet === 'chars') {
    const shots = [
      { place: 'classroom', time: 'day', size: 'wide', actors: [{ cast: 'b', action: 'wave', expression: 'happy', x: 0.3 }, { cast: 'g', action: 'talk', expression: 'look', x: 0.7 }], dialogue: { actor: 1, text: 'صباح الخير يا أستاذ!' } },
      { place: 'home', time: 'night', size: 'wide', actors: [{ cast: 'm', action: 'greet', expression: 'calm', x: 0.3 }, { cast: 'w', action: 'stand', expression: 'calm', x: 0.7 }] },
      { place: 'city', time: 'sunset', size: 'wide', actors: [{ cast: 'm2', action: 'point', expression: 'calm', x: 0.3 }, { cast: 'k2', action: 'cheer', expression: 'happy', x: 0.7 }] },
      { place: 'space', time: 'night', size: 'wide', actors: [{ cast: 'w2', action: 'think', expression: 'calm', x: 0.3 }, { cast: 'w3', action: 'clap', expression: 'happy', x: 0.7 }] },
      { place: 'fort', time: 'night', size: 'medium', actors: [{ cast: 'b', action: 'stand', expression: 'calm', x: 0.5 }] },
      { place: 'fort', time: 'night', size: 'close', actors: [{ cast: 'b', action: 'talk', expression: 'look', x: 0.5 }], dialogue: { actor: 0, text: 'كل عام وعُماننا بخير' } },
      { place: 'farm', time: 'day', size: 'close', actors: [{ cast: 'g', action: 'stand', expression: 'surprised', x: 0.5 }] },
      { place: 'sea', time: 'day', size: 'close', actors: [{ cast: 'w', action: 'stand', expression: 'happy', x: 0.5 }] },
    ];
    return { p: parseProject({ cast, shots: shots.map((s) => ({ ...s, duration: 3 })), aspect: 'portrait' }), frames: shots.map((_, i) => i * 72 + 30) };
  }
  if (sheet === 'places') {
    const places = ['fort', 'desert', 'sea', 'mountains', 'farm', 'city', 'classroom', 'home', 'space'];
    const times = ['day', 'sunset', 'night'];
    const shots = places.flatMap((p) => times.map((t) => ({ place: p, time: t, size: 'wide', duration: 2, actors: [{ cast: 'b', action: 'stand', x: 0.5 }] })));
    return { p: parseProject({ cast, shots, aspect: q.get('aspect') ?? 'portrait' }), frames: shots.map((_, i) => i * 48 + 10) };
  }
  // power + effects
  const shots = [
    { place: 'fort', time: 'night', size: 'wide', duration: 5, effects: [], actors: [{ cast: 'b', action: 'power', expression: 'set', x: 0.5 }] },
    { place: 'fort', time: 'night', size: 'wide', duration: 4, effects: ['fireworks', 'ribbons'], actors: [{ cast: 'b', action: 'cheer', x: 0.5 }], text: { style: 'caption', main: 'كل عام وعُماننا بخير', sub: 'اليوم الوطني 56' } },
    { place: 'desert', time: 'day', size: 'wide', duration: 3, effects: ['dust'], actors: [{ cast: 'k2', action: 'walk', x: 0.2, to: 0.8 }] },
    { place: 'city', time: 'night', size: 'wide', duration: 3, effects: ['rain'], actors: [{ cast: 'g', action: 'jump', x: 0.5 }], text: { style: 'title', main: 'مغامرة جديدة', sub: 'الحلقة الأولى' } },
    { place: 'farm', time: 'day', size: 'wide', duration: 3, effects: ['balloons', 'confetti'], actors: [{ cast: 'w', action: 'clap', x: 0.5 }] },
  ];
  const p = parseProject({ cast, shots, aspect: 'portrait' });
  const fr = (s: number, sec: number) => Math.round((p.shots.slice(0, s).reduce((n, x) => n + x.duration, 0) + sec) * 24);
  return { p, frames: [fr(0, 0.3), fr(0, 0.7), fr(0, 0.8), fr(0, 1.2), fr(0, 1.6), fr(0, 2.2), fr(0, 2.6), fr(0, 3.6), fr(1, 2), fr(2, 1.5), fr(3, 0.4), fr(3, 0.9), fr(3, 2), fr(4, 2)] };
}

(async () => {
  await ensureFontLoaded('ruqaa');
  await document.fonts.ready;
  const { p, frames } = mk();
  const W = p.aspect === 'landscape' ? 960 : 540;
  const H = p.aspect === 'landscape' ? 540 : p.aspect === 'square' ? 540 : 960;
  for (const f of frames) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    if (p.aspect === 'landscape') c.style.width = '400px';
    document.body.appendChild(c);
    renderFrame(p, f, c.getContext('2d')!, { width: W, height: H });
  }
  (window as unknown as { done: boolean }).done = true;
})().catch((e) => { document.body.textContent = String(e?.stack ?? e); (window as unknown as { done: boolean }).done = true; });
