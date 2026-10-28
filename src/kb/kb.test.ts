import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildCorpus, isOpen, similarIssues, findFile, type KbFile } from './corpus';
import { parseFrontmatter, setFrontmatterField } from './frontmatter';
import { parseMarkdown, safeHref } from './markdown';
import { buildIndex, search } from './search';
import { appendTimelineRow, newIssueText, setStatus } from './edits';
import {
  computeFuel, fuelSettings, loggedDays, lookup, parseTankCsv, previousDay, tanksFrom, truckAlert, upsertFuelCsv, upsertFuelMd,
  type FuelEntry,
} from './fuel';
import { KbStore, fuelPaths } from './sync';

const ROOT = join(__dirname, '../../towboat-kb');
function readKb(): KbFile[] {
  const out: KbFile[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(md|csv)$/.test(f)) out.push({ path: p.slice(ROOT.length + 1), text: readFileSync(p, 'utf8') });
    }
  };
  walk(ROOT);
  return out;
}
const kb = readKb();
const text = (p: string) => kb.find((f) => f.path === p)!.text;
const ISSUE = 'boats/a-steven-crowley/issues/2026-10-23-port-main-codes-and-self-ramping.md';
const BOAT = 'a-steven-crowley';

// A second, made-up boat, to prove search and "similar issues" work across boats.
const other: KbFile[] = [
  { path: 'boats/test-boat/boat.md', text: '---\nboat: M/V Test Boat\n---\n# M/V Test Boat\n' },
  { path: 'boats/test-boat/issues/2025-03-01-stbd-main-ramping.md', text: '---\nboat: M/V Test Boat\nsystem: starboard main engine\ntitle: Stbd main ramping at idle\nopened: 2025-03-01\nstatus: RESOLVED — loose ground\ntags: [ramping, ground, EMDEC]\n---\n# Stbd main ramping\nFound a fork terminal on the ECM ground.\n' },
];
const corpus = buildCorpus([...kb, ...other]);
const index = buildIndex(corpus);

describe('reading the files', () => {
  it('finds the boat, its issues and what is open', () => {
    expect(corpus.boats.map((b) => b.name)).toEqual(['M/V A. Steven Crowley', 'M/V Test Boat']);
    const open = corpus.docs.filter((d) => d.boat === BOAT && isOpen(d)).map((d) => d.path.split('/').pop());
    expect(open).toContain('2026-10-26-starboard-steering-rudder-not-turning.md');
    expect(corpus.docs.find((d) => d.path === 'boats/test-boat/issues/2025-03-01-stbd-main-ramping.md') && isOpen(corpus.docs.find((d) => d.path.includes('test-boat/issues'))!)).toBe(false);
  });
  it('reads frontmatter lists and the title', () => {
    const d = corpus.docs.find((x) => x.path === ISSUE)!;
    expect(d.tags).toContain('ERIM');
    expect(d.title).toMatch(/^Port main throws bursts of codes/);
    expect(d.date).toBe('2026-10-22');
  });
  it('turns file references in the text into links', () => {
    expect(findFile(corpus, 'boats/a-steven-crowley/boat.md', 'issues/2026-10-23-port-main-codes-and-self-ramping.md')).toBe(ISSUE);
    expect(findFile(corpus, 'boats/a-steven-crowley/systems/fuel-system.md', '../fuel/fueling-procedure.md')).toBe('boats/a-steven-crowley/fuel/fueling-procedure.md');
  });
  it('markdown: tables and lists come through; unsafe links are refused', () => {
    const blocks = parseMarkdown(parseFrontmatter(text(ISSUE)).body);
    expect(blocks.filter((b) => b.t === 'table').length).toBeGreaterThan(0);
    expect(blocks.some((b) => b.t === 'list' && b.ordered)).toBe(true);
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('https://example.com')).toBe('https://example.com');
  });
});

