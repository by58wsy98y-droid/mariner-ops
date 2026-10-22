// Own-site build: the log is kept in this browser on this device (no account, works with no signal).
// Each day is stored on its own, so a change writes only that day.
import { fromDocs, saveInBrowser, toDocs, writeLocal, type Store, type SyncState } from './storage';

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

export function localStore(): Store {
  let report: (s: SyncState) => void = () => {};
  let status = OK;
  const write = (changes: [string, Body | null][]) => {
    let ok = true;
    for (const [id, body] of changes) ok = writeLocal(PREFIX + id, body) && ok;
    status = ok ? OK : { ...OK, notKept: true, error: "This browser didn't save the last change (storage full or blocked). Back up now." };
    report(status);
  };
  return {
    initial: fromDocs(readAll()),
    ready: true,
    canPrint: true,
    start(_onData, onStatus) {
      report = onStatus;
      onStatus(status);
      return () => {};
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
    saveFile: async (filename, data) => saveInBrowser(filename, data),
  };
}
