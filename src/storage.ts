// Everything is saved on this device in the browser's localStorage. Backup/Restore move it as a JSON file.
import { DEFAULT_SETTINGS } from './calc';
import type { DayEntry, Settings } from './types';

const KEY = 'towboat-fuel-log:v1';

export interface AppData {
  settings: Settings;
  entries: DayEntry[];
}

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* fall through to empty */
  }
  return { settings: { ...DEFAULT_SETTINGS }, entries: [] };
}

export function save(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function normalize(d: any): AppData {
  if (!d || typeof d !== 'object' || !Array.isArray(d.entries)) throw new Error('Not a fuel log backup file');
  return { settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) }, entries: d.entries };
}

export function downloadBackup(data: AppData): void {
  const file = { app: 'towboat-fuel-log', version: 1, exportedAt: new Date().toISOString(), ...data };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const name = (data.settings.boatName || 'boat').replace(/[^\w-]+/g, '_');
  a.href = URL.createObjectURL(blob);
  a.download = `fuel-log-${name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function readBackup(file: File): Promise<AppData> {
  return normalize(JSON.parse(await file.text()));
}
