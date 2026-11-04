import '../src/design/fontImports';
import { drawHead } from '../src/engine/art/head';
(async () => {
  for (const [lvl, hw, label] of [[0, 'kumma', 'مغلق'], [1, 'kumma', 'نصف'], [2, 'kumma', 'مفتوح'], [0, 'hijab', 'مغلق'], [1, 'hijab', 'نصف'], [2, 'hijab', 'مفتوح']] as const) {
    const c = document.createElement('canvas'); c.width = 260; c.height = 300; document.body.appendChild(c);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#e9f2f8'; ctx.fillRect(0, 0, 260, 300);
    ctx.translate(130, 165); ctx.scale(0.36, 0.36);
    drawHead(ctx, { skin: '#b97a55', headwear: hw, wear: '#f6f3ee', accent: '#0b8a3c', hair: '#16110e', expression: 'look', gaze: { x: 0, y: 0 }, mouthOpen: false, mouth: lvl, blink: false, lw: 1 });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.font = '700 18px Cairo'; ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillText(`الفم: ${label}`, 130, 292);
  }
  (window as unknown as { done: boolean }).done = true;
})();
