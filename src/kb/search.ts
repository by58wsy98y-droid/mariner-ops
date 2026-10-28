// "Have I seen this before, on any boat?" — full-text search across every document.
import { fmText } from './frontmatter';
import { inlineText, type Block } from './markdown';
import type { Corpus, Doc } from './corpus';

/** Word endings stripped so "ramping", "ramps" and "ramped" all find "ramp" (and "batteries" "battery", "tripped" "trip"). */
export function stem(w: string): string {
  let s = w.toLowerCase().replace(/'s$/, '');
  if (s.length > 4 && s.endsWith('ies')) return s.slice(0, -3) + 'y';
  for (const suf of ['ing', 'ed', 'es', 's', 'e']) {
    if (s.endsWith(suf) && s.length - suf.length >= 3) {
      s = s.slice(0, -suf.length);
      if ((suf === 'ing' || suf === 'ed') && s.length > 3 && /([bdgmnprt])\1$/.test(s)) s = s.slice(0, -1); // running → run
      break;
    }
  }
  return s;
}

export const words = (text: string) =>
  text.toLowerCase()
    .replace(/[\u2018\u2019]/g, "'") // iPhone's curly apostrophe
    .replace(/(\d)(v|vac|vdc|hz|psi|rpm|gal|kw|mv|a)\b/g, '$1 $2') // 24V is found as "24 V"
    .match(/[a-z0-9#][a-z0-9#'./-]*[a-z0-9]|[a-z0-9]/g) ?? [];
const terms = (text: string) => words(text).flatMap((w) => [w, ...w.split(/[./-]/)]).filter(Boolean).map(stem);

function blocksText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.t === 'h' || b.t === 'p' || b.t === 'quote') return 'c' in b ? inlineText(b.c) : '';
      if (b.t === 'list') return b.items.map(inlineText).join('\n');
      if (b.t === 'table') return [b.head, ...b.rows].map((r) => r.map(inlineText).join(' | ')).join('\n');
      if (b.t === 'code') return b.v;
      return '';
    })
    .join('\n');
}

interface Entry { doc: Doc; weights: Map<string, number>; lines: string[] }
export interface Hit { doc: Doc; score: number; snippet: string }
export interface Index { entries: Entry[]; tags: string[] }

export function buildIndex(c: Corpus): Index {
  const entries = c.docs.map((doc) => {
    const weights = new Map<string, number>();
    const add = (text: string, w: number) => { for (const t of terms(text)) weights.set(t, (weights.get(t) ?? 0) + w); };
    const text = blocksText(doc.blocks);
    // the file's other details: builder, engines, severity, applies to…
    const details = Object.entries(doc.fm).filter(([k]) => !['title', 'tags', 'system'].includes(k)).map(([, v]) => fmText(v)).join('\n');
    add(doc.title, 6);
    add(doc.tags.join(' '), 4);
    add([doc.system, doc.boat?.replace(/-/g, ' ')].filter(Boolean).join(' '), 2);
    add(details, 1);
    add(text, 1);
    return { doc, weights, lines: [...text.split('\n'), ...details.split('\n')].filter((l) => l.trim()) };
  });
  const tags = [...new Set(c.docs.flatMap((d) => d.tags))].sort((a, b) => a.localeCompare(b));
  return { entries, tags };
}

function snippet(lines: string[], qs: string[]): string {
  const hit = lines.find((l) => { const ts = terms(l); return qs.some((q) => ts.some((t) => t.startsWith(q))); }) ?? lines[0] ?? '';
  return hit.length > 180 ? hit.slice(0, 177) + '…' : hit;
}

/** Every query word must appear (the last one may be half-typed). Optional tag filter: all must match. */
export function search(index: Index, query: string, tagFilter: string[] = []): Hit[] {
  const qs = [...new Set(terms(query))];
  const want = tagFilter.map((t) => t.toLowerCase());
  if (!qs.length && !want.length) return []; // only punctuation typed
  const out: Hit[] = [];
  for (const e of index.entries) {
    if (want.length && !want.every((t) => e.doc.tags.some((x) => x.toLowerCase() === t))) continue;
    let score = 0;
    let all = true;
    qs.forEach((q, i) => {
      let s = e.weights.get(q) ?? 0;
      if (!s && (i === qs.length - 1 || q.length >= 4)) for (const [t, w] of e.weights) if (t.startsWith(q)) s += w * 0.6;
      if (!s) all = false;
      score += s;
    });
    if (!qs.length) score = 1; // tag filter only
    if (all && score > 0) out.push({ doc: e.doc, score, snippet: snippet(e.lines, qs) });
  }
  return out.sort((a, b) => b.score - a.score);
}