describe('search: "have I seen this before, on any boat?"', () => {
  const paths = (q: string, tags: string[] = []) => search(index, q, tags).map((h) => h.doc.path);
  it('"ramping" finds the port-main issue and the other boat\'s', () => {
    const p = paths('ramping');
    expect(p).toContain(ISSUE);
    expect(p).toContain('boats/test-boat/issues/2025-03-01-stbd-main-ramping.md');
  });
  it('"fork terminal" finds the CSIM ground finding on both boats', () => {
    const p = paths('fork terminal');
    expect(p).toContain(ISSUE);
    expect(p).toContain('boats/test-boat/issues/2025-03-01-stbd-main-ramping.md');
  });
  it('"gravitate" finds the gravitating procedure and the boat\'s fuel notes', () => {
    const p = paths('gravitate');
    expect(p).toContain('procedures/gravitating-and-fuel-valves.md');
    expect(p).toContain('boats/a-steven-crowley/systems/fuel-system.md');
  });
  it('tag filter narrows to issues with that tag', () => {
    const p = paths('', ['ground']);
    expect(p.every((x) => x.includes('/issues/'))).toBe(true);
    expect(p).toContain('boats/test-boat/issues/2025-03-01-stbd-main-ramping.md');
  });
  it('similar issues share tags or the system, across boats', () => {
    const sim = similarIssues(corpus, corpus.docs.find((d) => d.path === ISSUE)!).map((s) => s.doc.path);
    expect(sim).toContain('boats/test-boat/issues/2025-03-01-stbd-main-ramping.md');
  });
});

describe('editing issue files without mangling them', () => {
  const lineDiff = (a: string, b: string) => {
    const A = a.split('\n'), B = b.split('\n');
    return { added: B.filter((l) => !A.includes(l)), removed: A.filter((l) => !B.includes(l)) };
  };
  it('add to timeline: one new row, right after the last one, nothing else touched', () => {
    const before = text(ISSUE);
    const after = appendTimelineRow(before, '10/28 14:05', 'Throttle retraining done | both levers');
    expect(lineDiff(before, after)).toEqual({ added: ['| 10/28 14:05 | Throttle retraining done \\| both levers |'], removed: [] });
    const lines = after.split('\n');
    const i = lines.indexOf('| 10/28 14:05 | Throttle retraining done \\| both levers |');
    expect(lines[i - 1]).toMatch(/^\| 10\/27 \|/);
    expect(lines[i + 1]).toBe('');
  });
  it('change status: only the status line changes', () => {
    const before = text(ISSUE);
    const after = setStatus(before, 'WATCHING — clean since retraining');
    expect(lineDiff(before, after)).toEqual({ added: ['status: WATCHING — clean since retraining'], removed: ['status: OPEN'] });
    expect(parseFrontmatter(after).fm.status).toBe('WATCHING — clean since retraining');
  });
  it('round trip: parse → edit → parse keeps every other field and the body', () => {
    const before = parseFrontmatter(text(ISSUE));
    const after = parseFrontmatter(setFrontmatterField(text(ISSUE), 'reported_to', 'port engineer (10/28)'));
    expect({ ...after.fm, reported_to: before.fm.reported_to }).toEqual(before.fm);
    expect(after.body).toBe(before.body);
  });
  it('new issue from the template has its fields filled in', () => {
    const t = newIssueText(text('templates/issue.md'), {
      boatName: 'M/V A. Steven Crowley', system: 'steering', title: 'Stbd steering pump noisy', opened: '2026-10-28', status: 'OPEN',
      severity: 'medium', tags: ['steering', 'pump'], reportedTo: '', symptoms: 'Whines above 1,500 psi.',
      firstEntry: { when: '10/28 09:00', what: 'Noticed on the swap.' },
    });
    const { fm, body } = parseFrontmatter(t);
    expect(fm).toMatchObject({ boat: 'M/V A. Steven Crowley', title: 'Stbd steering pump noisy', tags: ['steering', 'pump'], status: 'OPEN' });
    expect(body).toContain('# Stbd steering pump noisy');
    expect(body).toContain('Whines above 1,500 psi.');
    expect(body).toContain('| 10/28 09:00 | Noticed on the swap. |');
    expect(body).not.toContain('| | |');
  });
});

