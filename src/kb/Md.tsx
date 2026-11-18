// Draws a knowledge-base file. File names written in the text (`issues/....md`, `/docs/....pdf`)
// become links to that page or document.
import { Fragment, type ReactNode } from 'react';
import { findFile, resolvePath, type Corpus } from './corpus';
import { safeHref, type Block, type Inline } from './markdown';

export const docHref = (path: string) => `#/doc/${encodeURI(path)}`;
export const fileHref = (path: string) => `files/${path.split('/').map(encodeURIComponent).join('/')}`;

function linkFor(c: Corpus, from: string, ref: string): string | null {
  const p = findFile(c, from, ref);
  if (p) return p.endsWith('.md') ? docHref(p) : fileHref(p);
  if (/^\/?docs\/[^/]+\.[a-z0-9]+$/i.test(ref)) return fileHref(ref.replace(/^\//, '')); // documents (not in the text copy)
  return null;
}

/** Pictures come only from the knowledge base's own files (never from another site). */
function imgSrc(from: string, src: string): string | null {
  if (/^[a-z]+:/i.test(src) || src.startsWith('//')) return null;
  return fileHref(resolvePath(from, src));
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
      case 'img': {
        const src = imgSrc(from, x.src);
        return src ? <img key={i} src={src} alt={x.alt} loading="lazy" /> : <Fragment key={i}>{x.alt}</Fragment>;
      }
    }
  });
}

/** A checklist line: "- [ ] Cover exhaust stacks" (GitHub shows these as tick boxes too). */
function box(it: Inline[]): { done: boolean; rest: Inline[] } | null {
  const first = it[0];
  const m = first?.t === 'text' ? /^\[([ xX])\]\s+/.exec(first.v) : null;
  if (!m || first.t !== 'text') return null;
  return { done: m[1] !== ' ', rest: [{ t: 'text', v: first.v.slice(m[0].length) }, ...it.slice(1)] };
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
          case 'p': {
            // pictures on their own line are figures (side by side when there are several); the text in [ ] is the caption
            const pics = b.c.filter((x) => !(x.t === 'text' && !x.v.trim()));
            if (pics.length && pics.every((x) => x.t === 'img')) {
              const figs = (pics as { src: string; alt: string }[]).map((p, j) => {
                const src = imgSrc(from, p.src);
                return src ? <figure key={j}><img src={src} alt={p.alt || 'Picture'} loading="lazy" />{p.alt && <figcaption>{p.alt}</figcaption>}</figure> : null;
              });
              return figs.length > 1 ? <div key={i} className="figrow">{figs}</div> : <Fragment key={i}>{figs}</Fragment>;
            }
            // "a. ..." lines under a step sit indented, like the sub-items on the paper card
            const sub = b.c[0]?.t === 'text' && /^[a-z][.)]\s/.test(b.c[0].v);
            return <p key={i} className={sub ? 'sub' : undefined}>{inlines(c, from, b.c)}</p>;
          }
          case 'quote': return <blockquote key={i}>{inlines(c, from, b.c)}</blockquote>;
          case 'hr': return <hr key={i} />;
          case 'code': return <pre key={i}><code>{b.v}</code></pre>;
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul';
            const boxes = b.items.some((it) => box(it));
            return (
              <L key={i} start={b.ordered ? b.start : undefined} className={boxes ? 'checklist' : undefined}>
                {b.items.map((it, j) => {
                  const bx = box(it);
                  return bx ? <li key={j}><span className="box" aria-hidden>{bx.done ? '☑' : '☐'}</span><span>{inlines(c, from, bx.rest)}</span></li> : <li key={j}>{inlines(c, from, it)}</li>;
                })}
              </L>
            );
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
