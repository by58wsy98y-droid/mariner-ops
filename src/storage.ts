// Shared storage pieces: the data shape, backup files, and the Store interface the web build implements.
import { DEFAULT_SECTIONS, DEFAULT_SETTINGS } from './calc';
import type { DayLog, Settings } from './types';

export interface AppData {
  settings: Settings;
  entries: DayLog[]; // sorted by date
}

/** Where the log is being saved right now, for the status line. */
export interface SyncState {
  where: 'device' | 'account';
  loading: boolean; // account: first load hasn't answered yet
  pending: number; // account: changes not confirmed yet (no signal)
  fallback: boolean; // wanted the account but couldn't reach it, saving in this browser for now
  error?: string;
}

export type SaveResult = 'saved' | 'declined' | 'unavailable';

export interface Store {
  /** Data to show right away (the copy kept in this browser). */
  initial: AppData;
  /** True when `initial` is safe to show before start() has loaded anything. */
  ready: boolean;
  /** Start loading/listening. Calls back with fresh data and status. Returns a stop function. */
  start(onData: (d: AppData) => void, onStatus: (s: SyncState) => void): () => void;
  /** Save a change: pass the state before and after, the store saves what differs. */
  persist(prev: AppData, next: AppData): void;
  /** Replace the whole log (restore from a backup file). */
  replaceAll(prev: AppData, next: AppData): void;
  /** Offer a file to the user (backup .json or printable .pdf). */
  saveFile(filename: string, data: string | ArrayBuffer): Promise<SaveResult>;
}

export const emptyData = (): AppData => ({ settings: normalizeSettings({}), entries: [] });

export function normalizeSettings(s: Partial<Settings> | undefined | null): Settings {
  const v = s ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...v,
    sections: Array.isArray(v.sections) && v.sections.length ? v.sections : DEFAULT_SECTIONS,
    start: {
      counters: { ...(v.start?.counters ?? {}) },
      fluids: { ...DEFAULT_SETTINGS.start.fluids, ...(v.start?.fluids ?? {}) },
    },
  };
}

export function normalize(d: any): AppData {
  if (!d || typeof d !== 'object' || !Array.isArray(d.entries) || !d.entries.every((e: any) => typeof e?.date === 'string'))
    throw new Error("This isn't an engine log backup file.");
  const entries = [...d.entries].sort((a: DayLog, b: DayLog) => a.date.localeCompare(b.date));
  return { settings: normalizeSettings(d.settings), entries };
}

const fileSafe = (s: string) => s.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'boat';

export function backupFile(data: AppData, now = new Date()): { filename: string; text: string } {
  const file = { app: 'engine-log', version: 1, exportedAt: now.toISOString(), ...data };
  return {
    filename: `engine-log-backup-${fileSafe(data.settings.boatName)}-${now.toISOString().slice(0, 10)}.json`,
    text: JSON.stringify(file, null, 2),
  };
}

export const pdfName = (data: AppData, dates: string[]) =>
  `engine-log-${fileSafe(data.settings.boatName)}-${dates[0]}${dates.length > 1 ? `-to-${dates[dates.length - 1]}` : ''}.pdf`;

export async function readBackup(file: File): Promise<AppData> {
  return normalize(JSON.parse(await file.text()));
}

// Browser storage can throw or come back empty (private mode, blocked site data); never crash on it.
export function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
