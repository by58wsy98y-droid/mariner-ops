import { describe, expect, it, vi } from 'vitest';
import { KbStore } from './sync';
import { appendTimelineRow } from './edits';

const ISSUE = 'boats/b1/issues/2026-10-01-x.md';
const text = '---\nboat: B1\ntitle: X\nstatus: OPEN\n---\n# X\n\n## Timeline\n| Date | What |\n|---|---|\n| 10/01 | first |\n\n## Notes\nold note\n';

// A pretend GitHub with the contents API and the tree/commit API used to delete a folder.
function fakeGitHub(files: Record<string, string>) {
  const repo = new Map(Object.entries(files));
  let n = 1;
  const sha = new Map([...repo.keys()].map((k) => [k, `s${n++}`]));
  const commits: string[] = [];
  const ok = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status });
  const api = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.includes('/branches/')) return ok({ name: 'b' });
    const git = /\/git\/(.*)$/.exec(url)?.[1];
    if (git) {
      if (git.startsWith('ref/heads/')) return ok({ object: { sha: 'c0' } });
      if (git.startsWith('commits/')) return ok({ tree: { sha: 't0' } });
      if (git.startsWith('trees/')) return ok({ tree: [...repo.keys()].map((p) => ({ path: p, type: 'blob' })) });
      if (git === 'trees' && method === 'POST') { for (const t of body.tree) if (t.sha === null) repo.delete(t.path); return ok({ sha: 't1' }, 201); }
      if (git === 'commits' && method === 'POST') { commits.push(body.message); return ok({ sha: 'c1', committer: { date: '2026-10-28T12:00:00Z' } }, 201); }
      if (git.startsWith('refs/heads/') && method === 'PATCH') return ok({});
    }
    const path = decodeURIComponent(url.replace(/^.*\/contents\//, '').replace(/\?.*$/, ''));
    if (method === 'GET') return repo.has(path) ? ok({ content: Buffer.from(repo.get(path)!).toString('base64'), sha: sha.get(path) }) : new Response('', { status: 404 });
    if (method === 'DELETE') { if (body.sha !== sha.get(path)) return new Response('', { status: 409 }); repo.delete(path); commits.push(body.message); return ok({ commit: { committer: { date: '2026-10-28T12:00:00Z' } } }); }
    if (method === 'PUT') { if (repo.has(path) && body.sha !== sha.get(path)) return new Response('', { status: 409 }); repo.set(path, Buffer.from(body.content, 'base64').toString()); sha.set(path, `s${n++}`); commits.push(body.message); return ok({ commit: { committer: { date: '2026-10-28T12:00:00Z' } } }, 201); }
    return new Response('', { status: 400 });
  });
  return { repo, api, commits };
}
const local = () => { const mem = new Map<string, string>(); vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) }); };
const cfg = { owner: 'me', repo: 'r', branch: 'b', root: 'kb' };
const snap = (files: Record<string, string>) => ({ builtAt: '2026-10-28T00:00:00Z', files: Object.entries(files).map(([path, t]) => ({ path, text: t })) });

describe('editing and deleting', () => {
  it('a whole-file edit is merged with a row added on another device meanwhile', async () => {
    local();
    const gh = fakeGitHub({ [`kb/${ISSUE}`]: appendTimelineRow(text, '10/02', 'laptop row') });
    const store = new KbStore(snap({ [ISSUE]: text }), cfg, gh.api as any);
    store.setToken('t');
    store.enqueue({ kind: 'replace', path: ISSUE, base: text, text: text.replace('old note', 'rewritten note') }, 'edit');
    await vi.waitFor(() => expect(store.status().pending).toBe(0));
    const saved = gh.repo.get(`kb/${ISSUE}`)!;
    expect(saved).toContain('rewritten note');
    expect(saved).toContain('| 10/02 | laptop row |');
  });

  it('deleting a file removes it from GitHub and from the screens', async () => {
    local();
    const gh = fakeGitHub({ [`kb/${ISSUE}`]: text, 'kb/docs/guide.pdf': '%PDF' });
    const store = new KbStore(snap({ [ISSUE]: text }), cfg, gh.api as any);
    store.setToken('t');
    store.enqueue({ kind: 'delete', path: ISSUE }, 'delete issue');
    store.enqueue({ kind: 'delete', path: 'docs/guide.pdf' }, 'delete doc');
    expect(store.view().has(ISSUE)).toBe(false);
    expect(store.isGone('docs/guide.pdf')).toBe(true);
    await vi.waitFor(() => expect(store.status().pending).toBe(0));
    expect(gh.repo.has(`kb/${ISSUE}`)).toBe(false);
    expect(gh.repo.has('kb/docs/guide.pdf')).toBe(false);
    expect(store.view().has(ISSUE)).toBe(false); // still gone until the site republishes
  });

  it('deleting a boat removes its whole folder in one commit, and nothing else', async () => {
    local();
    const files = { [`kb/${ISSUE}`]: text, 'kb/boats/b1/boat.md': '---\nboat: B1\n---\n', 'kb/boats/b2/boat.md': '---\nboat: B2\n---\n', 'kb/boats/b1/fuel/tank-tables/tank-2.csv': 'inches,gallons\n0,1\n' };
    const gh = fakeGitHub(files);
    const store = new KbStore(snap({ [ISSUE]: text, 'boats/b1/boat.md': files['kb/boats/b1/boat.md'], 'boats/b2/boat.md': files['kb/boats/b2/boat.md'] }), cfg, gh.api as any);
    store.setToken('t');
    store.enqueue({ kind: 'deleteDir', dir: 'boats/b1/' }, 'delete boat B1');
    expect([...store.view().keys()]).toEqual(['boats/b2/boat.md']);
    await vi.waitFor(() => expect(store.status().pending).toBe(0));
    expect([...gh.repo.keys()]).toEqual(['kb/boats/b2/boat.md']);
    expect(gh.commits).toEqual(['KB: delete boat B1\n\nSaved from the knowledge base app.']);
  });

  it('deleting a fuel day takes its row out of the month table and the CSV', async () => {
    local();
    const md = '---\nmonth: 2026-10\n---\n\n| Date | Total fuel (gal) | Received | Used | Lube total | Water | Notes |\n|---|---|---|---|---|---|---|\n| 10/22 | 73,084 | — | — | 1,107 | 9,500 | a |\n| 10/23 | 82,198 | 10,009 | 895 | 1,107 | 15,000 | b |\n\nAlert state 10/23: 1 truck.\n';
    const csv = 'date,total_fuel\n2026-10-22,73084\n2026-10-23,82198\n';
    const gh = fakeGitHub({ 'kb/boats/b1/fuel/log-2026-10.md': md, 'kb/boats/b1/fuel/log-2026-10.csv': csv });
    const store = new KbStore(snap({}), cfg, gh.api as any);
    store.setToken('t');
    store.enqueue({ kind: 'fuelDelete', boat: 'b1', date: '2026-10-23' }, 'delete fuel day');
    await vi.waitFor(() => expect(store.status().pending).toBe(0));
    const md2 = gh.repo.get('kb/boats/b1/fuel/log-2026-10.md')!;
    expect(md2).not.toContain('| 10/23 |');
    expect(md2).toContain('| 10/22 |');
    expect(md2).toContain('Alert state 10/23: 1 truck.');
    expect(gh.repo.get('kb/boats/b1/fuel/log-2026-10.csv')).toBe('date,total_fuel\n2026-10-22,73084\n');
  });
});
