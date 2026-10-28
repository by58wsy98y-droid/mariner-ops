// Keeping the knowledge base in step with GitHub.
//
// The app ships with a copy of every file (made when the site was last published). Each edit is
// stored on the device as an operation ("add this timeline row", "set this status"); the screens show
// the files with those operations applied. When there's signal and a GitHub key, each operation is
// applied to the file's CURRENT text on GitHub and saved as a commit — so an edit made on another
// device in the meantime is kept, not overwritten. A saved file stays shown from the device until the
// published site has caught up with it.
import { appendTimelineRow, setStatus, timelineRow } from './edits';
import { setFrontmatterField } from './frontmatter';
import {
  loggedDays, previousDay, rechainFuelCsv, rechainFuelMd, removeFuelCsv, removeFuelMd, upsertFuelCsv, upsertFuelMd, usedFrom,
  type FuelCalc, type FuelEntry, type Prev,
} from './fuel';
import { merge3 } from './merge';
import type { KbFile } from './corpus';

export type Op =
  | { kind: 'timeline'; path: string; when: string; what: string }
  | { kind: 'status'; path: string; status: string }
  | { kind: 'field'; path: string; key: string; value: string }
  | { kind: 'create'; path: string; text: string }
  // prev: the day before, as the device saw it (an older day in another month, say); a later one in the file wins
  | { kind: 'fuel'; boat: string; boatName: string; entry: FuelEntry; calc: FuelCalc; tankKeys: string[]; truck: number; prev?: Prev | null }
  | { kind: 'fuelDelete'; boat: string; date: string; prev?: Prev | null }
  | { kind: 'fuelChain'; boat: string; date: string; prev: Prev | null } // work a day's "used" out again (its day before changed)
  | { kind: 'replace'; path: string; base: string | null; text: string } // whole-file edit
  | { kind: 'delete'; path: string }
  | { kind: 'deleteDir'; dir: string }; // e.g. "boats/old-boat/" — one commit for the lot

export interface Queued { id: string; op: Op; label: string; at: string }

export const fuelPaths = (boat: string, date: string) => {
  const base = `boats/${boat}/fuel/log-${date.slice(0, 7)}`;
  return { md: `${base}.md`, csv: `${base}.csv` };
};

export function opPaths(op: Op): string[] {
  if (op.kind === 'fuel') { const p = fuelPaths(op.boat, op.entry.date); return [p.md, p.csv]; }
  if (op.kind === 'fuelDelete' || op.kind === 'fuelChain') { const p = fuelPaths(op.boat, op.date); return [p.md, p.csv]; }
  if (op.kind === 'deleteDir') return [];
  return [op.path];
}

/** The later of two "day before"s. undefined = not known (an op saved by an older version of the app). */
function later(inFile: Prev | null, given: Prev | null | undefined): Prev | null | undefined {
  if (given === undefined) return inFile ?? undefined;
  if (!inFile || !given) return inFile ?? given;
  return inFile.date > given.date ? inFile : given;
}

const rechain = (md: boolean, text: string, date: string, prev: Prev | null) => (md ? rechainFuelMd : rechainFuelCsv)(text, date, prev);
const daysIn = (path: string, text: string, boat: string) => loggedDays(new Map([[path, text]]), boat);

/**
 * The file after the operation, given its current text (null = the file doesn't exist).
 * Returns the new text, null to delete the file, or undefined for "leave it as it is".
 */