describe('fuel: tank tables, the daily chain and truck alerts (same as the workbook)', () => {
  const files = new Map(kb.map((f) => [f.path, f.text]));
  const tanks = tanksFrom(files, BOAT);
  const { capacity, truck } = fuelSettings(text('boats/a-steven-crowley/boat.md'));
  const entry = (date: string, s: Record<string, number>, extra: Partial<FuelEntry> = {}): FuelEntry => ({
    date, inches: s, received: null, lubeP: null, lubeS: null, lubeReceived: null, water: null, waterReceived: null, notes: '', ...extra,
  });
  const both = (x2: number, x3: number, x4: number, x5: number) => ({ P2: x2, P3: x3, P4: x4, P5: x5, S2: x2, S3: x3, S4: x4, S5: x5 });

  it('8 tanks, #2-#5 port and starboard, sharing one table per tank number', () => {
    expect(tanks.map((t) => t.key)).toEqual(['P2', 'P3', 'P4', 'P5', 'S2', 'S3', 'S4', 'S5']);
  });
  it('looks up inches and interpolates half inches; past the table is refused', () => {
    const t2 = parseTankCsv(text('boats/a-steven-crowley/fuel/tank-tables/tank-2.csv'));
    expect(lookup(t2, 0)).toBe(494);
    expect(lookup(t2, 0.5)).toBe(529); // halfway between 494 and 563, rounded
    expect(lookup(t2, 116)).toBe(17050);
    expect(lookup(t2, 116.5)).toBe(17050); // top of the table: the workbook uses the last row
    expect(lookup(t2, 117)).toBeNull();
    expect(lookup(t2, -1)).toBeNull();
  });
  it('10/23 soundings give 82,198 gal; 91.5" in the 3s and 4s gives 82,388', () => {
    expect(computeFuel(entry('2026-10-23', both(103, 91, 91, 115)), tanks, null, capacity, truck).total).toBe(82198);
    expect(computeFuel(entry('2026-10-23', both(103, 91.5, 91.5, 115)), tanks, null, capacity, truck).total).toBe(82388);
  });
  it('previous → received → total → on hand → used, for fuel, lube oil and water (the 10/23 worked example)', () => {
    const days = loggedDays(files, BOAT);
    expect(days.map((d) => [d.date, d.fuel, d.lube, d.water])).toEqual([['2026-10-22', 73084, 1107, 9500], ['2026-10-23', 82198, 1107, 15000]]);
    const prev = previousDay(days, '2026-10-23');
    const c = computeFuel(entry('2026-10-23', both(103, 91, 91, 115), { received: 10009, lubeP: 553, lubeS: 554, water: 15000, waterReceived: 6000 }), tanks, prev, capacity, truck);
    expect(c).toMatchObject({ total: 82198, used: 895, room: 9302, trucks: 1, lubeTotal: 1107, lubeUsed: 0, waterUsed: 500 });
  });
  it('truck alerts: room for 1 at capacity − 7,500, room for 2 at capacity − 15,000', () => {
    expect([capacity, truck]).toEqual([91500, 7500]);
    expect(truckAlert(9302, truck)).toBe('Room for 1 truck (7,500 gal)');
    expect(truckAlert(7500, truck)).toBe('Room for 1 truck (7,500 gal)');
    expect(truckAlert(7499, truck)).toBeNull();
    expect(truckAlert(15000, truck)).toBe('Room for 2 trucks (15,000 gal)');
    expect(truckAlert(40000, truck)).toBe('Room for 2 trucks (15,000 gal)');
  });
  it('saving a day writes a row into the month\'s table (in date order) and the CSV, keeping the rest of the file', () => {
    const md = text('boats/a-steven-crowley/fuel/log-2026-10.md');
    const days = loggedDays(files, BOAT);
    const e = entry('2026-10-24', both(103, 90, 90, 115), { water: 14500, notes: 'Burned the 3s/4s | port main restricted' });
    const c = computeFuel(e, tanks, previousDay(days, '2026-10-24'), capacity, truck);
    const md2 = upsertFuelMd(md, 'M/V A. Steven Crowley', e, c);
    const lines = md2.split('\n');
    const i = lines.findIndex((l) => l.startsWith('| 10/24 |'));
    expect(lines[i - 1]).toMatch(/^\| 10\/23 \|/);
    expect(lines[i]).toBe(`| 10/24 | ${c.total!.toLocaleString('en-US')} | — | ${c.used!.toLocaleString('en-US')} | — | 14,500 (500 used) | Burned the 3s/4s / port main restricted |`);
    expect(md2).toContain('Alert state 10/23: room to full 9,302 gal');
    expect(upsertFuelMd(md2, 'x', { ...e, notes: 'changed' }, c).split('\n').filter((l) => l.startsWith('| 10/24 |'))).toHaveLength(1);
    const csv = upsertFuelCsv(null, tanks.map((t) => t.key), e, c, truck);
    const back = loggedDays(new Map([...files, [fuelPaths(BOAT, e.date).csv, csv]]), BOAT).find((d) => d.date === '2026-10-24')!;
    expect([back.fuel, back.water, back.notes]).toEqual([c.total, 14500, 'Burned the 3s/4s | port main restricted']);
  });
});

