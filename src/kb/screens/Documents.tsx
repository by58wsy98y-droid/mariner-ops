import { parseFrontmatter } from '../frontmatter';
import { parseMarkdown, inlineText } from '../markdown';
import { fileHref } from '../Md';
import { EDITING } from '../features';
import { useKb } from '../KbApp';

const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export default function Documents() {
  const { store, docsList: allDocs, save } = useKb();
  const docsList = allDocs.filter((d) => d.path.startsWith('docs/') && !store.isGone(d.path));
  // Descriptions come from docs/README.md's table.
  const about = new Map<string, { what: string; made: string }>();
  const readme = store.view().get('docs/README.md');
  if (readme) {
    for (const b of parseMarkdown(parseFrontmatter(readme).body))
      if (b.t === 'table') for (const r of b.rows) about.set(inlineText(r[0] ?? []).trim(), { what: inlineText(r[1] ?? []), made: inlineText(r[2] ?? []) });
  }
  return (
    <div className="screen">
      <section className="card">
        <h2>Documents</h2>
        <p className="small muted">Finished forms, guides, spreadsheets and photos.</p>
        <div className="list">
          {docsList.map((d) => {
            const name = d.path.split('/').pop()!;
            const a = about.get(name);
            return (
              <div key={d.path} className="docwrap">
                <a className="docrow" href={fileHref(d.path)} target="_blank" rel="noreferrer">
                  <span className="docrow-title">{name}</span>
                  <span className="docrow-meta"><span>{size(d.size)}</span>{a?.made && <span>{a.made}</span>}</span>
                  {a?.what && <span className="docrow-snip">{a.what}</span>}
                </a>
                {EDITING && <button className="secondary slim danger-text" onClick={() => { if (confirm(`Delete ${name}? GitHub keeps the history.`)) save({ kind: 'delete', path: d.path }, `delete ${name}`); }}>Delete</button>}
              </div>
            );
          })}
        </div>
        {!docsList.length && <p className="muted">No documents yet. They go in the towboat-kb/docs/ folder on GitHub, with a line in docs/README.md saying what each one is.</p>}
      </section>
    </div>
  );
}
