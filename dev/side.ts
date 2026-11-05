import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
(async () => {
  await ensureFontLoaded('ruqaa');
  const cast = [
    { ...newCharacter('boy', 'dishdasha', 'سالم'), id: 'b' },
    { ...newCharacter('girl', 'school', 'مريم'), id: 'g' },
    { ...newCharacter('man', 'massar', 'خالد'), id: 'm' },
    { ...newCharacter('woman', 'omaniDress', 'أم'), id: 'w' },
    { ...newCharacter('boy', 'casual', 'أحمد'), id: 'k' },
    { ...newCharacter('man', 'massar', 'جد'), id: 'j' },
  ];
  const shots = [
    { duration: 4, place: 'farm', time: 'day', size: 'wide', actors: [{ cast: 'b', action: 'walk', x: 0.2, to: 0.8 }, { cast: 'g', action: 'walk', x: 0.85, to: 0.15 }] },
    { duration: 4, place: 'city', time: 'sunset', size: 'wide', actors: [{ cast: 'm', action: 'walk', x: 0.2, to: 0.8 }, { cast: 'w', action: 'walk', x: 0.85, to: 0.15 }] },
    { duration: 4, place: 'desert', time: 'day', size: 'wide', actors: [{ cast: 'k', action: 'run', x: 0.15, to: 0.85 }, { cast: 'j', action: 'walk', x: 0.85, to: 0.2 }] },
    { duration: 4, place: 'fort', time: 'night', size: 'medium', actors: [{ cast: 'b', action: 'run', x: 0.3, to: 0.7 }] },
  ];
  const p = parseProject({ cast, aspect: 'portrait', shots });
  const frames = [6, 10, 14, 18, 96 + 8, 96 + 14, 192 + 6, 192 + 10, 288 + 4, 288 + 8, 288 + 12];
  for (const f of frames) {
    const c = document.createElement('canvas'); c.width = 540; c.height = 960; c.style.width = '260px'; c.style.height = 'auto'; document.body.appendChild(c);
    renderFrame(p, f, c.getContext('2d')!, { width: 540, height: 960 });
  }
  (window as unknown as { done: boolean }).done = true;
})();
