// Own-site build: the log is kept in this browser on this device (no account, works with no signal).
// Each day is stored on its own, so a change writes only that day.
import { fromDocs, inIOSBrowserTab, saveInBrowser, toDocs, writeLocal, type Store, type SyncState } from './storage';

const PREFIX = 'engine-log:doc:';
type Body = Record<string, unknown>;

function readAll(): Map<string, Body> {
  const docs = new Map<string, Body>();
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIX)) continue;
      try {
        docs.set(k.slice(PREFIX.length), JSON.parse(localStorage.getItem(k) ?? 'null'));
      } catch {
        /* skip a damaged day */
      }
    }
  } catch {
    /* storage blocked: start empty */
  }
  return docs;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const OK: SyncState = { where: 'device', ready: true, loading: false, pending: 0, stalled: false, fallback: false, notKept: false };

const IOS_TAB_ADVICE =
  "On iPhone, use the log from its Home Screen icon (Share → Add to Home Screen). In a Safari tab, Safari can erase it after a week " +
  "unused, and the icon keeps its own separate log. Already typed days here? Back up, then Restore the file inside the icon's app.";

export function localStore(): Store {
  let report: (s: SyncState) => void = () => {};
  let extra: Partial<SyncState> = {};
  let status = OK;
  const send = () => report({ ...status, ...extra });
  const write = (changes: [string, Body | null][]) => {
    let ok = true;
    for (const [id, body] of changes) ok = writeLocal(PREFIX + id, body) && ok;
    status = ok ? OK : { ...OK, notKept: true, error: "This browser didn't save the last change (storage full or blocked). Back up now." };
    send();
  };
  return {
    initial: fromDocs(readAll()),
    ready: true,
    canPrint: true,
    start(onData, onStatus) {
      report = onStatus;
      if (inIOSBrowserTab()) extra.advice = IOS_TAB_ADVICE;
      // Is the copy for opening with no signal ready yet?
      const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
      if (sw) {
        extra.offline = sw.controller ? 'ready' : 'preparing';
        sw.ready.then(() => { extra.offline = 'ready'; send(); }).catch(() => {});
      }
      send();
      // Another copy of the app (another tab, or the installed app and a browser tab) saved something:
      // show it, so this copy doesn't save an out-of-date view over it.
      const reload = (e?: StorageEvent) => {
        if (e && e.key !== null && !e.key.startsWith(PREFIX)) return;
        if (document.visibilityState === 'hidden' || status.notKept) return; // never drop changes that failed to save
        onData(fromDocs(readAll()));
      };
      const onVis = () => reload();
      if (typeof window === 'undefined') return () => {};
      window.addEventListener('storage', reload);
      document.addEventListener('visibilitychange', onVis);
      return () => {
        window.removeEventListener('storage', reload);
        document.removeEventListener('visibilitychange', onVis);
      };
    },
    persist(prev, next) {
      const a = toDocs(prev), b = toDocs(next);
      const changes: [string, Body | null][] = [];
      for (const id of new Set([...a.keys(), ...b.keys()])) if (!same(a.get(id), b.get(id))) changes.push([id, b.get(id) ?? null]);
      write(changes);
    },
    // Restore: replace everything with what's in the file.
    replaceAll(_prev, next) {
      const b = toDocs(next);
      const changes: [string, Body | null][] = [...readAll().keys()].filter((id) => !b.has(id)).map((id) => [id, null]);
      for (const [id, body] of b) changes.push([id, body]);
      write(changes);
    },
    saveFile: (filename, data) => saveInBrowser(filename, data),
  };
}
