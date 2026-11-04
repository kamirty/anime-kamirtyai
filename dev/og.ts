import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
(async () => {
  await ensureFontLoaded('ruqaa');
  await document.fonts.load('700 40px "Cairo"');
  const boy = { ...newCharacter('boy', 'dishdasha', 'سالم'), id: 'b' };
  const girl = { ...newCharacter('girl', 'omaniDress', 'مريم'), id: 'g' };
  const p = parseProject({ cast: [boy, girl], aspect: 'landscape', shots: [
    { duration: 4, place: 'fort', time: 'night', size: 'wide', effects: ['fireworks', 'ribbons'], actors: [{ cast: 'b', action: 'cheer', expression: 'happy', x: 0.36 }, { cast: 'g', action: 'wave', expression: 'happy', x: 0.64 }], text: { style: 'title', main: 'استوديو الأنمي العربي', sub: 'اكتب مشهدك… وحوّله إلى أنمي بصوت ومؤثرات' } } ] });
  const c = document.createElement('canvas'); c.width = 1200; c.height = 675; document.body.appendChild(c);
  renderFrame(p, 60, c.getContext('2d')!, { width: 1200, height: 675 });
  const out = document.createElement('canvas'); out.width = 1200; out.height = 630; out.getContext('2d')!.drawImage(c, 0, -22);
  (window as unknown as { og: string }).og = out.toDataURL('image/png');
  (window as unknown as { done: boolean }).done = true;
})();
