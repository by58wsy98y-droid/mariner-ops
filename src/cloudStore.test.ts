import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudStore, fromDocs, merge3, toDocs } from './cloudStore';
import { emptyDay } from './calc';
import { emptyData, type AppData, type SyncState } from './storage';
import type { DayLog } from './types';

const day = (date: string, cells: Record<string, number> = {}, patch: Partial<DayLog> = {}): DayLog => ({
  ...emptyDay(date, emptyData().settings),
  cells: Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, { today: v }])),
  ...patch,
});

// A stand-in for the claude.ai page database, with an on/off signal and an optional "partial first page".
function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const listeners: ((snap: any) => void)[] = [];
  const state = { online: true, partialFirst: false, holdComplete: false };
  const snap = (fromCache = false) => ({
    metadata: { fromCache, hasPendingWrites: false },
    docs: (fromCache ? [] : [...docs]).map(([id, body]: any) => ({ id, exists: true, data: () => body })),
  });
  const notify = () => listeners.forEach((l) => l(snap()));
  const col = {
    doc: (id: string) => ({
      set: async (body: Record<string, unknown>) => {
        if (!state.online) throw { code: 'unavailable', message: 'offline' };
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
      if (state.partialFirst) next(snap(true));
      if (!state.holdComplete) next(snap());
      return () => {};
    },
  };
  return { docs, state, db: { collection: () => col } };
}

const handlers: Record<string, () => void> = {};
let fake: ReturnType<typeof fakeDb>;
let uid = 'u_a';
const account = (on = true) =>
  vi.stubGlobal('window', {
    claude: on ? { use: async (name: string) => (name === 'db' ? fake.db : name === 'user' ? { id: async () => uid } : null) } : undefined,
    addEventListener: (ev: string, fn: () => void) => (handlers[ev] = fn),
    removeEventListener: () => {},
  });

beforeEach(() => {
  vi.useFakeTimers();
  fake = fakeDb();
  uid = 'u_a';
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  account();
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
  return {
    store,
    get data() { return data; },
    get status() { return status!; },
    edit(fn: (d: AppData) => AppData) { const prev = data; data = fn(data); store.persist(prev, data); },
  };
}
const withDay = (d: AppData, x: DayLog) => ({ ...d, entries: [...d.entries.filter((e) => e.date !== x.date), x].sort((a, b) => a.date.localeCompare(b.date)) });
const serverDay = (date: string) => fake.docs.get('day-' + date) as unknown as DayLog | undefined;

describe('documents and merging', () => {
  it('round-trips the log through one doc per day plus settings', () => {
    const back = fromDocs(toDocs({ ...emptyData(), entries: [day('2026-10-02'), day('2026-10-01')] }));
    expect(back.entries.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(back.settings.sections.length).toBe(5);
  });

  it('three-way merge keeps both devices\' changes, field by field', () => {
    const base = { cells: { a: { today: 1 } }, comments: '' };
    const mine = { cells: { a: { today: 1 }, b: { today: 24 } }, comments: 'phone note' };
    const theirs = { cells: { a: { today: 1 }, c: { today: 12 } }, comments: '' };
    expect(merge3(base, mine, theirs)).toEqual({ cells: { a: { today: 1 }, b: { today: 24 }, c: { today: 12 } }, comments: 'phone note' });
  });

  it('a damaged saved day can\'t break the screens', () => {
    const d = fromDocs(new Map([['day-2026-10-01', { date: '2026-10-01', tanks: [] } as any]]));
    expect(d.entries[0].cells).toEqual({});
    expect(d.entries[0].fluids.fuel.used).toBeNull();
  });
});

describe('saving', () => {
  it('loads saved days from the account', async () => {
    fake.docs.set('day-2026-10-01', day('2026-10-01', { 'main.totalHours.port': 24 }) as any);
    const s = await started();
    expect(s.data.entries).toHaveLength(1);
    expect(s.status).toMatchObject({ where: 'account', ready: true, loading: false, pending: 0 });
  });

  it('keeps a change on the device with no signal and sends it when signal returns', async () => {
    const s = await started();
    fake.state.online = false;
    s.edit((d) => withDay(d, day('2026-10-01', { 'main.totalHours.port': 24 })));
    await vi.advanceTimersByTimeAsync(500);
    expect(s.status).toMatchObject({ pending: 1, stalled: true });
    expect(fake.docs.size).toBe(0);
    fake.state.online = true;
    handlers.online();
    await vi.advanceTimersByTimeAsync(0);
    expect(serverDay('2026-10-01')?.cells['main.totalHours.port'].today).toBe(24);
    expect(s.status).toMatchObject({ pending: 0, stalled: false });
  });

  it('while typing with signal it says Saving, not "no signal"', async () => {
    const s = await started();
    s.edit((d) => withDay(d, day('2026-10-01', { 'main.totalHours.port': 2 })));
    expect(s.status).toMatchObject({ pending: 1, stalled: false });
  });

  it("an offline change on the phone doesn't wipe what the laptop saved for the same day", async () => {
    fake.docs.set('day-2026-10-21', day('2026-10-21', { 'main.totalHours.port': 24 }) as any);
    const phone = await started();
    fake.state.online = false;
    phone.edit((d) => withDay(d, { ...d.entries[0], comments: 'phone note' }));
    await vi.advanceTimersByTimeAsync(500);
    // meanwhile the laptop saves more of 10/21
    fake.docs.set('day-2026-10-21', day('2026-10-21', { 'main.totalHours.port': 24, 'main.totalHours.stbd': 24, 'gen.majorOH.port': 12 }) as any);
    fake.state.online = true;
    const reopened = await started(); // phone reopens with signal
    const d = serverDay('2026-10-21')!;
    expect(d.comments).toBe('phone note');
    expect(Object.keys(d.cells).sort()).toEqual(['gen.majorOH.port', 'main.totalHours.port', 'main.totalHours.stbd']);
    expect(reopened.status.pending).toBe(0);
  });

  it('starting a day on a stale phone keeps the laptop\'s numbers for that day', async () => {
    const phone = await started();
    phone.edit((d) => withDay(d, day('2026-10-20', { 'main.totalHours.port': 24 })));
    await vi.advanceTimersByTimeAsync(500);
    fake.state.online = false;
    phone.edit((d) => withDay(d, day('2026-10-22', { 'main.fuelFilter.port': 6 })));
    await vi.advanceTimersByTimeAsync(500);
    fake.docs.set('day-2026-10-22', day('2026-10-22', { 'main.totalHours.port': 24 }, { comments: 'LAPTOP full log' }) as any);
    fake.state.online = true;
    await started();
    const d = serverDay('2026-10-22')!;
    expect(d.comments).toBe('LAPTOP full log');
    expect(d.cells['main.totalHours.port'].today).toBe(24);
    expect(d.cells['main.fuelFilter.port'].today).toBe(6);
  });

  it('waits for a complete copy from the account before showing or sending anything', async () => {
    fake.docs.set('day-2026-10-22', day('2026-10-22', { 'main.totalHours.port': 24 }) as any);
    fake.state.partialFirst = true;
    fake.state.holdComplete = true; // only the partial first page has arrived
    const s = await started();
    expect(s.status).toMatchObject({ ready: false, loading: true });
    s.edit((d) => withDay(d, day('2026-10-22', { 'main.totalHours.stbd': 23 })));
    await vi.advanceTimersByTimeAsync(500);
    expect(serverDay('2026-10-22')?.cells).toEqual({ 'main.totalHours.port': { today: 24 } }); // nothing sent yet
  });

  it("a device with no copy and no account connection doesn't open an empty, editable log", async () => {
    account(false);
    const s = await started();
    expect(s.status).toMatchObject({ where: 'device', fallback: true, ready: false });
  });

  it('a change typed just before the page closes still shows when it reopens', async () => {
    const first = await started();
    await vi.advanceTimersByTimeAsync(400); // a full copy exists
    first.edit((d) => withDay(d, day('2026-10-02', { 'main.totalHours.port': 12 })));
    const again = cloudStore(); // closed right after the change, before the full copy was rewritten
    expect(again.initial.entries.map((e) => e.date)).toEqual(['2026-10-02']);
  });

  it("another Claude account on the same browser doesn't see or take the first account's unsent days", async () => {
    const a = await started();
    await vi.advanceTimersByTimeAsync(400);
    fake.state.online = false;
    a.edit((d) => withDay(d, day('2026-10-22', { 'main.totalHours.port': 24 })));
    await vi.advanceTimersByTimeAsync(500);
    fake.state.online = true;
    uid = 'u_b';
    fake = fakeDb(); // B's own (empty) space
    account();
    const b = await started();
    expect(b.data.entries).toEqual([]);
    expect(fake.docs.size).toBe(0);
    expect(localStorage.getItem('engine-log:pending:u_a')).toContain('day-2026-10-22');
  });

  it('restore replaces the whole log, removing days not in the file', async () => {
    fake.docs.set('day-2026-09-30', day('2026-09-30') as any);
    const s = await started();
    s.store.replaceAll(s.data, { ...emptyData(), entries: [day('2026-10-05', { 'main.totalHours.port': 5 })] });
    await vi.advanceTimersByTimeAsync(500);
    expect([...fake.docs.keys()].sort()).toEqual(['day-2026-10-05', 'settings']);
  });
});
