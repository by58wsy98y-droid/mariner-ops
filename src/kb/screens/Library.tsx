import { useState } from 'react';
import { search } from '../search';
import { useKb } from '../KbApp';
import { DocRow } from './parts';

export default function Library() {
  const { corpus: c, index } = useKb();
  const [q, setQ] = useState('');
  const docs = c.docs.filter((d) => d.type === 'procedure' || d.type === 'knowledge');
  const hits = q.trim() ? search(index, q).filter((h) => h.doc.type === 'procedure' || h.doc.type === 'knowledge') : null;
  const group = (t: 'procedure' | 'knowledge') => docs.filter((d) => d.type === t).sort((a, b) => a.title.localeCompare(b.title));
  return (
    <div className="screen">
      <section className="card">
        <label htmlFor="lib-q">Search procedures and knowledge<input id="lib-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" /></label>
      </section>
      {hits ? (
        <section className="card"><h2>Found <span className="count">{hits.length}</span></h2><div className="list">{hits.map((h) => <DocRow key={h.doc.path} c={c} d={h.doc} snippet={h.snippet} />)}</div></section>
      ) : (
        <>
          <section className="card"><h2>Procedures</h2><p className="small muted">Step-by-step jobs that work on any boat. Each page has a Print button.</p><div className="list">{group('procedure').map((d) => <DocRow key={d.path} c={c} d={d} />)}</div></section>
          <section className="card"><h2>Knowledge</h2><p className="small muted">The “why”, written plain.</p><div className="list">{group('knowledge').map((d) => <DocRow key={d.path} c={c} d={d} />)}</div></section>
        </>
      )}
    </div>
  );
}
