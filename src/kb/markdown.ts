// A small markdown reader for the knowledge-base files: headings, paragraphs, lists, tables, code,
// bold/italic/code/links. It produces a plain structure that the screens draw as React elements
// (never as raw HTML), so nothing in a file can run as code in the app.
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'h'; level: number; c: Inline[]; text: string }
  | { t: 'p'; c: Inline[] }
  | { t: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'code'; v: string }
  | { t: 'quote'; c: Inline[] }
  | { t: 'hr' };

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const isTableSep = (l: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l);

export function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (s[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const flush = () => { if (text) out.push({ t: 'text', v: text }); text = ''; };
  for (let i = 0; i < src.length; ) {
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^`([^`]+)`/.exec(rest))) { flush(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue; }
    if ((m = /^\*\*(.+?)\*\*/.exec(rest))) { flush(); out.push({ t: 'strong', c: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) { flush(); out.push({ t: 'link', href: m[2], c: parseInline(m[1]) }); i += m[0].length; continue; }
    const prev = i > 0 ? src[i - 1] : ' ';
    // (no lookbehind in these patterns: older iPhones can't read it)
    // (*P* is one letter in italics; a fill-in blank ___ stays as typed)
    if (/\s|[(\-/]/.test(prev) && (m = /^([*_])(?!\1)(\S|\S.*?\S)\1(?![A-Za-z0-9*_])/.exec(rest))) {
      flush(); out.push({ t: 'em', c: parseInline(m[2]) }); i += m[0].length; continue;
    }
    text += src[i++];
  }
  flush();
  return out;
}

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const endPara = () => { if (para.length) blocks.push({ t: 'p', c: parseInline(para.join(' ')) }); para = []; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      endPara();
      const code: string[] = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({ t: 'code', v: code.join('\n') });
      continue;
    }
    if (!line.trim()) { endPara(); continue; }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) { endPara(); blocks.push({ t: 'h', level: h[1].length, c: parseInline(h[2]), text: h[2] }); continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { endPara(); blocks.push({ t: 'hr' }); continue; }
    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      endPara();
      const head = splitRow(line).map(parseInline);
      const rows: Inline[][][] = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(splitRow(lines[i]).map(parseInline));
      i--;
      blocks.push({ t: 'table', head, rows });
      continue;
    }
    const li = LIST.exec(line);
    if (li) {
      endPara();
      const ordered = /\d/.test(li[2]);
      const items: string[] = [li[3]];
      for (i++; i < lines.length; i++) {
        const next = lines[i];
        const nli = LIST.exec(next);
        if (nli && /\d/.test(nli[2]) === ordered) items.push(nli[3]);
        else if (nli) items.push(nli[3]); // a nested or mixed item: keep it in this list
        else if (next.trim() && /^\s+/.test(next)) items[items.length - 1] += ' ' + next.trim(); // continued line
        else break;
      }
      i--;
      blocks.push({ t: 'list', ordered, start: ordered ? parseInt(li[2], 10) || 1 : 1, items: items.map(parseInline) });
      continue;
    }
    if (/^>/.test(line)) {
      // a quote's lines join up into paragraphs; a bare ">" line starts a new one
      endPara();
      let q: string[] = [];
      const endQuote = () => { if (q.length) blocks.push({ t: 'quote', c: parseInline(q.join(' ')) }); q = []; };
      for (; i < lines.length && /^>/.test(lines[i]); i++) {
        const t = lines[i].replace(/^>\s?/, '').trim();
        if (t) q.push(t);
        else endQuote();
      }
      endQuote();
      i--;
      continue;
    }
    para.push(line.trim());
  }
  endPara();
  return blocks;
}

/** Plain text of a document, for searching and snippets. */
export const inlineText = (c: Inline[]): string =>
  c.map((x) => (x.t === 'text' || x.t === 'code' ? x.v : inlineText(x.c))).join('');

/** The blocks under one "## Heading" (until the next heading of the same or higher level). */
export function section(blocks: Block[], title: RegExp): Block[] {
  const i = blocks.findIndex((b) => b.t === 'h' && title.test(b.text));
  if (i < 0) return [];
  const level = (blocks[i] as { level: number }).level;
  const out: Block[] = [];
  for (let j = i + 1; j < blocks.length; j++) {
    const b = blocks[j];
    if (b.t === 'h' && b.level <= level) break;
    out.push(b);
  }
  return out;
}

/** Links allowed out of a file: web addresses and mail; anything else (javascript: etc.) is dropped. */
export function safeHref(href: string): string | null {
  return /^(https?:|mailto:)/i.test(href.trim()) ? href.trim() : null;
}
