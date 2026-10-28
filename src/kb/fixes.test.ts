// Cases found in review: fuel days changed out of order, edits GitHub can't take, and search/markdown details.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildCorpus, type KbFile } from './corpus';
import { newIssueText } from './edits';
import { computeFuel, loggedDays, lookup, parseTankCsv, previousDay, tanksFrom, type FuelEntry } from './fuel';
import { parseInline, parseMarkdown } from './markdown';
import { merge3 } from './merge';
import { buildIndex, search } from './search';
import { KbStore, type Op } from './sync';

const ROOT = join(__dirname, '__fixtures__/towboat-kb');
const kb: KbFile[] = [];
(function walk(d: string) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else kb.push({ path: p.slice(ROOT.length + 1), text: readFileSync(p, 'utf8') });
  }
})(ROOT);
const BOAT = 'a-steven-crowley';
const MD = `boats/${BOAT}/fuel/log-2026-10.md`;
const CSV = `boats/${BOAT}/fuel/log-2026-10.csv`;
const ISSUE = 'boats/a-steven-crowley/issues/2026-10-23-port-main-codes-and-self-ramping.md';
const snap = { builtAt: '2026-10-28T00:00:00Z', files: kb };
const cfg = { owner: 'me', repo: 'r', branch: 'b', root: 'towboat-kb' };
const local = () => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
};

// A pretend GitHub (contents API). `branch: false` = the branch isn't there.
function fakeGitHub(files: Record<string, string>, opts: { branch?: boolean; dropAnswer?: number } = {}) {
  const repo = new Map(Object.entries(files));
  let n = 1, puts = 0;
  const sha = new Map([...repo.keys()].map((k) => [k, `s${n++}`]));
  const api = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/branches/')) return new Response('{}', { status: opts.branch === false ? 404 : 200 });
    const path = decodeURIComponent(url.replace(/^.*\/contents\//, '').replace(/\?.*$/, ''));
    if (!init?.method || init.method === 'GET') {
      if (!repo.has(path)) return new Response('', { status: 404 });
      return new Response(JSON.stringify({ content: Buffer.from(repo.get(path)!).toString('base64'), sha: sha.get(path) }), { status: 200 });
    }
    const body = JSON.parse(String(init.body));
    if (repo.has(path) && body.sha !== sha.get(path)) return new Response('', { status: 409 });
    repo.set(path, Buffer.from(body.content, 'base64').toString());
    sha.set(path, `s${n++}`);
    if (++puts === opts.dropAnswer) throw new TypeError('Load failed'); // saved, but the answer never arrived
    return new Response(JSON.stringify({ commit: { committer: { date: '2026-10-28T12:00:00Z' } } }), { status: 201 });
  });
  return { repo, api };
}

const allAt = (x: number) => Object.fromEntries(['P2', 'P3', 'P4', 'P5', 'S2', 'S3', 'S4', 'S5'].map((k) => [k, x]));
const entry = (date: string, inches: Record<string, number>): FuelEntry =>
  ({ date, inches, received: null, lubeP: null, lubeS: null, lubeReceived: null, water: null, waterReceived: null, notes: '' });

/** What the Fuel page does on Save, against what the device shows. */
function saveDay(store: KbStore, date: string, inches: Record<string, number>) {
  const files = store.view();
  const tanks = tanksFrom(files, BOAT);
  const prev = previousDay(loggedDays(files, BOAT), date);
  const e = entry(date, inches);
  const calc = computeFuel(e, tanks, prev, 91500, 7500);
  store.enqueue({ kind: 'fuel', boat: BOAT, boatName: 'M/V A. Steven Crowley', entry: e, calc, tankKeys: tanks.map((t) => t.key), truck: 7500, prev }, `fuel ${date}`);
  return calc;
}
const usedOn = (files: Map<string, string>, date: string) => loggedDays(files, BOAT).find((d) => d.date === date)?.used;
const csvUsed = (text: string, date: string) => text.split('\n').find((l) => l.startsWith(date))!.split(',')[7];