export function applyOp(op: Op, path: string, current: string | null): string | null | undefined {
  switch (op.kind) {
    case 'timeline': {
      if (current == null) return undefined;
      // Already there (sent once, but the answer was lost on bad signal): don't add it twice.
      const row = timelineRow(op.when, op.what);
      return current.split('\n').some((l) => l.trim() === row) ? current : appendTimelineRow(current, op.when, op.what);
    }
    case 'status': return current == null ? undefined : setStatus(current, op.status);
    case 'field': return current == null ? undefined : setFrontmatterField(current, op.key, op.value);
    case 'create': return current ?? op.text; // never overwrite a file that's already there
    case 'fuel': {
      const e = op.entry;
      const md = path === fuelPaths(op.boat, e.date).md;
      const here = current ? daysIn(path, current, op.boat) : [];
      // "Used" against the day before as the file has it now: another device may have logged one since.
      const prev = later(previousDay(here, e.date), op.prev);
      const calc = prev === undefined ? op.calc : {
        ...op.calc,
        ...usedFrom(prev, { fuel: op.calc.total, received: e.received, lube: op.calc.lubeTotal, lubeReceived: e.lubeReceived, water: e.water, waterReceived: e.waterReceived }),
      };
      let text = md ? upsertFuelMd(current, op.boatName, e, calc) : upsertFuelCsv(current, op.tankKeys, e, calc, op.truck);
      // The next day's "used" compares to this one, so work it out again.
      const next = here.find((d) => d.date > e.date);
      if (next) text = rechain(md, text, next.date, { date: e.date, fuel: calc.total, lube: calc.lubeTotal, water: e.water });
      return text;
    }
    case 'fuelDelete': {
      if (current == null || !daysIn(path, current, op.boat).some((d) => d.date === op.date)) return undefined;
      const md = path === fuelPaths(op.boat, op.date).md;
      let text = md ? removeFuelMd(current, op.date) : removeFuelCsv(current, op.date);
      const here = daysIn(path, text, op.boat);
      const next = here.find((d) => d.date > op.date);
      const prev = next && later(previousDay(here, next.date), op.prev);
      if (next && prev !== undefined) text = rechain(md, text, next.date, prev);
      return text;
    }
    case 'fuelChain': {
      if (current == null) return undefined;
      const here = daysIn(path, current, op.boat);
      if (!here.some((d) => d.date === op.date)) return undefined;
      return rechain(path === fuelPaths(op.boat, op.date).md, current, op.date, later(previousDay(here, op.date), op.prev) ?? null);
    }
    // An edit of the whole file: if the file changed elsewhere since editing began, both sets of changes are kept.
    case 'replace':
      if (current == null || op.base == null || current === op.base) return op.text;
      return merge3(op.base, op.text, current);
    case 'delete': return current == null ? undefined : null;
    case 'deleteDir': return path.startsWith(op.dir) ? null : undefined;
  }
}

export interface Snapshot { builtAt: string; files: KbFile[] }

export interface SyncConfig { owner: string; repo: string; branch: string; root: string; token: string }

export interface SyncStatus {
  pending: number;
  syncing: boolean;
  connected: boolean; // a GitHub key is set
  error?: string;
  lastSaved?: string;
}

const KEYS = { queue: 'kb:queue', overlay: 'kb:overlay', token: 'kb:token', config: 'kb:config' };

