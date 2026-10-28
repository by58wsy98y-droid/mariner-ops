import { useState } from 'react';
import { parseFrontmatter } from '../frontmatter';
import { parseMarkdown, inlineText } from '../markdown';
import { fileHref } from '../Md';
import { useKb } from '../KbApp';

const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export default function Documents() {
  const { store, docsList } = useKb();
  const [msg, setMsg] = useState('');
  // Descriptions come from docs/README.md's table.
  const about = new Map<string, { what: string; made: string }>();
  const readme = store.view().get('docs/README.md');
  if (readme) {
    for (const b of parseMarkdown(parseFrontmatter(readme).body))
      if (b.t === 'table') for (const r of b.rows) about.set(inlineText(r[0] ?? []).trim(), { what: inlineText(r[1] ?? []), made: inlineText(r[2] ?? []) });
  }
  const keepAll = async () => {
    setMsg('Saving documents on this device…');
    let ok = 0;
    for (const d of docsList) { try { const r = await fetch(fileHref(d.path)); if (r.ok) { await r.blob(); ok++; } } catch { /* no signal */ } }
    setMsg(ok === docsList.length ? `All ${ok} documents will open with no signal.` : `Saved ${ok} of ${docsList.length}. Try again with better signal for the rest.`);
  };
  return (
    <div className="screen">
      <section className="card">
        <h2>Documents</h2>
        <p className="small muted">Finished forms, guides, spreadsheets and photos. A document opens with no signal once it has been opened here once, or after “Keep all for no signal”.</p>
        <div className="list">
          {docsList.map((d) => {
            const name = d.path.split('/').pop()!;
            const a = about.get(name);
            return (
              <a key={d.path} className="docrow" href={fileHref(d.path)} target="_blank" rel="noreferrer">
                <span className="docrow-title">{name}</span>
                <span className="docrow-meta"><span>{size(d.size)}</span>{a?.made && <span>{a.made}</span>}</span>
                {a?.what && <span className="docrow-snip">{a.what}</span>}
              </a>
            );
          })}
        </div>
        <button className="secondary" onClick={keepAll}>Keep all for no signal</button>
        {msg && <p className="small" role="status">{msg}</p>}
      </section>
    </div>
  );
}
