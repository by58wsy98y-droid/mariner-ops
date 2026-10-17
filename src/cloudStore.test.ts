import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudStore, diffDocs, fromDocs, toDocs } from './cloudStore';
import { emptyData, type AppData, type SyncState } from './storage';
import type { DayEntry } from './types';

const entry = (date: string, gallons: number): DayEntry => ({
  date, tanks: [{ tankId: 'P1', label: '#2', side: 'PORT', sounding: "9'4", gallons }],
  fuelReceived: 0, lubeReceived: 0, lubeUsed: 0, waterReceived: 0, waterUsed: 0,
});

// A stand-in for the claude.ai page database with an on/off signal.
function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const listeners: ((snap: any) => void)[] = [];
  const state = { online: true, writes: 0 };
  const snap = () => ({ docs: [...docs].map(([id, body]) => ({ id, exists: true, data: () => body })) });
  const notify = () => listeners.forEach((l) => l(snap()));
  const col = {
    doc: (id: string) => ({
      set: async (body: Record<string, unknown>) => {
        if (!state.online) throw { code: 'unavailable', message: 'offline' };
        state.writes++;
        docs.set(id, JSON.parse(JSON.stringify(body)));
        notify();
      },
      delete: async () => {
        if (!state.online) throw { code: 'unavailable', message: 'offline' };
        docs.delete(id);
        notify();
      },
    }),
    onSnapshot: (next: (s: any) => void) => {
      listeners.push(next);
      next(snap());
      return () => {};
    },
  };
  return { docs, state, db: { collection: () => col } };
}

const handlers: Record<string, () => void> = {};
let fake: ReturnType<typeof fakeDb>;

beforeEach(() => {
  vi.useFakeTimers();
  fake = fakeDb();
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  vi.stubGlobal('window', {
    claude: { use: async (name: string) => (name === 'db' ? fake.db : name === 'user' ? { id: async () => 'u_test' } : null) },
    addEventListener: (ev: string, fn: () => void) => (handlers[ev] = fn),
    removeEventListener: () => {},
  });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function started() {
  const store = cloudStore();
  let data: AppData = store.initial;
  let status: SyncState | undefined;
  store.start((d) => (data = d), (s) => (status = s));
  await vi.advanceTimersByTimeAsync(0);
  return { store, get data() { return data; }, get status() { return status!; } };
}

describe('cloud store documents', () => {
  it('round-trips the log through one doc per day plus settings', () => {
    const d: AppData = { ...emptyData(), entries: [entry('2026-10-02', 2), entry('2026-10-01', 1)] };
    const back = fromDocs(toDocs(d));
    expect(back.entries.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(back.settings.capacity).toBe(91500);
  });

  it('diff writes only what changed', () => {
    const a = toDocs({ ...emptyData(), entries: [entry('2026-10-01', 1), entry('2026-10-02', 2)] });
    const b = toDocs({ ...emptyData(), entries: [entry('2026-10-01', 5)] });
    expect(diffDocs(a, b)).toEqual({ 'day-2026-10-01': b.get('day-2026-10-01'), 'day-2026-10-02': null });
  });
});

describe('cloud store sync', () => {
  it('loads saved days from the account', async () => {
    fake.docs.set('day-2026-10-01', entry('2026-10-01', 70000) as any);
    const s = await started();
    expect(s.data.entries).toHaveLength(1);
    expect(s.status).toMatchObject({ where: 'account', loading: false, pending: 0 });
  });

  it('keeps a change on the device with no signal and sends it when signal returns', async () => {
    const s = await started();
    fake.state.online = false;
    const next = { ...s.data, entries: [entry('2026-10-01', 70000)] };
    s.store.persist(s.data, next);
    await vi.advanceTimersByTimeAsync(500);
    expect(s.status.pending).toBe(1);
    expect(fake.docs.size).toBe(0);
    expect(localStorage.getItem('fuel-log:pending')).toContain('day-2026-10-01');

    fake.state.online = true;
    handlers.online();
    await vi.advanceTimersByTimeAsync(0);
    expect(fake.docs.has('day-2026-10-01')).toBe(true);
    expect(s.status.pending).toBe(0);
    expect(s.data.entries).toHaveLength(1);
  });

  it('a change made in an earlier visit with no signal is sent on the next visit', async () => {
    const first = await started();
    fake.state.online = false;
    first.store.persist(first.data, { ...first.data, entries: [entry('2026-10-01', 1)] });
    await vi.advanceTimersByTimeAsync(500);
    fake.state.online = true;
    const second = await started(); // reopened later
    expect(fake.docs.has('day-2026-10-01')).toBe(true);
    expect(second.status.pending).toBe(0);
  });

  it('restore replaces the whole log, removing days not in the file', async () => {
    fake.docs.set('day-2026-09-30', entry('2026-09-30', 1) as any);
    const s = await started();
    s.store.replaceAll(emptyData(), { ...emptyData(), entries: [entry('2026-10-05', 5)] });
    await vi.advanceTimersByTimeAsync(500);
    expect([...fake.docs.keys()].sort()).toEqual(['day-2026-10-05', 'settings']);
  });

  it('without the account (no database) it saves in this browser and says so', async () => {
    vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
    const s = await started();
    expect(s.status).toMatchObject({ where: 'device', fallback: true });
  });
});
