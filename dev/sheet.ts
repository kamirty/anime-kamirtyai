import '../src/design/fontImports';
import { ensureFontLoaded } from '../src/design/fonts';
import { newCharacter, parseProject } from '../src/domain/sanitize';
import type { CharKind, Outfit } from '../src/domain/types';
import { MOTIONS, applyMotion } from '../src/engine/motions';
import { renderFrame } from '../src/engine/renderer/renderFrame';

/**
 * Developer contact sheet: every motion drawn at the moment it settles, so the poses can be
 * checked at a glance. `?cat=feel&outfit=massar&kind=man&at=0.9`. Not part of the studio.
 */

const q = new URLSearchParams(location.search);
const cat = q.get('cat') ?? 'all';
const outfit = (q.get('outfit') ?? 'dishdasha') as Outfit;
const kind = (q.get('kind') ?? 'man') as CharKind;
const at = Number(q.get('at') ?? 0.9);
const size = (q.get('size') ?? 'medium') as 'wide' | 'medium' | 'close';

(async () => {
  await ensureFontLoaded('ruqaa');
  const base = parseProject({
    cast: [{ ...newCharacter(kind, outfit, 'س'), id: 'b' }],
    aspect: 'portrait',
    shots: [{ duration: 3, place: 'classroom', time: 'day', size, actors: [{ cast: 'b', action: 'stand', x: 0.5 }] }],
  });
  const list = MOTIONS.filter((m) => m.cat !== 'camera' && (cat === 'all' || m.cat === cat));
  for (const m of list) {
    const p = applyMotion(base, 0, m.id);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:inline-block;text-align:center;color:#fff;font:12px Cairo;width:150px';
    const c = document.createElement('canvas');
    c.width = 270;
    c.height = 440;
    c.style.width = '150px';
    wrap.appendChild(c);
    const l = document.createElement('div');
    l.textContent = m.label;
    wrap.appendChild(l);
    document.body.appendChild(wrap);
    const frames = Math.round(p.shots[0].duration * 24);
    renderFrame(p, Math.round(frames * at), c.getContext('2d')!, { width: 270, height: 440 }, { noText: true });
  }
  document.title = `sheet ${list.length}`;
  (window as unknown as { done: boolean }).done = true;
})();
