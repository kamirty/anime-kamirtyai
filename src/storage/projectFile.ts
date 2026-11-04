import { parseProject } from '../domain/sanitize';
import type { Project } from '../domain/types';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const projectBlob = (p: Project) => new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });

export async function readProjectFile(file: File): Promise<Project> {
  if (file.size > 5 * 1024 * 1024) throw new Error('الملف كبير جدًا لمشروع.');
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('الملف ليس JSON صالحًا.');
  }
  return parseProject(data);
}

const KEY = 'kamirty-anime:autosave:v1';

export function saveLocal(project: Project, description: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ project, description }));
  } catch {
    /* best effort */
  }
}

export function loadLocal(): { project: Project; description: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as { project: unknown; description: unknown };
    return { project: parseProject(d.project), description: typeof d.description === 'string' ? d.description : '' };
  } catch {
    return null;
  }
}

export const safeName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'kamirty-anime';
