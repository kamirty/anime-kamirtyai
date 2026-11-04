import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
(async () => {
  await ensureFontLoaded('ruqaa');
  const boy = { ...newCharacter('boy', 'dishdasha', 'سالم'), id: 'b' };
  const girl = { ...newCharacter('girl', 'school', 'مريم'), id: 'g' };
  const ex = ['amazed', 'embarrassed', 'angry', 'shy', 'gloom'];
  const shots = ex.flatMap((e, i) => [{ duration: 2, place: 'farm', time: 'day', size: 'close', actors: [{ cast: i % 2 ? 'g' : 'b', action: 'stand', expression: e, x: 0.5 }] }]);
  const p = parseProject({ cast: [boy, girl], aspect: 'portrait', shots });
  shots.forEach((_, i) => {
    const c = document.createElement('canvas'); c.width = 540; c.height = 960; c.style.width='300px';c.style.height='auto'; document.body.appendChild(c);
    renderFrame(p, i * 48 + 10, c.getContext('2d')!, { width: 540, height: 960 });
  });
  (window as unknown as { done: boolean }).done = true;
})();
