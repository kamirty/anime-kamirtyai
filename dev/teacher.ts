import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { describeToProject } from '../src/engine/parser/describe';
import { newCharacter, parseProject } from '../src/domain/sanitize';
(async () => {
  await ensureFontLoaded('ruqaa');
  const { project } = describeToProject('في الفصل صباحاً معلمة تقول «اليوم نتعلم حرف الضاد». ثم طالبة اسمها مريم ترفع يدها وتسأل «لماذا يسمونها لغة الضاد؟» ثم يصفق الطلاب.');
  const side = parseProject({ cast: [{ ...newCharacter('woman', 'abaya', 'المعلمة'), id: 't' }, { ...newCharacter('girl', 'omaniDress', 'بنت'), id: 'g' }], aspect: 'portrait', shots: [{ duration: 4, place: 'classroom', time: 'day', size: 'medium', board: 'حرف الضاد', actors: [{ cast: 't', action: 'walk', x: 0.2, to: 0.8 }] }, { duration: 3, place: 'farm', size: 'close', actors: [{ cast: 'g', action: 'stand', expression: 'look', x: 0.5 }] }] });
  const shots: [typeof project, number][] = [[project, 20], [project, 60 + 30], [project, 60 + 84 + 30], [project, 60 + 84 + 72 + 30], [side, 20], [side, 96 + 30]];
  for (const [p, f] of shots) {
    const c = document.createElement('canvas'); c.width = 540; c.height = 960; c.style.width = '260px'; c.style.height = 'auto'; document.body.appendChild(c);
    renderFrame(p, f, c.getContext('2d')!, { width: 540, height: 960 });
  }
  (window as unknown as { done: boolean }).done = true;
})();
