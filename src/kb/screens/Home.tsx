import { useEffect, useState } from 'react';
import { TYPE_LABEL, isOpen, type DocType } from '../corpus';
import { search } from '../search';
import { useKb } from '../KbApp';
import { DocRow } from './parts';

const ORDER: DocType[] = ['issue', 'system', 'procedure', 'knowledge', 'boat', 'fuel'];
const SAVED = 'kb:lastSearch';
const SAVED_TAGS = 'kb:lastTags';

export default function Home() {
  const { corpus: c, index } = useKb();
  const [q, setQ] = useState(() => { try { return sessionStorage.getItem(SAVED) ?? ''; } catch { return ''; } });
  const [tags, setTags] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem(SAVED_TAGS) ?? '[]'); } catch { return []; } });
  const [allTags, setAllTags] = useState(false);
  useEffect(() => { try { sessionStorage.setItem(SAVED, q); } catch { /* fine */ } }, [q]);
  useEffect(() => { try { sessionStorage.setItem(SAVED_TAGS, JSON.stringify(tags)); } catch { /* fine */ } }, [tags]);

  const searching = q.trim() || tags.length;
  const hits = searching ? search(index, q, tags) : [];
  const groups = ORDER.map((t) => ({ t, hits: hits.filter((h) => h.doc.type === t) })).filter((g) => g.hits.length);
  const tagCounts = new Map<string, number>();
  for (const d of c.docs) for (const t of d.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const sortedTags = [...tagCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  const topTags = allTags ? sortedTags : [...new Set([...tags, ...sortedTags.slice(0, 10)])];
  const open = c.docs.filter(isOpen).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return (
    <div className="screen">
      <section className="card">
        <label htmlFor="q">Search every boat
          <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ramping, fork terminal, gravitate…" autoComplete="off" autoFocus />
        </label>
        <div className="chips" aria-label="Filter by tag">
          {topTags.map((t) => (
            <button key={t} className={`chip-btn${tags.includes(t) ? ' on' : ''}`} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>
              {t}
            </button>
          ))}
          {sortedTags.length > 10 && (
            <button className="chip-btn more" onClick={() => setAllTags(!allTags)}>{allTags ? 'Fewer tags' : `All ${sortedTags.length} tags`}</button>
          )}
        </div>
      </section>

      {searching ? (
        groups.length ? (
          groups.map((g) => (
            <section key={g.t} className="card">
              <h2>{TYPE_LABEL[g.t]} <span className="count">{g.hits.length}</span></h2>
              <div className="list">{g.hits.map((h) => <DocRow key={h.doc.path} c={c} d={h.doc} snippet={h.snippet} />)}</div>
            </section>
          ))
        ) : (
          <section className="card"><p>Nothing found for “{q}”{tags.length ? ` with ${tags.join(', ')}` : ''}. Try fewer words or a different spelling.</p></section>
        )
      ) : (
        <>
          <section className="card">
            <h2>Boats</h2>
            <div className="list">
              {c.boats.map((b) => (
                <a key={b.slug} className="docrow" href={`#/boat/${b.slug}`}>
                  <span className="docrow-title">{b.name}</span>
                  <span className="docrow-meta">
                    <span>{c.docs.filter((d) => d.boat === b.slug && isOpen(d)).length} open issues</span>
                    <span>{String(b.doc.fm.engines ?? '')}</span>
                  </span>
                </a>
              ))}
            </div>
            <a className="button secondary" href="#/new-boat">+ Add a boat</a>
          </section>
          <section className="card">
            <h2>Open issues, all boats</h2>
            <div className="list">{open.map((d) => <DocRow key={d.path} c={c} d={d} />)}</div>
            {!open.length && <p className="muted">No open issues.</p>}
          </section>
        </>
      )}
    </div>
  );
}