describe('saving back to GitHub', () => {
  const snap = { builtAt: '2026-10-28T00:00:00Z', files: kb };
  // A pretend GitHub: holds files, can change under us, can be offline.
  function fakeGitHub(initial: Record<string, string>) {
    const repo = new Map(Object.entries(initial));
    let sha = 1;
    const shas = new Map([...repo.keys()].map((k) => [k, String(sha++)]));
    const state = { offline: false, puts: 0, conflictOnce: false };
    const api = vi.fn(async (url: string, init?: RequestInit) => {
      if (state.offline) throw new TypeError('Failed to fetch');
      const path = decodeURIComponent(url.replace(/^.*\/contents\//, '').replace(/\?.*$/, ''));
      if (!init?.method || init.method === 'GET') {
        if (!repo.has(path)) return new Response('', { status: 404 });
        const content = Buffer.from(repo.get(path)!, 'utf8').toString('base64');
        return new Response(JSON.stringify({ content, sha: shas.get(path) }), { status: 200 });
      }
      const body = JSON.parse(String(init.body));
      if (state.conflictOnce) { state.conflictOnce = false; return new Response('sha mismatch', { status: 409 }); }
      if (repo.has(path) && body.sha !== shas.get(path)) return new Response('sha mismatch', { status: 409 });
      repo.set(path, Buffer.from(body.content, 'base64').toString('utf8'));
      shas.set(path, String(sha++));
      state.puts++;
      return new Response(JSON.stringify({ commit: { committer: { date: '2026-10-28T12:00:00Z' } } }), { status: 201 });
    });
    return { repo, state, api };
  }
  const local = () => { const mem = new Map<string, string>(); vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) }); };
  const cfg = { owner: 'me', repo: 'r', branch: 'b', root: 'towboat-kb' };

  it('a timeline row typed with no signal shows at once, then saves when signal returns', async () => {
    local();
    const gh = fakeGitHub({ [`towboat-kb/${ISSUE}`]: text(ISSUE) });
    gh.state.offline = true;
    const store = new KbStore(snap, cfg, gh.api as any);
    store.setToken('tok');
    store.enqueue({ kind: 'timeline', path: ISSUE, when: '10/28 14:05', what: 'Retraining done' }, 'timeline');
    await vi.waitFor(() => expect(store.status().syncing).toBe(false));
    expect(store.view().get(ISSUE)).toContain('| 10/28 14:05 | Retraining done |');
    expect(store.status()).toMatchObject({ pending: 1 });
    expect(store.status().error).toMatch(/No connection/);
    gh.state.offline = false;
    await store.sync();
    expect(gh.repo.get(`towboat-kb/${ISSUE}`)).toContain('| 10/28 14:05 | Retraining done |');
    expect(store.status()).toMatchObject({ pending: 0 });
    expect(store.view().get(ISSUE)).toContain('| 10/28 14:05 | Retraining done |'); // shown until the site is republished
  });

  it("an edit made on another device in the meantime is kept, not overwritten", async () => {
    local();
    const laptop = appendTimelineRow(text(ISSUE), '10/28 10:00', 'Laptop entry');
    const gh = fakeGitHub({ [`towboat-kb/${ISSUE}`]: laptop });
    const store = new KbStore(snap, cfg, gh.api as any);
    store.setToken('tok');
    gh.state.conflictOnce = true; // and GitHub reports a clash once
    store.enqueue({ kind: 'status', path: ISSUE, status: 'WATCHING' }, 'status');
    await vi.waitFor(() => expect(store.status().pending).toBe(0));
    const saved = gh.repo.get(`towboat-kb/${ISSUE}`)!;
    expect(saved).toContain('| 10/28 10:00 | Laptop entry |');
    expect(saved).toContain('status: WATCHING');
  });

  it('a fuel day saves both the month table and the CSV', async () => {
    local();
    const md = text('boats/a-steven-crowley/fuel/log-2026-10.md');
    const gh = fakeGitHub({ 'towboat-kb/boats/a-steven-crowley/fuel/log-2026-10.md': md });
    const store = new KbStore(snap, cfg, gh.api as any);
    store.setToken('tok');
    const files = store.view();
    const tanks = tanksFrom(files, BOAT);
    const e: FuelEntry = { date: '2026-10-24', inches: { P2: 103, P3: 90, P4: 90, P5: 115, S2: 103, S3: 90, S4: 90, S5: 115 }, received: null, lubeP: null, lubeS: null, lubeReceived: null, water: null, waterReceived: null, notes: '' };
    const calc = computeFuel(e, tanks, previousDay(loggedDays(files, BOAT), e.date), 91500, 7500);
    store.enqueue({ kind: 'fuel', boat: BOAT, boatName: 'M/V A. Steven Crowley', entry: e, calc, tankKeys: tanks.map((t) => t.key), truck: 7500 }, 'fuel 10/24');
    await vi.waitFor(() => expect(store.status().pending).toBe(0));
    expect(gh.repo.get('towboat-kb/boats/a-steven-crowley/fuel/log-2026-10.md')).toContain('| 10/24 |');
    expect(gh.repo.get('towboat-kb/boats/a-steven-crowley/fuel/log-2026-10.csv')).toMatch(/^date,tank_inches/);
  });

  it('once the published site includes a saved file, the device copy is dropped', () => {
    local();
    localStorage.setItem('kb:overlay', JSON.stringify({ [ISSUE]: { text: 'old', at: '2026-10-27T00:00:00Z' } }));
    const store = new KbStore(snap, cfg, vi.fn() as any);
    expect(store.view().get(ISSUE)).toBe(text(ISSUE));
  });
});

describe('similar issues on one boat', () => {
  it('an issue marked related in its file shows as similar', () => {
    const c1 = buildCorpus(kb);
    const sim = similarIssues(c1, c1.docs.find((d) => d.path === ISSUE)!);
    expect(sim.map((s) => s.doc.path)).toContain('boats/a-steven-crowley/issues/2026-10-23-battery-charger-choke-residue.md');
    expect(sim[0].shared).toContain('marked related');
  });
});
