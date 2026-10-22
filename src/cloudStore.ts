// The log is kept in the user's own private space in the page's database (claude.ai), so it shows on
// phone and laptop and survives a lost phone. Every change is also kept in this browser until the
// database confirms it, so a dropped signal loses nothing; it sends on its own when signal returns.
//
// Two devices can edit the same day. Each unsent change remembers the copy it started from ("base"),
// and only the fields this device actually changed are laid over the account's current copy when it
// is sent, so the other device's entries for that day are kept.
import { emptyDay } from './calc';
import {
  DAY_PREFIX, emptyData, fromDocs, normalize, readLocal, saveInBrowser, toDocs, writeLocal,
  type AppData, type Store, type SyncState,
} from './storage';

export { fromDocs, toDocs };

const CACHE_KEY = 'engine-log:cache';
const PENDING_KEY = 'engine-log:pending';
const OWNER_KEY = 'engine-log:owner'; // which Claude account the copy and queue above belong to
const parkedKey = (uid: string) => `engine-log:pending:${uid}`;
const RETRY_MS = 20000;
const WRITE_TIMEOUT_MS = 30000;

type Body = Record<string, unknown>;
type Docs = Map<string, Body>;
/** A change not confirmed yet: the copy it was based on, the new copy (null = delete), and whether to replace outright (restore). */
interface Change { base: Body | null; body: Body | null; force?: boolean }
type Pending = Record<string, Change>;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Three-way merge: keep what `local` changed since `base`, take everything else from `remote`.
 * Objects merge field by field (so each counter, fluid and setting is its own field); lists and numbers are whole.
 */
export function merge3(base: unknown, local: unknown, remote: unknown): unknown {
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(b)])) {
      const v = merge3(b[k], local[k], remote[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local; // both changed the same number: this device's typing wins
}

/** What to write for one change, given the account's current copy. undefined = nothing to do. */
function resolve(c: Change, remote: Body | undefined): Body | null | undefined {
  if (c.force) return c.body;
  if (c.body === null) return remote === undefined || same(remote, c.base) ? null : undefined; // don't delete what the other device changed
  if (remote === undefined) return c.body;
  return merge3(c.base, c.body, remote) as Body;
}

const use = async (name: string): Promise<any> => {
  try {
    return (await (window as any).claude?.use?.(name)) ?? null;
  } catch {
    return null;
  }
};

const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject({ code: 'timeout' }), WRITE_TIMEOUT_MS))]);

export function cloudStore(): Store {
  let pending: Pending = {};
  const stored = readLocal<Pending>(PENDING_KEY);
  if (stored && Object.values(stored).every((c) => isObj(c) && 'body' in c)) pending = stored;

  // What the page shows for a set of account documents: unsent changes laid over them.
  const withPending = (docs: Docs) => {
    const out = new Map(docs);
    for (const [id, c] of Object.entries(pending)) {
      const v = resolve(c, docs.get(id));
      if (v === null) out.delete(id);
      else if (v !== undefined) out.set(id, v);
    }
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
    /* damaged copy: wait for the account */
  }

  let server: Docs | null = null;
  let definitive = false; // a complete copy from the account has arrived
  let col: any = null;
  let where: SyncState['where'] = 'account';
  let loading = true;
  let stalled = false;
  let notKept = false;
  let error: string | undefined;
  let flushing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onData: (d: AppData) => void = () => {};
  let onStatus: (s: SyncState) => void = () => {};

  const report = () =>
    onStatus({ where, ready, loading, pending: Object.keys(pending).length, stalled, fallback: where === 'device', notKept, error });
  const savePending = () => {
    if (!writeLocal(PENDING_KEY, Object.keys(pending).length ? pending : null)) notKept = Object.keys(pending).length > 0;
    else notKept = false;
  };

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
    if (!col || !definitive || flushing) return;
    flushing = true;
    try {
      for (;;) {
        const id = Object.keys(pending)[0];
        if (id === undefined) break;
        const change = pending[id];
        const write = resolve(change, server?.get(id));
        try {
          if (write === null) await withTimeout(col.doc(id).delete());
          else if (write !== undefined) await withTimeout(col.doc(id).set(write));
          error = undefined;
          stalled = false;
          if (write !== undefined && server) {
            // Count it as the account's copy now, so later changes merge against what was just sent.
            if (write === null) server.delete(id);
            else server.set(id, write);
          }
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
            stalled = true;
            schedule(RETRY_MS + Math.random() * 5000); // no signal or busy: try again later
            return;
          }
        }
        if (pending[id] === change) delete pending[id]; // unless it changed again while sending
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
    canPrint: false, // inside claude.ai the page can't open the print dialog; it saves a PDF instead
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
        // A different Claude account used this browser last: put its unsent changes aside for it, don't show its log.
        const owner = readLocal<string>(OWNER_KEY);
        if (owner && owner !== uid) {
          if (Object.keys(pending).length) writeLocal(parkedKey(owner), pending);
          pending = readLocal<Pending>(parkedKey(uid)) ?? {};
          writeLocal(parkedKey(uid), null);
          savePending();
          writeLocal(CACHE_KEY, null);
          ready = false;
          onData(emptyData());
        }
        writeLocal(OWNER_KEY, uid);
        col = db.collection('data/users/' + uid); // private to this user
        const subscribe = () => {
          unsub = col.onSnapshot(
            (snap: any) => {
              // The first pages of a subscription can be partial: wait for a complete copy before using it.
              if (!definitive && snap.metadata?.fromCache) return;
              const first = !definitive;
              definitive = true;
              server = new Map(snap.docs.filter((d: any) => d.exists).map((d: any) => [d.id, d.data()]));
              loading = false;
              ready = true;
              emit();
              report();
              if (first) flush();
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
    persist(prev, next) {
      const a = toDocs(prev), b = toDocs(next);
      const changes: Pending = {};
      for (const id of new Set([...a.keys(), ...b.keys()])) {
        const before = a.get(id), after = b.get(id) ?? null;
        if (same(before, after ?? undefined)) continue;
        // A new day starts from a blank day, so only what was actually typed counts as a change.
        const blank = id.startsWith(DAY_PREFIX) ? (emptyDay(id.slice(DAY_PREFIX.length), next.settings) as unknown as Body) : null;
        const base = pending[id] ? pending[id].base : before ?? blank;
        changes[id] = { base, body: after, ...(pending[id]?.force ? { force: true } : {}) };
      }
      queue(changes, next);
    },
    // Restore writes everything in the file as it is and removes every other day.
    replaceAll(prev, next) {
      const b = toDocs(next);
      const changes: Pending = {};
      for (const [id, body] of b) changes[id] = { base: null, body, force: true };
      for (const id of new Set([...toDocs(prev).keys(), ...(server?.keys() ?? [])]))
        if (!b.has(id)) changes[id] = { base: null, body: null, force: true };
      queue(changes, next);
    },
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
