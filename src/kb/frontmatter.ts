// The "---" block at the top of each knowledge-base file. Read it into fields, and change one field
// without touching any other byte of the file.
export type FmValue = string | string[];
export interface Parsed {
  fm: Record<string, FmValue>;
  body: string; // everything after the closing ---
}

const FM = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;

export function parseFrontmatter(text: string): Parsed {
  const m = FM.exec(text);
  if (!m) return { fm: {}, body: text };
  const fm: Record<string, FmValue> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):[ \t]?(.*)$/.exec(line);
    if (!kv) continue;
    const v = kv[2].trim();
    fm[kv[1]] = /^\[.*\]$/.test(v)
      ? v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
      : v;
  }
  return { fm, body: text.slice(m[0].length) };
}

export const fmText = (v: FmValue | undefined): string => (Array.isArray(v) ? v.join(', ') : v ?? '');
export const fmList = (v: FmValue | undefined): string[] =>
  Array.isArray(v) ? v : v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

/** Set one field (adding it if missing). Only that line changes. */
export function setFrontmatterField(text: string, key: string, value: string): string {
  const clean = value.replace(/\r?\n/g, ' ').trim();
  const m = FM.exec(text);
  if (!m) return `---\n${key}: ${clean}\n---\n\n${text}`;
  const start = text.indexOf('\n') + 1; // first line inside the block
  const inner = m[1];
  const lines = inner.split('\n');
  const i = lines.findIndex((l) => l.replace(/\r$/, '').startsWith(key + ':'));
  if (i >= 0) {
    const cr = lines[i].endsWith('\r') ? '\r' : '';
    lines[i] = `${key}: ${clean}${cr}`;
  } else lines.push(`${key}: ${clean}`);
  return text.slice(0, start) + lines.join('\n') + text.slice(start + inner.length);
}
