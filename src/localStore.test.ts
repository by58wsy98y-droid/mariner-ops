import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDay } from './calc';
import { localStore } from './localStore';
import { emptyData, type AppData, type SyncState } from './storage';

let mem: Map<string, string>;
let full = false;
beforeEach(() => {
  mem = new Map();
  full = false;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { if (full) throw new Error('QuotaExceeded'); mem.set(k, v); },
    removeItem: (k: string) => void mem.delete(k),
    get length() { return mem.size; },
    key: (i: number) => [...mem.keys()][i] ?? null,
  });
  // Object.keys(localStorage) in a browser lists the stored keys
  vi.stubGlobal('localStorage', new Proxy(globalThis.localStorage as any, { ownKeys: () => [...mem.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) }));
});
afterEach(() => vi.unstubAllGlobals());

const day = (date: string, port: number) => ({ ...emptyDay(date, emptyData().settings), cells: { 'main.totalHours.port': { today: port } } });

describe('own-site version: saving on this device', () => {
  it('keeps each day and reopens with it', () => {
    const s = localStore();
    const d1: AppData = { ...s.initial, entries: [day('2026-10-21', 24)] };
    s.persist(s.initial, d1);
    s.persist(d1, { ...d1, entries: [...d1.entries, day('2026-10-22', 12)] });
    expect([...mem.keys()].sort()).toEqual(['engine-log:doc:day-2026-10-21', 'engine-log:doc:day-2026-10-22']);
    expect(localStore().initial.entries.map((e) => [e.date, e.cells['main.totalHours.port'].today])).toEqual([['2026-10-21', 24], ['2026-10-22', 12]]);
  });

  it('a change writes only that day', () => {
    const s = localStore();
    const d1: AppData = { ...s.initial, entries: [day('2026-10-21', 24), day('2026-10-22', 12)] };
    s.persist(s.initial, d1);
    const before = mem.get('engine-log:doc:day-2026-10-21');
    s.persist(d1, { ...d1, entries: [d1.entries[0], day('2026-10-22', 13)] });
    expect(mem.get('engine-log:doc:day-2026-10-21')).toBe(before);
  });

  it('restore replaces the whole log', () => {
    const s = localStore();
    const d1: AppData = { ...s.initial, entries: [day('2026-10-21', 24)] };
    s.persist(s.initial, d1);
    s.replaceAll(d1, { ...emptyData(), entries: [day('2026-09-01', 5)] });
    expect(localStore().initial.entries.map((e) => e.date)).toEqual(['2026-09-01']);
  });

  it('says so when the browser refuses to save', () => {
    const s = localStore();
    let status: SyncState | undefined;
    s.start(() => {}, (x) => (status = x));
    full = true;
    s.persist(s.initial, { ...s.initial, entries: [day('2026-10-21', 24)] });
    expect(status).toMatchObject({ where: 'device', notKept: true });
    expect(status?.error).toMatch(/didn't save/);
  });
});
