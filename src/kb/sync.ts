// Keeping the knowledge base in step with GitHub.
//
// The app ships with a copy of every file (made when the site was last published). Each edit is
// stored on the device as an operation ("add this timeline row", "set this status"); the screens show
// the files with those operations applied. When there's signal and a GitHub key, each operation is
// applied to the file's CURRENT text on GitHub and saved as a commit — so an edit made on another
// device in the meantime is kept, not overwritten. A saved file stays shown from the device until the
// published site has caught up with it.
import { appendTimelineRow, setStatus } from './edits';
import { setFrontmatterField } from './frontmatter';
import { removeFuelCsv, removeFuelMd, upsertFuelCsv, upsertFuelMd, type FuelCalc, type FuelEntry } from './fuel';
import { merge3 } from './merge';
import type { KbFile } from './corpus';

export type Op =
  | { kind: 'timeline'; path: string; when: string; what: string }
  | { kind: 'status'; path: string; status: string }
  | { kind: 'field'; path: string; key: string; value: string }
  | { kind: 'create'; path: string; text: string }
  | { kind: 'fuel'; boat: string; boatName: string; entry: FuelEntry; calc: FuelCalc; tankKeys: string[]; truck: number }
  | { kind: 'fuelDelete'; boat: string; date: string }
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
  if (op.kind === 'fuelDelete') { const p = fuelPaths(op.boat, op.date); return [p.md, p.csv]; }
  if (op.kind === 'deleteDir') return [];
  return [op.path];
}

/**
 * The file after the operation, given its current text (null = the file doesn't exist).
 * Returns the new text, null to delete the file, or undefined for "leave it as it is".
 */
export function applyOp(op: Op, path: string, current: string | null): string | null | undefined {
  switch (op.kind) {
    case 'timeline': return current == null ? undefined : appendTimelineRow(current, op.when, op.what);
    case 'status': return current == null ? undefined : setStatus(current, op.status);
    case 'field': return current == null ? undefined : setFrontmatterField(current, op.key, op.value);
    case 'create': return current ?? op.text; // never overwrite a file that's already there
    case 'fuel': {
      const p = fuelPaths(op.boat, op.entry.date);
      if (path === p.md) return upsertFuelMd(current, op.boatName, op.entry, op.calc);
      return upsertFuelCsv(current, op.tankKeys, op.entry, op.calc, op.truck);
    }
    case 'fuelDelete': {
      if (current == null) return undefined;
      return path === fuelPaths(op.boat, op.date).md ? removeFuelMd(current, op.date) : removeFuelCsv(current, op.date);
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

function explain(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.status === 401) return 'GitHub didn\'t accept the key (wrong or expired). Make a new one in Settings.';
    if (e.status === 403) return 'The GitHub key isn\'t allowed to save to this repository (needs Contents: Read and write), or GitHub is limiting requests. Check Settings.';
    if (e.status === 404) return 'GitHub couldn\'t find the repository or branch for this key. Check Settings.';
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
    // Drop saved files the published copy now includes.
    for (const [p, o] of Object.entries(this.overlay)) if (o.at <= snapshot.builtAt) delete this.overlay[p];
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
    this.queue.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, op, label, at: new Date().toISOString() });
    this.storageOk = write(KEYS.queue, this.queue);
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

  /** Check the key: can it see and write the repository? */
  async testConnection(): Promise<string> {
    try {
      const r = await this.api(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}`, { headers: this.headers(), cache: 'no-store' });
      if (!r.ok) throw new HttpError(r.status, (await r.text()).slice(0, 200));
      const j = await r.json();
      if (j.permissions && !j.permissions.push) return 'The key can read the repository but not save to it. Give it Contents: Read and write.';
      return `Connected to ${j.full_name ?? this.config.repo}. Changes save to the ${this.config.branch} branch.`;
    } catch (e) {
      return explain(e);
    }
  }

  /** Send waiting changes, oldest first. Stops at the first problem and keeps the rest. */
  async sync(): Promise<void> {
    if (this.syncing || !this.config.token || !this.queue.length) return;
    this.syncing = true;
    this.changed();
    try {
      while (this.queue.length) {
        const q = this.queue[0];
        const message = `KB: ${q.label}\n\nSaved from the knowledge base app.`;
        if (q.op.kind === 'deleteDir') {
          for (let attempt = 0; ; attempt++) {
            try {
              const { paths, at } = await this.removeDir(q.op.dir, message);
              for (const p of paths) this.overlay[p] = { text: null, at };
              write(KEYS.overlay, this.overlay);
              break;
            } catch (e) {
              if (e instanceof HttpError && (e.status === 409 || e.status === 422) && attempt < 2) continue; // branch moved: redo
              throw e;
            }
          }
        }
        for (const path of opPaths(q.op)) {
          for (let attempt = 0; ; attempt++) {
            try {
              const remote = await this.getRemote(path);
              const next = applyOp(q.op, path, remote?.text ?? null);
              if (next === undefined || next === remote?.text) break; // nothing to change
              if (next === null) {
                if (!remote) break;
                const at = await this.remove(path, remote.sha, message);
                this.overlay[path] = { text: null, at };
              } else {
                const at = await this.put(path, next, remote?.sha, message);
                this.overlay[path] = { text: next, at };
              }
              write(KEYS.overlay, this.overlay);
              break;
            } catch (e) {
              // Someone saved the same file a moment ago: fetch it again and re-apply.
              if (e instanceof HttpError && (e.status === 409 || e.status === 422) && attempt < 2) continue;
              throw e;
            }
          }
        }
        this.queue.shift();
        write(KEYS.queue, this.queue);
        this.lastSaved = new Date().toISOString();
        this.error = undefined;
        this.changed();
      }
    } catch (e) {
      this.error = explain(e);
    } finally {
      this.syncing = false;
      this.changed();
    }
  }
}
