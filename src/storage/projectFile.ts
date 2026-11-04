import { parseProject } from '../domain/sanitize';
import type { Project } from '../domain/types';
import { decodeVoice, encodeVoice, getVoice, putVoice } from './voices';

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

/** Project file with recorded lines embedded, so a saved project opens with its voices on any device. */
export async function projectBlob(p: Project): Promise<Blob> {
  const voices: Record<string, string> = {};
  for (const s of p.shots) {
    if (!s.voice || voices[s.voice.id]) continue;
    const pcm = await getVoice(s.voice.id);
    if (pcm) voices[s.voice.id] = encodeVoice(pcm);
  }
  const data = Object.keys(voices).length ? { ...p, voices } : p;
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export async function readProjectFile(file: File): Promise<Project> {
  if (file.size > 80 * 1024 * 1024) throw new Error('الملف كبير جدًا لمشروع.');
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('الملف ليس JSON صالحًا.');
  }
  const project = parseProject(data);
  const voices = (data as { voices?: unknown }).voices;
  if (voices && typeof voices === 'object') {
    for (const [id, b64] of Object.entries(voices as Record<string, unknown>)) {
      if (typeof b64 === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(id)) {
        try {
          await putVoice(id, decodeVoice(b64));
        } catch {
          /* a damaged voice is skipped; the shot keeps its text */
        }
      }
    }
  }
  return project;
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
