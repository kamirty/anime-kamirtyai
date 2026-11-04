import { parseProject } from '../domain/sanitize';
import type { Project } from '../domain/types';

const KEY = 'kamirty-anime:library:v1';
const LIMIT = 12;

export interface LibraryEntry {
  id: string;
  title: string;
  description: string;
  updated: string;
  project: Project;
}

export function readLibrary(): LibraryEntry[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(values)) return [];
    return values.slice(0, LIMIT).flatMap((item): LibraryEntry[] => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      try {
        return [{
          id: String(row.id || '').slice(0, 80),
          title: String(row.title || 'مشروع دون عنوان').slice(0, 80),
          description: String(row.description || '').slice(0, 1500),
          updated: String(row.updated || ''),
          project: parseProject(row.project),
        }];
      } catch { return []; }
    }).filter((entry) => entry.id);
  } catch { return []; }
}

/** Snapshots are optional conveniences; always export a .anime.json backup for important projects. */
export function saveToLibrary(project: Project, description: string): LibraryEntry[] {
  const entry: LibraryEntry = {
    id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    title: project.title || 'مشروع دون عنوان',
    description,
    updated: new Date().toISOString(),
    project: structuredClone(project),
  };
  const next = [entry, ...readLibrary()].slice(0, LIMIT);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deleteFromLibrary(id: string): LibraryEntry[] {
  const next = readLibrary().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
