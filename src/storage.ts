// Shared storage pieces: the data shape, backup files, drafts, and the Store interface
// that the phone build (localStore) and the web build (cloudStore) each implement.
import { DEFAULT_SETTINGS } from './calc';
import type { DayEntry, Settings } from './types';

export interface AppData {
  settings: Settings;
  entries: DayEntry[];
}

/** Where the log is being saved right now, for the status line. */
export interface SyncState {
  where: 'device' | 'account';
  loading: boolean; // account: first load hasn't answered yet
  pending: number; // account: changes not confirmed yet (no signal)
  fallback: boolean; // wanted the account but couldn't reach it, saving in this browser for now
  error?: string;
}

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
  /** Offer a file to the user. */
  saveFile(filename: string, text: string): Promise<'saved' | 'declined' | 'unavailable'>;
}

export const emptyData = (): AppData => ({ settings: { ...DEFAULT_SETTINGS }, entries: [] });

export function normalize(d: any): AppData {
  if (!d || typeof d !== 'object' || !Array.isArray(d.entries)) throw new Error('Not a fuel log backup file');
  return { settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) }, entries: d.entries };
}

export function backupFile(data: AppData): { filename: string; text: string } {
  const file = { app: 'towboat-fuel-log', version: 1, exportedAt: new Date().toISOString(), ...data };
  const name = (data.settings.boatName || 'boat').replace(/[^\w-]+/g, '_');
  return { filename: `fuel-log-${name}-${new Date().toISOString().slice(0, 10)}.json`, text: JSON.stringify(file, null, 2) };
}

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

// Unsaved typing on the entry screen is kept per day, so a page reload doesn't lose it.
const DRAFT = 'fuel-log:draft:';

export interface Draft {
  tanks: Record<string, { sounding: string; gallons: string }>;
  nums: Record<string, string>;
  start: { fuel: string; lube: string; water: string };
}

export const readDraft = (date: string) => readLocal<Draft>(DRAFT + date);
export const writeDraft = (date: string, d: Draft | null) => writeLocal(DRAFT + date, d);

export function draftDates(): string[] {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(DRAFT)).map((k) => k.slice(DRAFT.length)).sort();
  } catch {
    return [];
  }
}
