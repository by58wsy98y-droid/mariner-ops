// Changes the app makes to knowledge-base files. Each works on the file's text and changes only what
// it says (a timeline row, the status line, a new file), so the rest of the markdown comes back untouched.
import { parseFrontmatter, setFrontmatterField } from './frontmatter';

export const STATUSES = ['OPEN', 'WATCHING', 'RESOLVED', 'UNKNOWN'] as const;

const cell = (s: string) => s.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();

export const timelineRow = (when: string, what: string) => `| ${cell(when)} | ${cell(what)} |`;

/** Add a row to the "## Timeline" table (making the section if the file has none). */
export function appendTimelineRow(text: string, when: string, what: string): string {
  const row = timelineRow(when, what);
  const lines = text.split('\n');
  const h = lines.findIndex((l) => /^##\s+Timeline\b/i.test(l));
  if (h < 0) {
    const block = ['## Timeline', '| Date / time | What happened / what was done / what it showed |', '|---|---|', row, ''];
    // put it before the first section after Symptoms, or at the end
    const after = lines.findIndex((l, i) => i > 0 && /^##\s/.test(l) && !/^##\s+Symptoms\b/i.test(l));
    if (after < 0) return text.replace(/\n*$/, '\n\n') + block.join('\n');
    lines.splice(after, 0, ...block);
    return lines.join('\n');
  }
  let end = lines.length;
  for (let i = h + 1; i < lines.length; i++) if (/^#{1,2}\s/.test(lines[i])) { end = i; break; }
  let last = -1;
  for (let i = h + 1; i < end; i++) if (lines[i].trim().startsWith('|')) last = i;
  if (last < 0) {
    lines.splice(h + 1, 0, '| Date / time | What happened |', '|---|---|', row);
    return lines.join('\n');
  }
  if (/^\|\s*\|\s*\|?\s*$/.test(lines[last])) lines[last] = row; // the template's empty row
  else lines.splice(last + 1, 0, row);
  return lines.join('\n');
}

/** Change the issue's status line, e.g. "OPEN — needs diver" or "RESOLVED". */
export const setStatus = (text: string, status: string) => setFrontmatterField(text, 'status', status);

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';

export interface NewIssue {
  boatName: string;
  system: string;
  title: string;
  opened: string; // YYYY-MM-DD
  status: string;
  severity: string;
  tags: string[];
  reportedTo: string;
  symptoms: string;
  firstEntry?: { when: string; what: string };
}

/** A new issue file from templates/issue.md, frontmatter filled in. */
export function newIssueText(template: string, f: NewIssue): string {
  const fields: [string, string][] = [
    ['boat', f.boatName], ['system', f.system], ['title', f.title], ['opened', f.opened], ['status', f.status],
    ['severity', f.severity], ['tags', `[${f.tags.map((t) => t.replace(/[[\],]/g, ' ').trim()).filter(Boolean).join(', ')}]`],
    ['reported_to', f.reportedTo], ['related', ''],
  ];
  let text = template;
  for (const [k, v] of fields) text = setFrontmatterField(text, k, v);
  // (replacer functions, so a "$1" or "$&" typed in the form stays as typed)
  text = text.replace(/^# <short title>\r?$/m, () => `# ${f.title.replace(/\n/g, ' ')}`);
  const sym = f.symptoms.trim();
  if (sym) {
    // under "## Symptoms", in place of the template's hint line if it has one
    const re = /(^##[ \t]+Symptoms[ \t]*\r?\n)(What it does, when\b[^\n]*\n?)?/m;
    text = re.test(text) ? text.replace(re, (_m, h: string) => `${h}${sym}\n`) : text.replace(/\n*$/, '\n\n') + `## Symptoms\n${sym}\n`;
  }
  if (f.firstEntry) text = appendTimelineRow(text, f.firstEntry.when, f.firstEntry.what);
  return text;
}

export const issuePath = (boat: string, opened: string, title: string) => `boats/${boat}/issues/${opened}-${slugify(title)}.md`;

export interface NewBoat { name: string; fields: Record<string, string> }

/** A new boat.md from templates/boat-profile.md. */
export function newBoatText(template: string, b: NewBoat, today: string): string {
  let text = setFrontmatterField(template, 'boat', b.name);
  for (const [k, v] of Object.entries(b.fields)) if (v.trim()) text = setFrontmatterField(text, k, v);
  text = setFrontmatterField(text, 'last_updated', today);
  return text.replace(/^# <boat name>\r?$/m, () => `# ${b.name}`);
}

export const boatSlug = (name: string) => slugify(name.replace(/^(m\/?v|mv)\s+/i, ''));

/** Fields a boat profile has, in template order. */
export const boatFields = (template: string) => Object.keys(parseFrontmatter(template).fm).filter((k) => k !== 'boat' && k !== 'last_updated');
