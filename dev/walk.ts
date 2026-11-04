import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
(async () => {
  await ensureFontLoaded('ruqaa');
  const cast = [{ ...newCharacter('man', 'massar', 'جد'), id: 'm' }, { ...newCharacter('boy', 'dishdasha', 'س'), id: 'b' }, { ...newCharacter('woman', 'abaya', 'ن'), id: 'w' }, { ...newCharacter('girl', 'omaniDress', 'م'), id: 'g' }];
  const shots = cast.map((c) => ({ duration: 4, place: 'farm', time: 'day', size: 'medium', actors: [{ cast: c.id, action: 'walk', x: 0.3, to: 0.7 }] }));
  shots.push({ duration: 4, place: 'farm', time: 'day', size: 'medium', actors: [{ cast: 'b', action: 'run', x: 0.3, to: 0.7 }] }, { duration: 4, place: 'farm', time: 'day', size: 'medium', actors: [{ cast: 'm', action: 'walk', x: 0.7, to: 0.3 }] });
  const p = parseProject({ cast, aspect: 'portrait', shots });
  const frames: number[] = [];
  shots.forEach((_, i) => [4, 8, 12].forEach((f) => frames.push(i * 96 + f)));
  for (const f of frames) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 640; c.style.width = '240px'; c.style.height = 'auto'; document.body.appendChild(c);
    renderFrame(p, f, c.getContext('2d')!, { width: 360, height: 640 });
  }
  (window as unknown as { done: boolean }).done = true;
})();
