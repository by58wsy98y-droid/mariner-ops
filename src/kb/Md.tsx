// Draws a knowledge-base file. File names written in the text (`issues/....md`, `/docs/....pdf`)
// become links to that page or document.
import { Fragment, type ReactNode } from 'react';
import { findFile, type Corpus } from './corpus';
import { safeHref, type Block, type Inline } from './markdown';

export const docHref = (path: string) => `#/doc/${encodeURI(path)}`;
export const fileHref = (path: string) => `files/${path.split('/').map(encodeURIComponent).join('/')}`;

function linkFor(c: Corpus, from: string, ref: string): string | null {
  const p = findFile(c, from, ref);
  if (p) return p.endsWith('.md') ? docHref(p) : fileHref(p);
  if (/^\/?docs\/[^/]+\.[a-z0-9]+$/i.test(ref)) return fileHref(ref.replace(/^\//, '')); // documents (not in the text copy)
  return null;
}

function inlines(c: Corpus, from: string, xs: Inline[]): ReactNode {
  return xs.map((x, i) => {
    switch (x.t) {
      case 'text': return <Fragment key={i}>{x.v}</Fragment>;
      case 'strong': return <strong key={i}>{inlines(c, from, x.c)}</strong>;
      case 'em': return <em key={i}>{inlines(c, from, x.c)}</em>;
      case 'code': {
        const href = /[./]/.test(x.v) ? linkFor(c, from, x.v) : null;
        return href ? <a key={i} href={href} className="ref"><code>{x.v}</code></a> : <code key={i}>{x.v}</code>;
      }
      case 'link': {
        const href = safeHref(x.href) ?? linkFor(c, from, x.href);
        return href ? <a key={i} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{inlines(c, from, x.c)}</a> : <Fragment key={i}>{inlines(c, from, x.c)}</Fragment>;
      }
    }
  });
}

export default function Md({ c, from, blocks }: { c: Corpus; from: string; blocks: Block[] }) {
  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const H = `h${Math.min(6, b.level + 1)}` as 'h2'; // the page title is the h1
            return <H key={i}>{inlines(c, from, b.c)}</H>;
          }
          case 'p': return <p key={i}>{inlines(c, from, b.c)}</p>;
          case 'quote': return <blockquote key={i}>{inlines(c, from, b.c)}</blockquote>;
          case 'hr': return <hr key={i} />;
          case 'code': return <pre key={i}><code>{b.v}</code></pre>;
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul';
            return <L key={i} start={b.ordered ? b.start : undefined}>{b.items.map((it, j) => <li key={j}>{inlines(c, from, it)}</li>)}</L>;
          }
          case 'table':
            return (
              <div key={i} className="tablewrap">
                <table className="mdtable">
                  <thead><tr>{b.head.map((h, j) => <th key={j}>{inlines(c, from, h)}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((cell, k) => <td key={k}>{inlines(c, from, cell)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
