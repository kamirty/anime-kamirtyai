import { ASPECTS, type Project } from '../../domain/types';
import { shotFrames, shotStarts } from '../../domain/timeline';
import { renderFrameSafe } from '../renderer/renderFrame';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch] || ch);
}

/** Opens a printable storyboard; browser Print → Save as PDF is fully offline. */
export function printStoryboard(project: Project): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  const design = ASPECTS[project.aspect].design;
  const max = 540;
  const scale = max / Math.max(design.width, design.height);
  const width = Math.round(design.width * scale);
  const height = Math.round(design.height * scale);
  const starts = shotStarts(project);
  const cards = project.shots.map((shot, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    renderFrameSafe(project, starts[i] + Math.floor(shotFrames(shot) * 0.6), canvas.getContext('2d')!, { width, height });
    const image = canvas.toDataURL('image/png');
    const title = 'المشهد ' + (i + 1) + ' · ' + shot.duration + ' ثانية';
    const caption = [shot.text?.main, shot.dialogue?.text].filter(Boolean).join(' — ');
    return '<article><img alt="' + escapeHtml(title) + '" src="' + image + '"><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(caption) + '</p></article>';
  }).join('');
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${escapeHtml(project.title)} — لوحة المشاهد</title>
<style>body{font:15px/1.5 Tahoma,sans-serif;margin:24px;color:#111;background:#fff}header{display:flex;align-items:center;justify-content:space-between;gap:16px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:18px 0}article{border:1px solid #ddd;padding:10px;break-inside:avoid;min-width:0}img{display:block;width:100%;height:auto;object-fit:contain;background:#eee}article b{display:block;margin-top:6px}article p{margin:4px 0;color:#555;overflow-wrap:anywhere}button{padding:10px 18px;cursor:pointer}@page{size:A4;margin:12mm}@media print{body{margin:0}button{display:none}.grid{gap:10px}}</style>
</head><body><header><h1>${escapeHtml(project.title || 'لوحة القصة')}</h1><button onclick="window.print()">طباعة / حفظ PDF</button></header><p>لوحة القصة — ${project.shots.length} مشهد. اختر «حفظ كملف PDF» من إعدادات الطباعة.</p><section class="grid">${cards}</section></body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