describe('fuel days changed out of order', () => {
  it('a day put in between: the next day compares to it', () => {
    local();
    const store = new KbStore(snap, cfg, vi.fn() as any);
    saveDay(store, '2026-10-24', allAt(90));
    saveDay(store, '2026-10-26', allAt(88));
    const t25 = saveDay(store, '2026-10-25', allAt(89)).total!;
    const files = store.view();
    const t26 = loggedDays(files, BOAT).find((d) => d.date === '2026-10-26')!.fuel!;
    expect(t25 - t26).toBe(864);
    expect(usedOn(files, '2026-10-26')).toBe(864);
    expect(files.get(MD)).toMatch(/\| 10\/26 \| 71,828 \| — \| 864 \|/);
  });

  it('correcting a typo fixes the next day too', () => {
    local();
    const store = new KbStore(snap, cfg, vi.fn() as any);
    saveDay(store, '2026-10-24', { ...allAt(90), S5: 9 });
    saveDay(store, '2026-10-25', allAt(89));
    expect(usedOn(store.view(), '2026-10-25')).toBeLessThan(0);
    saveDay(store, '2026-10-24', allAt(90));
    expect(usedOn(store.view(), '2026-10-25')).toBe(864);
    expect(csvUsed(store.view().get(CSV)!, '2026-10-25')).toBe('864');
  });

  it('deleting a day: the next day compares to the day before it', () => {
    local();
    const store = new KbStore(snap, cfg, vi.fn() as any);
    saveDay(store, '2026-10-24', allAt(90));
    const c25 = saveDay(store, '2026-10-25', allAt(89));
    const before = loggedDays(store.view(), BOAT);
    store.enqueue({ kind: 'fuelDelete', boat: BOAT, date: '2026-10-24', prev: previousDay(before.filter((d) => d.date !== '2026-10-24'), '2026-10-24') }, 'delete');
    const d23 = loggedDays(store.view(), BOAT).find((d) => d.date === '2026-10-23')!;
    expect(usedOn(store.view(), '2026-10-25')).toBe(d23.fuel! - c25.total!);
    expect(store.view().get(MD)).not.toContain('| 10/24 |');
  });

  it('another device logged the day before since this one last opened: Used compares to that', async () => {
    local();
    const laptop = new KbStore(snap, cfg, vi.fn() as any);
    saveDay(laptop, '2026-10-24', allAt(90));
    const now = laptop.view();
    const gh = fakeGitHub({ [`towboat-kb/${MD}`]: now.get(MD)!, [`towboat-kb/${CSV}`]: now.get(CSV)! });
    local();
    const phone = new KbStore(snap, cfg, gh.api as any); // still the published copy, without 10/24
    phone.setToken('t');
    saveDay(phone, '2026-10-25', allAt(89));
    await vi.waitFor(() => expect(phone.status().pending).toBe(0));
    expect(gh.repo.get(`towboat-kb/${MD}`)).toMatch(/\| 10\/25 \| 72,692 \| — \| 864 \|/);
    expect(csvUsed(gh.repo.get(`towboat-kb/${CSV}`)!, '2026-10-25')).toBe('864');
  });

  it('a day only in the month table keeps its received, water and notes when the page fills them in', () => {
    const d23 = loggedDays(new Map(kb.map((f) => [f.path, f.text])), BOAT).find((d) => d.date === '2026-10-23')!;
    expect(d23.detail).toBeUndefined();
    expect(d23.received).toBe(10009);
    expect(d23.water).toBe(15000);
    expect(d23.waterReceived).toBe(6000);
    expect(d23.notes).toMatch(/Fueled before sounding/);
  });
});

