import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
(async () => {
  await ensureFontLoaded('ruqaa');
  const boy = { ...newCharacter('boy', 'dishdasha', 'سالم'), id: 'b' };
  const man = { ...newCharacter('man', 'massar', 'الجد'), id: 'm' };
  const p = parseProject({ cast: [boy, man], aspect: 'portrait', shots: [
    { duration: 3, place: 'fort', time: 'night', size: 'close', actors: [{ cast: 'b', action: 'stand', expression: 'look', x: 0.5 }] },
    { duration: 3, place: 'fort', time: 'night', size: 'medium', actors: [{ cast: 'b', action: 'stand', expression: 'calm', x: 0.5 }] },
    { duration: 3, place: 'home', time: 'day', size: 'medium', actors: [{ cast: 'm', action: 'stand', expression: 'calm', x: 0.5 }] } ] });
  for (const f of [30, 102, 174]) {
    const c = document.createElement('canvas'); c.width = 540; c.height = 960; document.body.appendChild(c);
    renderFrame(p, f, c.getContext('2d')!, { width: 540, height: 960 });
  }
  (window as unknown as { done: boolean }).done = true;
})();
