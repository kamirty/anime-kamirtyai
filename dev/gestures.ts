import '../src/design/fontImports';
import { renderFrame } from '../src/engine/renderer/renderFrame';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
import { MOTIONS, applyMotion } from '../src/engine/motions';
(async () => {
  await ensureFontLoaded('ruqaa');
  const base = parseProject({ cast: [{ ...newCharacter('boy', 'dishdasha', 'س'), id: 'b' }], aspect: 'portrait', shots: [{ duration: 3, place: 'farm', time: 'day', size: 'medium', actors: [{ cast: 'b', action: 'stand', x: 0.5 }] }] });
  for (const m of MOTIONS.filter((x) => x.cat === 'gesture')) {
    const p = applyMotion(base, 0, m.id);
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:inline-block;text-align:center;color:#fff;font:12px Cairo;width:150px';
    const c = document.createElement('canvas'); c.width = 270; c.height = 480; c.style.width = '150px'; wrap.appendChild(c);
    const l = document.createElement('div'); l.textContent = m.label; wrap.appendChild(l); document.body.appendChild(wrap);
    renderFrame(p, 60, c.getContext('2d')!, { width: 270, height: 480 }, { noText: true });
  }
  (window as unknown as { done: boolean }).done = true;
})();