describe("edits GitHub can't take are kept, not dropped", () => {
  it('a wrong branch: nothing is lost and the message says so', async () => {
    local();
    const gh = fakeGitHub({ [`towboat-kb/${ISSUE}`]: kb.find((f) => f.path === ISSUE)!.text }, { branch: false });
    const store = new KbStore(snap, { ...cfg, branch: 'main' }, gh.api as any);
    store.setToken('t');
    store.enqueue({ kind: 'timeline', path: ISSUE, when: '10/28', what: 'IMPORTANT ROW' }, 'row');
    await vi.waitFor(() => expect(store.status().syncing).toBe(false));
    expect(store.status().pending).toBe(1);
    expect(store.status().error).toMatch(/"main" branch/);
    expect(store.view().get(ISSUE)).toContain('IMPORTANT ROW');
  });

  it("a file deleted elsewhere: the row waits with a reason, and Discard lets it go", async () => {
    local();
    const gh = fakeGitHub({});
    const store = new KbStore(snap, cfg, gh.api as any);
    store.setToken('t');
    store.enqueue({ kind: 'timeline', path: ISSUE, when: '10/28', what: 'row' }, 'row');
    await vi.waitFor(() => expect(store.status().syncing).toBe(false));
    expect(store.status()).toMatchObject({ pending: 1 });
    expect(store.status().error).toMatch(/isn't on GitHub/);
    store.discard(store.pendingList[0].id);
    expect(store.status()).toMatchObject({ pending: 0, error: undefined });
  });

  it("a row sent once whose answer was lost isn't added twice", async () => {
    local();
    const gh = fakeGitHub({ [`towboat-kb/${ISSUE}`]: kb.find((f) => f.path === ISSUE)!.text }, { dropAnswer: 1 });
    const store = new KbStore(snap, cfg, gh.api as any);
    store.setToken('t');
    store.enqueue({ kind: 'timeline', path: ISSUE, when: '10/28 14:05', what: 'Retrained' }, 'row');
    await vi.waitFor(() => expect(store.status().syncing).toBe(false));
    expect(store.status().pending).toBe(1);
    await store.sync();
    expect(store.status().pending).toBe(0);
    expect(gh.repo.get(`towboat-kb/${ISSUE}`)!.split('| 10/28 14:05 | Retrained |').length).toBe(2);
  });

  it('a new issue whose name another device took first is saved next to it, with its later rows', async () => {
    local();
    const path = 'boats/a-steven-crowley/issues/2026-10-28-pump-noisy.md';
    const gh = fakeGitHub({ [`towboat-kb/${path}`]: '---\ntitle: laptop one\n---\n# laptop one\n' });
    const store = new KbStore(snap, cfg, gh.api as any);
    const ops: Op[] = [
      { kind: 'create', path, text: '---\ntitle: phone one\n---\n# phone one\n\n## Timeline\n| a | b |\n|---|---|\n' },
      { kind: 'timeline', path, when: '10/28', what: 'phone row' },
    ];
    for (const op of ops) store.enqueue(op, op.kind);
    store.setToken('t');
    await vi.waitFor(() => expect(store.status().pending).toBe(0));
    expect(gh.repo.get(`towboat-kb/${path}`)).toContain('laptop one');
    const mine = gh.repo.get('towboat-kb/boats/a-steven-crowley/issues/2026-10-28-pump-noisy-2.md')!;
    expect(mine).toContain('phone one');
    expect(mine).toContain('| 10/28 | phone row |');
  });

  it('a saved copy is dropped once a publish is newer, whatever time zone it was written in', () => {
    local();
    localStorage.setItem('kb:overlay', JSON.stringify({ [ISSUE]: { text: 'phone copy', at: '2026-10-28T12:30:00Z' } }));
    const store = new KbStore({ ...snap, builtAt: '2026-10-28T08:00:00-05:00' }, cfg, vi.fn() as any);
    expect(store.view().get(ISSUE)).not.toBe('phone copy');
  });
});

describe('details', () => {
  it("dollar signs in a new issue's symptoms stay as typed, and the symptoms aren't lost with a reworded template", () => {
    const f = { boatName: 'B', system: 's', title: 'Pump $1', opened: '2026-10-28', status: 'OPEN', severity: '', tags: [], reportedTo: '', symptoms: 'Quote was $1,500; relief at $& psi' };
    const real = newIssueText(kb.find((x) => x.path === 'templates/issue.md')!.text, f);
    expect(real).toContain('## Symptoms\nQuote was $1,500; relief at $& psi\n');
    expect(real).toContain('# Pump $1');
    expect(real.match(/## Symptoms/g)).toHaveLength(1);
    expect(newIssueText('---\ntitle:\n---\n# <short title>\n\n## Symptoms\nWhat is it doing?\n', f)).toContain('## Symptoms\nQuote was $1,500');
    expect(newIssueText('---\ntitle:\n---\n# <short title>\n', f)).toContain('## Symptoms\nQuote was $1,500');
  });

  it('search: plurals, doubled letters, 24V, details in the file header, and punctuation alone', () => {
    const index = buildIndex(buildCorpus(kb));
    const paths = (q: string) => search(index, q).map((h) => h.doc.path);
    expect(paths('batteries')).toEqual(expect.arrayContaining(paths('battery')));
    expect(paths('batteries').length).toBeGreaterThan(0);
    expect(paths('resetting').length).toBeGreaterThan(0);
    expect(paths('24V')).toEqual(paths('24 V'));
    expect(paths('24V').length).toBeGreaterThan(0);
    expect(paths('uncommanded')).toContain(ISSUE);
    expect(paths('12-710')).toContain('boats/a-steven-crowley/boat.md');
    expect(paths('don’t')).toEqual(paths("don't"));
    expect(search(index, '—')).toEqual([]);
  });

  it('a quote written over several lines is one paragraph; a fill-in blank stays as typed', () => {
    const q = parseMarkdown('> Port main has been\n> ramping itself.\n>\n> Second part.\n\nAfter.');
    expect(q.filter((b) => b.t === 'quote')).toHaveLength(2);
    expect(parseInline('Result: [ ___ ]')).toEqual([{ t: 'text', v: 'Result: [ ___ ]' }]);
    expect(parseInline('Swap *P* and *S* CSIMs').filter((x) => x.t === 'em')).toHaveLength(2);
  });

  it('tank tables in half-inch or 2-inch steps', () => {
    const half = parseTankCsv('inches,gallons\n0,0\n0.5,10\n1,20\n1.5,30\n2,40\n2.5,50\n');
    expect(lookup(half, 2.5)).toBe(50);
    expect(lookup(half, 2.25)).toBe(45);
    expect(lookup(half, 3)).toBeNull();
    const two = parseTankCsv('inches,gallons\n0,0\n2,40\n4,80\n6,120\n');
    expect(lookup(two, 3)).toBe(60);
    expect(lookup(two, 6.5)).toBe(120); // within the last inch, like the workbook
    expect(lookup(two, 7)).toBeNull();
  });

  it('whole-file edits: both rows kept when both sides added one at the same place', () => {
    const base = '| a |\n|---|\n| 1 |';
    expect(merge3(base, base + '\n| phone |', base + '\n| laptop |')).toBe(base + '\n| laptop |\n| phone |');
  });
});
