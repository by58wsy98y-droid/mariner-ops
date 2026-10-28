// Turns the knowledge-base files into documents the app can list, show and search.
// Paths are relative to the knowledge-base folder, e.g. "boats/a-steven-crowley/boat.md".
import { fmList, fmText, parseFrontmatter, type FmValue } from './frontmatter';
import { parseMarkdown, type Block } from './markdown';

export interface KbFile { path: string; text: string }

export type DocType = 'boat' | 'system' | 'issue' | 'fuel' | 'procedure' | 'knowledge';
export const TYPE_LABEL: Record<DocType, string> = {
  boat: 'Boats', system: 'Systems', issue: 'Issues', fuel: 'Fuel', procedure: 'Procedures', knowledge: 'Knowledge',
};

export interface Doc {
  path: string;
  type: DocType;
  boat?: string; // folder name under boats/
  title: string;
  fm: Record<string, FmValue>;
  body: string;
  blocks: Block[];
  tags: string[];
  system?: string;
  status?: string;
  date?: string; // YYYY-MM-DD: opened date or the date in the file name
}

export interface Boat { slug: string; name: string; doc: Doc }

export interface Corpus {
  files: Map<string, string>;
  docs: Doc[];
  boats: Boat[];
}

export function docType(path: string): DocType | null {
  if (/^boats\/[^/]+\/boat\.md$/.test(path)) return 'boat';
  if (/^boats\/[^/]+\/systems\/[^/]+\.md$/.test(path)) return 'system';
  if (/^boats\/[^/]+\/issues\/[^/]+\.md$/.test(path)) return 'issue';
  if (/^boats\/[^/]+\/fuel\/[^/]+\.md$/.test(path)) return 'fuel';
  if (/^procedures\/[^/]+\.md$/.test(path) && !/README\.md$/.test(path)) return 'procedure';
  if (/^knowledge\/[^/]+\.md$/.test(path) && !/README\.md$/.test(path)) return 'knowledge';
  return null; // README, templates, app-spec, docs/ and CSV files aren't documents
}

export const boatOf = (path: string) => /^boats\/([^/]+)\//.exec(path)?.[1];
export const fileName = (path: string) => path.split('/').pop() ?? path;

export function makeDoc(path: string, text: string): Doc | null {
  const type = docType(path);
  if (!type) return null;
  const { fm, body } = parseFrontmatter(text);
  const blocks = parseMarkdown(body);
  const h1 = blocks.find((b) => b.t === 'h' && b.level === 1) as { text: string } | undefined;
  const title = fmText(fm.title) || h1?.text || fmText(fm.boat) || fileName(path).replace(/\.md$/, '');
  const dated = /(\d{4}-\d{2}-\d{2})/.exec(fileName(path))?.[1];
  return {
    path, type, boat: boatOf(path), title, fm, body, blocks,
    tags: fmList(fm.tags),
    system: fmText(fm.system) || undefined,
    status: fmText(fm.status) || undefined,
    date: (fmText(fm.opened).match(/^\d{4}-\d{2}-\d{2}/)?.[0]) || dated,
  };
}

export function buildCorpus(list: KbFile[]): Corpus {
  const files = new Map(list.map((f) => [f.path, f.text]));
  const docs = list.map((f) => makeDoc(f.path, f.text)).filter((d): d is Doc => !!d);
  const boats = docs
    .filter((d) => d.type === 'boat')
    .map((doc) => ({ slug: doc.boat!, name: fmText(doc.fm.boat) || doc.title, doc }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { files, docs, boats };
}

/** An issue is open unless its status starts with RESOLVED. */
export const isOpen = (d: Doc) => d.type === 'issue' && !/^\s*resolved\b/i.test(d.status ?? '');
export const statusWord = (s?: string) => (/^\s*([A-Za-z]+)/.exec(s ?? '')?.[1] ?? 'UNKNOWN').toUpperCase();

export const boatName = (c: Corpus, slug?: string) => c.boats.find((b) => b.slug === slug)?.name ?? slug ?? '';

/** Other issues (any boat) sharing tags or the system, most in common first. */
export function similarIssues(c: Corpus, doc: Doc, max = 6): { doc: Doc; shared: string[] }[] {
  const name = (p: string) => fileName(p).toLowerCase();
  const related = (d: Doc) => fmList(d.fm.related).map((r) => name(r));
  const linked = (d: Doc) => related(doc).includes(name(d.path)) || related(d).includes(name(doc.path));
  const tags = new Set(doc.tags.map((t) => t.toLowerCase()));
  const sys = doc.system?.toLowerCase();
  const sysWords = new Set((sys ?? '').split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  return c.docs
    .filter((d) => d.type === 'issue' && d.path !== doc.path)
    .map((d) => {
      const shared = d.tags.filter((t) => tags.has(t.toLowerCase()));
      const s = d.system?.toLowerCase();
      if (s && sys && (s === sys || s.split(/[^a-z0-9]+/).some((w) => sysWords.has(w)))) shared.unshift(`system: ${d.system}`);
      if (linked(d)) shared.unshift('marked related');
      return { doc: d, shared };
    })
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || (b.doc.date ?? '').localeCompare(a.doc.date ?? ''))
    .slice(0, max);
}

/** Resolve a path written inside a file ("issues/x.md", "../fuel/y.md", "/docs/z.pdf") to a KB path. */
export function resolvePath(from: string, ref: string): string {
  const clean = ref.replace(/^`|`$/g, '').split('#')[0];
  if (clean.startsWith('/')) return clean.slice(1);
  const parts = from.split('/').slice(0, -1);
  for (const seg of clean.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

/** A reference like `issues/...md` may be written relative to the boat folder rather than the file. */
export function findFile(c: Corpus, from: string, ref: string): string | null {
  const tries = [resolvePath(from, ref)];
  const boat = boatOf(from);
  if (boat) tries.push(`boats/${boat}/${ref.replace(/^\.?\//, '')}`);
  tries.push(ref.replace(/^\//, ''));
  for (const t of tries) if (c.files.has(t)) return t;
  return null;
}