function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(k: string, v: unknown): boolean {
  try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

const b64encode = (s: string) => { let bin = ''; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
const b64decode = (b: string) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
/** A waiting change for a file GitHub doesn't have (renamed or deleted elsewhere). */
class MissingFile extends Error {}

function explain(e: unknown, c: SyncConfig): string {
  if (e instanceof MissingFile) return e.message;
  if (e instanceof HttpError) {
    if (e.status === 401) return 'GitHub didn\'t accept the key (wrong or expired). Make a new one in Settings.';
    if (e.status === 403) return 'The GitHub key isn\'t allowed to save to this repository (needs Contents: Read and write), or GitHub is limiting requests. Check Settings.';
    if (e.status === 404) return `GitHub couldn't find ${c.owner}/${c.repo} or its "${c.branch}" branch for this key. Check Settings → Repository and branch.`;
    return `GitHub answered ${e.status}: ${e.message}`;
  }
  return 'No connection to GitHub right now. Changes are kept on this device and send when there\'s signal.';
}

export class KbStore {
  private queue: Queued[] = read<Queued[]>(KEYS.queue, []);
  private overlay: Record<string, { text: string | null; at: string }> = read(KEYS.overlay, {}); // null = deleted
  private listeners = new Set<() => void>();
  private syncing = false;
  private error?: string;
  private lastSaved?: string;
  private viewCache: Map<string, string> | null = null;
  config: SyncConfig;
  storageOk = true;

  constructor(private snapshot: Snapshot, defaults: Omit<SyncConfig, 'token'>, private api: typeof fetch = (...a) => fetch(...a)) {
    this.config = { ...defaults, ...read<Partial<SyncConfig>>(KEYS.config, {}), token: read<string>(KEYS.token, '') };
    // Drop saved files the published copy now includes (times compared as times: the offsets can differ).
    const built = Date.parse(snapshot.builtAt);
    for (const [p, o] of Object.entries(this.overlay)) if (Date.parse(o.at) <= built) delete this.overlay[p];
    write(KEYS.overlay, this.overlay);
    // Another copy of the app open on this device (a tab and the home-screen app) changed what's waiting.
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (e) => {
        if (e.key !== null && e.key !== KEYS.queue && e.key !== KEYS.overlay) return;
        this.queue = read<Queued[]>(KEYS.queue, []);
        this.overlay = read(KEYS.overlay, {});
        this.changed();
      });
  }

  // Always start from what's stored, so two open copies don't wipe each other's waiting changes.
  // (If the browser won't store anything, the list in memory is all there is.)
  private stored(): Queued[] { return this.storageOk ? read<Queued[]>(KEYS.queue, []) : this.queue; }
  private editQueue(fn: (q: Queued[]) => Queued[]) {
    this.queue = fn(this.stored());
    this.storageOk = write(KEYS.queue, this.queue);
  }
  private setOverlay(path: string, o: { text: string | null; at: string }) {
    this.overlay = { ...read(KEYS.overlay, {}), [path]: o };
    write(KEYS.overlay, this.overlay);
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private changed() { this.viewCache = null; for (const fn of this.listeners) fn(); }

  /** The files as the screens should show them. */
  view(): Map<string, string> {
    if (this.viewCache) return this.viewCache;
    const files = new Map(this.snapshot.files.map((f) => [f.path, f.text]));
    for (const [p, o] of Object.entries(this.overlay)) o.text == null ? files.delete(p) : files.set(p, o.text);
    for (const q of this.queue) {
      const paths = q.op.kind === 'deleteDir' ? [...files.keys()].filter((p) => p.startsWith((q.op as { dir: string }).dir)) : opPaths(q.op);
      for (const p of paths) {
        const next = applyOp(q.op, p, files.get(p) ?? null);
        if (next === null) files.delete(p);
        else if (next !== undefined) files.set(p, next);
      }
    }
    return (this.viewCache = files);
  }

  /** Files (any kind, e.g. a PDF in docs/) deleted on this device, waiting or saved. */
  isGone(path: string): boolean {
    if (this.overlay[path] && this.overlay[path].text == null) return true;
    return this.queue.some((q) => (q.op.kind === 'delete' && q.op.path === path) || (q.op.kind === 'deleteDir' && path.startsWith(q.op.dir)));
  }

  status(): SyncStatus {
    return { pending: this.queue.length, syncing: this.syncing, connected: !!this.config.token, error: this.error, lastSaved: this.lastSaved };
  }

  get builtAt() { return this.snapshot.builtAt; }
  get pendingList() { return this.queue.slice(); }

  enqueue(op: Op, label: string) {
    const item = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, op, label, at: new Date().toISOString() };
    this.editQueue((q) => [...q, item]);
    this.changed();
    void this.sync();
  }

  /** Throw away a waiting change (one GitHub can't take, e.g. its file was deleted elsewhere). */
  discard(id: string) {
    this.editQueue((q) => q.filter((x) => x.id !== id));
    this.error = undefined;
    this.changed();
    void this.sync();
  }

  setToken(token: string) { this.config.token = token.trim(); write(KEYS.token, this.config.token || null); this.error = undefined; this.changed(); void this.sync(); }
  setConfig(c: Partial<Omit<SyncConfig, 'token'>>) {
    Object.assign(this.config, c);
    const { token: _t, ...rest } = this.config;
    write(KEYS.config, rest);
    this.changed();
  }

  private url(path: string) {
    const full = [this.config.root, path].filter(Boolean).join('/').split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${full}`;
  }
  private headers() {
    return { Authorization: `Bearer ${this.config.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  }

  async getRemote(path: string): Promise<{ text: string; sha: string } | null> {
    const r = await this.api(`${this.url(path)}?ref=${encodeURIComponent(this.config.branch)}`, { headers: this.headers(), cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new HttpError(r.status, (await r.text()).slice(0, 200));
    const j = await r.json();
    return { text: b64decode(j.content ?? ''), sha: j.sha };
  }

  private async remove(path: string, sha: string, message: string): Promise<string> {
    const r = await this.api(this.url(path), {
      method: 'DELETE',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha, branch: this.config.branch }),
    });
    if (!r.ok && r.status !== 404) throw new HttpError(r.status, (await r.text()).slice(0, 200));
    const j = r.ok ? await r.json() : {};
    return j.commit?.committer?.date ?? new Date().toISOString();
  }

  private async git(method: string, path: string, body?: unknown) {
    const r = await this.api(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/git/${path}`, {
      method, headers: { ...this.headers(), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store',
    });
    if (!r.ok) throw new HttpError(r.status, (await r.text()).slice(0, 200));
    return r.json();
  }

  /** Delete every file under a folder in one commit (GitHub's tree API). Returns the deleted paths (KB-relative). */
  private async removeDir(dir: string, message: string): Promise<{ paths: string[]; at: string }> {
    const branch = encodeURIComponent(this.config.branch);
    const prefix = [this.config.root, dir].filter(Boolean).join('/');
    const ref = await this.git('GET', `ref/heads/${branch}`);
    const commit = await this.git('GET', `commits/${ref.object.sha}`);
    const tree = await this.git('GET', `trees/${commit.tree.sha}?recursive=1`);
    const gone = (tree.tree as { path: string; type: string }[]).filter((t) => t.type === 'blob' && t.path.startsWith(prefix)).map((t) => t.path);
    if (!gone.length) return { paths: [], at: new Date().toISOString() };
    const newTree = await this.git('POST', 'trees', { base_tree: commit.tree.sha, tree: gone.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })) });
    const made = await this.git('POST', 'commits', { message, tree: newTree.sha, parents: [ref.object.sha] });
    await this.git('PATCH', `refs/heads/${branch}`, { sha: made.sha });
    const cut = this.config.root ? this.config.root.length + 1 : 0;
    return { paths: gone.map((p) => p.slice(cut)), at: made.committer?.date ?? new Date().toISOString() };
  }

  private async put(path: string, text: string, sha: string | undefined, message: string): Promise<string> {
    const r = await this.api(this.url(path), {
      method: 'PUT',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: b64encode(text), branch: this.config.branch, ...(sha ? { sha } : {}) }),
    });
    if (!r.ok) throw new HttpError(r.status, (await r.text()).slice(0, 200));
    const j = await r.json();
    return j.commit?.committer?.date ?? new Date().toISOString();
  }

  private async branchExists(): Promise<boolean> {
    const r = await this.api(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/branches/${encodeURIComponent(this.config.branch)}`, { headers: this.headers(), cache: 'no-store' });
    if (r.status === 404) return false;
    if (!r.ok) throw new HttpError(r.status, (await r.text()).slice(0, 200));
    return true;
  }

  /** Check the key: can it see and write the repository, and is the branch there? */
  async testConnection(): Promise<string> {
    try {
      const r = await this.api(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}`, { headers: this.headers(), cache: 'no-store' });
      if (!r.ok) throw new HttpError(r.status, (await r.text()).slice(0, 200));
      const j = await r.json();
      if (j.permissions && !j.permissions.push) return 'The key can read the repository but not save to it. Give it Contents: Read and write.';
      if (!(await this.branchExists())) return `Connected to ${j.full_name ?? this.config.repo}, but it has no branch called "${this.config.branch}". Fix it under Repository and branch.`;
      return `Connected to ${j.full_name ?? this.config.repo}. Changes save to the ${this.config.branch} branch.`;
    } catch (e) {
      return explain(e, this.config);
    }
  }

  /** A free name next to `path` (issue-2.md, issue-3.md…) for a new file whose name is already taken on GitHub. */
  private async freeName(path: string): Promise<string> {
    const m = /^(.*?)(\.[a-z0-9]+)?$/i.exec(path)!;
    for (let i = 2; ; i++) {
      const p = `${m[1]}-${i}${m[2] ?? ''}`;
      if (!(await this.getRemote(p))) return p;
    }
  }

  /** Send waiting changes, oldest first. Stops at the first problem and keeps the rest. */
  async sync(): Promise<void> {
    if (this.syncing || !this.config.token) return;
    // One copy of the app sends at a time; the other's changes are in the same stored list.
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    if (locks) await locks.request('kb-sync', { ifAvailable: true }, (lock) => (lock ? this.send() : undefined));
    else await this.send();
  }

  private async send(): Promise<void> {
    this.queue = this.stored();
    if (this.syncing || !this.queue.length) return;
    this.syncing = true;
    this.changed();
    try {
      // A wrong or deleted branch would otherwise look like "file not there".
      if (!(await this.branchExists())) throw new HttpError(404, 'no such branch');
      for (;;) {
        this.queue = this.stored();
        const q = this.queue[0];
        if (!q) break;
        const message = `KB: ${q.label}\n\nSaved from the knowledge base app.`;
        if (q.op.kind === 'deleteDir') {
          for (let attempt = 0; ; attempt++) {
            try {
              const { paths, at } = await this.removeDir(q.op.dir, message);
              for (const p of paths) this.setOverlay(p, { text: null, at });
              break;
            } catch (e) {
              if (e instanceof HttpError && (e.status === 409 || e.status === 422) && attempt < 2) continue; // branch moved: redo
              throw e;
            }
          }
        }
        if (q.op.kind === 'create') {
          // Another device made a different file with this name first: save this one next to it, and send the
          // later changes for it there too.
          const remote = await this.getRemote(q.op.path);
          if (remote && remote.text !== q.op.text) {
            const from = q.op.path, to = await this.freeName(from);
            this.editQueue((list) => list.map((x) => {
              if (x.id !== q.id && !('path' in x.op && x.op.path === from)) return x;
              return { ...x, op: { ...x.op, path: to } as Op };
            }));
            this.changed();
            continue;
          }
        }
        for (const path of opPaths(q.op)) {
          for (let attempt = 0; ; attempt++) {
            try {
              const remote = await this.getRemote(path);
              if (!remote && (q.op.kind === 'timeline' || q.op.kind === 'status' || q.op.kind === 'field'))
                throw new MissingFile(`"${q.label}" can't be saved: ${path} isn't on GitHub's ${this.config.branch} branch (renamed or deleted elsewhere?). Settings → Waiting to save → Discard it, or check the branch.`);
              const next = applyOp(q.op, path, remote?.text ?? null);
              if (next === undefined || next === remote?.text) break; // nothing to change
              if (next === null) {
                if (!remote) break;
                this.setOverlay(path, { text: null, at: await this.remove(path, remote.sha, message) });
              } else {
                this.setOverlay(path, { text: next, at: await this.put(path, next, remote?.sha, message) });
              }
              break;
            } catch (e) {
              // Someone saved the same file a moment ago: fetch it again and re-apply.
              if (e instanceof HttpError && (e.status === 409 || e.status === 422) && attempt < 2) continue;
              throw e;
            }
          }
        }
        this.editQueue((list) => list.filter((x) => x.id !== q.id));
        this.lastSaved = new Date().toISOString();
        this.error = undefined;
        this.changed();
      }
    } catch (e) {
      this.error = explain(e, this.config);
    } finally {
      this.syncing = false;
      this.changed();
    }
  }
}
