// Shared storage pieces: the data shape, backup files, and the Store interface the web build implements.
import { DEFAULT_SECTIONS, DEFAULT_SETTINGS, FLUIDS } from './calc';
import type { DayLog, FluidDay, Issue, SectionDef, Settings } from './types';

export interface AppData {
  settings: Settings;
  entries: DayLog[]; // sorted by date
}

/** Where the log is being saved right now, for the status line. */
export interface SyncState {
  where: 'device' | 'account';
  ready: boolean; // the log shown can be trusted and edited (loaded from the account, or a copy kept here)
  loading: boolean; // account: first full load hasn't arrived yet
  pending: number; // changes not confirmed by the account yet
  stalled: boolean; // the last send failed (no signal); retrying
  fallback: boolean; // wanted the account but couldn't reach it, saving in this browser for now
  notKept: boolean; // this browser refused to store anything, so unsent changes are only in memory
  error?: string;
}

export type SaveResult = 'saved' | 'declined' | 'unavailable';

export interface Store {
  /** Data to show right away (the copy kept in this browser). */
  initial: AppData;
  /** True when `initial` is a real copy of the log, safe to show and edit before start() has loaded anything. */
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

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});

export function normalizeSettings(s: Partial<Settings> | undefined | null): Settings {
  const v = obj(s) as Partial<Settings>;
  const sections: SectionDef[] = Array.isArray(v.sections) && v.sections.length
    ? v.sections
        .filter((x) => x && typeof x.id === 'string')
        .map((x) => ({ ...x, title: str(x.title), sided: !!x.sided, rows: (Array.isArray(x.rows) ? x.rows : []).filter((r) => r && typeof r.id === 'string').map((r) => ({ ...r, label: str(r.label), kind: r.kind === 'added' ? 'added' : 'hours' })) }))
    : DEFAULT_SECTIONS;
  const start = obj(v.start);
  return {
    ...DEFAULT_SETTINGS,
    ...v,
    boatName: str(v.boatName),
    chief: str(v.chief),
    sections,
    start: {
      ...(typeof start.date === 'string' ? { date: start.date } : {}),
      counters: { ...obj(start.counters) },
      fluids: { ...DEFAULT_SETTINGS.start.fluids, ...obj(start.fluids) },
    },
    lastBackup: typeof v.lastBackup === 'string' ? v.lastBackup : null,
  };
}

/** Fill in anything missing from a saved day, so an old or damaged copy can't break the screens. */
export function normalizeDay(e: any): DayLog {
  const d = obj(e);
  const fluids = {} as DayLog['fluids'];
  for (const { id } of FLUIDS) {
    const f = obj(obj(d.fluids)[id]);
    fluids[id] = { used: num(f.used), purchased: num(f.purchased), transferred: num(f.transferred), ...(num(f.ending) != null ? { ending: num(f.ending) } : {}) } as FluidDay;
  }
  const cells: DayLog['cells'] = {};
  for (const [k, c] of Object.entries(obj(d.cells))) {
    const cell = obj(c);
    const reset = obj(cell.reset);
    cells[k] = {
      today: num(cell.today),
      ...(cell.reset ? { reset: { to: num(reset.to) ?? 0, note: str(reset.note) } } : {}),
      ...(num(cell.start) != null ? { start: num(cell.start)! } : {}),
    };
  }
  const yn = (v: unknown): Issue['resolved'] => (v === 'Yes' || v === 'No' ? v : '');
  return {
    date: str(d.date),
    chief: str(d.chief),
    fluids,
    draftBow: num(d.draftBow), draftStern: num(d.draftStern), loads: num(d.loads), empties: num(d.empties),
    from: str(d.from), to: str(d.to),
    cells,
    comments: str(d.comments),
    issues: (Array.isArray(d.issues) ? d.issues : []).map((i: any) => ({ category: str(i?.category), comment: str(i?.comment), resolved: yn(i?.resolved), notified: yn(i?.notified) })),
  };
}

const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function normalize(d: any): AppData {
  if (!d || typeof d !== 'object' || !Array.isArray(d.entries))
    throw new Error("This isn't an engine log backup file.");
  if (d.app && d.app !== 'engine-log')
    throw new Error(`This is a backup from a different app (${String(d.app)}), not an engine log backup.`);
  if (!d.entries.every((e: any) => isDate(e?.date) && e.cells && typeof e.cells === 'object'))
    throw new Error("This file's days aren't engine log days.");
  const entries = d.entries.map(normalizeDay).sort((a: DayLog, b: DayLog) => a.date.localeCompare(b.date));
  const settings = normalizeSettings(d.settings);
  if (!settings.start.date && entries.length) settings.start.date = entries[0].date;
  return { settings, entries };
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
