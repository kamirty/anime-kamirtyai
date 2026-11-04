import '../src/design/fontImports';
import { drawCharacterSide } from '../src/engine/art/side';
import { restPose } from '../src/engine/art/body';
import { newCharacter } from '../src/domain/sanitize';
(async () => {
  const list = [newCharacter('woman', 'abaya', 'م'), newCharacter('girl', 'school', 'ب'), newCharacter('man', 'ghutra', 'خ'), newCharacter('boy', 'dishdasha', 'س'), newCharacter('woman', 'omaniDress', 'أ')];
  for (const ch of list) {
    const c = document.createElement('canvas'); c.width = 300; c.height = 420; document.body.appendChild(c);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#e9f2f8'; ctx.fillRect(0, 0, 300, 420);
    ctx.translate(150, 1150); ctx.scale(1.05, 1.05);
    drawCharacterSide(ctx, ch, restPose('calm'), { facing: 1, phase: 0.25, run: false });
  }
  (window as unknown as { done: boolean }).done = true;
})();
