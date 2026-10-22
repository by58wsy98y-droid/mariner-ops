// The log is kept in the user's own private space in the page's database (claude.ai), so it shows on
// phone and laptop and survives a lost phone. Every change is also kept in this browser until the
// database confirms it, so a dropped signal loses nothing; it sends on its own when signal returns.
import { emptyData, normalize, normalizeSettings, readLocal, writeLocal, type AppData, type Store, type SyncState } from './storage';
import type { DayLog, Settings } from './types';

const CACHE_KEY = 'engine-log:cache';
const PENDING_KEY = 'engine-log:pending';
const RETRY_MS = 20000;
const WRITE_TIMEOUT_MS = 30000;
const SETTINGS_ID = 'settings';
const DAY_PREFIX = 'day-';

type Body = Record<string, unknown>;
type Docs = Map<string, Body>;
/** Writes not confirmed yet, by document id; null = delete. */
type Pending = Record<string, Body | null>;

// One document for settings, one per day ("day-2026-10-17").
export function toDocs(d: AppData): Docs {
  const docs: Docs = new Map([[SETTINGS_ID, { ...d.settings } as unknown as Body]]);
  for (const e of d.entries) docs.set(DAY_PREFIX + e.date, e as unknown as Body);
  return docs;
}

export function fromDocs(docs: Docs): AppData {
  const settings = docs.get(SETTINGS_ID) as Partial<Settings> | undefined;
  const entries = [...docs]
    .filter(([id]) => id.startsWith(DAY_PREFIX))
    .map(([, body]) => body as unknown as DayLog)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { settings: normalizeSettings(settings), entries };
}

/** The document writes that turn `prev` into `next`; `alsoDelete` lists other ids to remove if absent from `next`. */
export function diffDocs(prev: Docs, next: Docs, alsoDelete: Iterable<string> = []): Pending {
  const out: Pending = {};
  for (const [id, body] of next) if (JSON.stringify(prev.get(id)) !== JSON.stringify(body)) out[id] = body;
  for (const id of [...prev.keys(), ...alsoDelete]) if (!next.has(id)) out[id] = null;
  return out;
}

const use = async (name: string): Promise<any> => {
  try {
    return (await (window as any).claude?.use?.(name)) ?? null;
  } catch {
    return null;
  }
};

function saveInBrowser(filename: string, data: string | ArrayBuffer): 'saved' | 'unavailable' {
  try {
    const type = filename.endsWith('.pdf') ? 'application/pdf' : 'application/json';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject({ code: 'timeout' }), WRITE_TIMEOUT_MS))]);

export function cloudStore(): Store {
  // Unsent changes are saved at once; the full copy a moment later. Opening always lays the first over the second.
  let pending: Pending = readLocal<Pending>(PENDING_KEY) ?? {};
  const withPending = (docs: Docs) => {
    const out = new Map(docs);
    for (const [id, body] of Object.entries(pending)) body ? out.set(id, body) : out.delete(id);
    return out;
  };
  let initial = emptyData();
  let ready = false;
  try {
    const cached = readLocal<AppData>(CACHE_KEY);
    if (cached) {
      initial = fromDocs(withPending(toDocs(normalize(cached))));
      ready = true;
    }
  } catch {
    /* damaged copy: wait for the database */
  }

  let server: Docs | null = null;
  let col: any = null;
  let where: SyncState['where'] = 'account';
  let loading = true;
  let error: string | undefined;
  let flushing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onData: (d: AppData) => void = () => {};
  let onStatus: (s: SyncState) => void = () => {};
  let cacheTimer: ReturnType<typeof setTimeout> | undefined;
  let unwritten: AppData | null = null;
  const writeCache = () => {
    clearTimeout(cacheTimer);
    if (unwritten) writeLocal(CACHE_KEY, unwritten);
    unwritten = null;
  };
  const cache = (d: AppData) => {
    unwritten = d;
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(writeCache, 300);
  };

  const report = () =>
    onStatus({ where, loading, pending: Object.keys(pending).length, fallback: where === 'device', error });
  const savePending = () => writeLocal(PENDING_KEY, Object.keys(pending).length ? pending : null);

  // What the page shows: the database's copy with our unconfirmed changes on top.
  const emit = () => {
    if (!server) return;
    const d = fromDocs(withPending(server));
    cache(d);
    onData(d);
  };

  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(flush, ms);
  };

  // Send unconfirmed changes one at a time; stop at the first failure and try again later.
  async function flush() {
    if (!col || flushing) return;
    flushing = true;
    try {
      for (;;) {
        const id = Object.keys(pending)[0];
        if (id === undefined) break;
        const body = pending[id];
        try {
          const ref = col.doc(id);
          await withTimeout(body ? ref.set(body) : ref.delete());
          error = undefined;
        } catch (e: any) {
          const code = e?.code;
          if (code === 'invalid_argument' || code === 'transform_error') {
            error = `Couldn't save ${id}: ${e?.message ?? code}`; // can never succeed, drop it
          } else if (['revoked', 'not_granted', 'capability_disabled', 'capability_removed'].includes(code)) {
            where = 'device'; // kept in this browser, sends on a later visit
            col = null;
            return;
          } else {
            if (code === 'quota_exceeded') error = 'The log storage is full. Back up your log.';
            schedule(RETRY_MS + Math.random() * 5000); // no signal or busy: try again later
            return;
          }
        }
        if (pending[id] === body) delete pending[id]; // unless it changed again while sending
        savePending();
        report();
      }
    } finally {
      flushing = false;
      report();
    }
  }

  const queue = (changes: Pending, next: AppData) => {
    Object.assign(pending, changes);
    savePending();
    cache(next);
    report();
    schedule(300); // one write per pause in typing
  };

  return {
    initial,
    ready,
    start(dataCb, statusCb) {
      onData = dataCb;
      onStatus = statusCb;
      report();
      let stopped = false;
      let unsub: () => void = () => {};
      // Switching away: save the full copy now (the phone may close the page). Coming back: send what's waiting.
      const kick = () => (document.visibilityState === 'hidden' ? writeCache() : flush());

      (async () => {
        const [db, user] = await Promise.all([use('db'), use('user')]);
        const uid: string | null = user ? await user.id() : null;
        if (stopped) return;
        if (!db || !uid) {
          where = 'device';
          loading = false;
          report();
          return;
        }
        col = db.collection('data/users/' + uid); // private to this user
        const subscribe = () => {
          unsub = col.onSnapshot(
            (snap: any) => {
              server = new Map(snap.docs.filter((d: any) => d.exists).map((d: any) => [d.id, d.data()]));
              loading = false;
              emit();
              report();
            },
            (e: any) => {
              if (stopped) return;
              if (e?.code === 'unavailable') setTimeout(subscribe, RETRY_MS); // connection lost: listen again
              else {
                where = 'device';
                col = null;
                loading = false;
                report();
              }
            }
          );
        };
        subscribe();
        flush();
      })();

      window.addEventListener('online', kick);
      window.addEventListener('pagehide', writeCache);
      document.addEventListener('visibilitychange', kick);
      return () => {
        stopped = true;
        unsub();
        clearTimeout(timer);
        writeCache();
        window.removeEventListener('online', kick);
        window.removeEventListener('pagehide', writeCache);
        document.removeEventListener('visibilitychange', kick);
      };
    },
    persist: (prev, next) => queue(diffDocs(toDocs(prev), toDocs(next)), next),
    // Restore writes everything in the file and removes every other day.
    replaceAll: (prev, next) => queue(diffDocs(new Map(), toDocs(next), [...toDocs(prev).keys(), ...(server?.keys() ?? [])]), next),
    async saveFile(filename, data) {
      // Opened as a plain page (not inside claude.ai): an ordinary browser download.
      if (!(window as any).claude) return saveInBrowser(filename, data);
      const downloads = await use('downloads');
      if (!downloads) return 'unavailable';
      try {
        await downloads.save({ filename, data });
        return 'saved';
      } catch (e: any) {
        return e?.code === 'declined' ? 'declined' : 'unavailable';
      }
    },
  };
}
