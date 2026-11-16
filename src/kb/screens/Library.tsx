// The Library: folders. Procedures → General equipment, then one folder per main engine model in the
// fleet → the procedures and maintenance cards filed there.
import { procedureFolders } from '../fleet';
import { useKb } from '../KbApp';
import { DocRow } from './parts';

function FolderRow({ href, name, note, count }: { href: string; name: string; note?: string; count: number }) {
  return (
    <a className="folder-row" href={href}>
      <svg className="folder-icon" viewBox="0 0 24 24" aria-hidden><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /></svg>
      <span className="folder-text"><b>{name}</b>{note && <span className="small muted">{note}</span>}</span>
      <span className="count">{count}</span>
      <span className="folder-chevron" aria-hidden>›</span>
    </a>
  );
}

export default function Library({ at }: { at: string[] }) {
  const { corpus: c } = useKb();
  const folders = procedureFolders(c.boats, c.docs);
  const [section, folder] = at;
  const total = folders.reduce((n, f) => n + f.docs.length, 0);

  if (section === 'procedures' && folder) {
    const f = folders.find((x) => x.slug === folder);
    return (
      <div className="screen">
        <section className="card">
          <div className="crumbs"><a href="#/library">Library</a> · <a href="#/library/procedures">Procedures</a></div>
          <h2 className="page-title">{f?.name ?? folder}</h2>
          {f && f.slug === 'general' && <p className="small muted">Equipment every boat has. These show on every boat's page.</p>}
          {f && f.slug !== 'general' && f.boats.length > 0 && <p className="small muted">On {f.boats.length} boat{f.boats.length > 1 ? 's' : ''}: {f.boats.map((b) => b.name.replace(/^M\/V\s+/, '')).join(', ')}.</p>}
          <div className="list">{(f?.docs ?? []).map((d) => <DocRow key={d.path} c={c} d={d} showFolder={false} />)}</div>
          {!f?.docs.length && <p className="muted">No procedures in this folder yet.</p>}
        </section>
      </div>
    );
  }

  if (section === 'procedures') {
    return (
      <div className="screen">
        <section className="card">
          <div className="crumbs"><a href="#/library">Library</a></div>
          <h2 className="page-title">Procedures</h2>
          <div className="folders">
            {folders.map((f) => (
              <FolderRow key={f.slug} href={`#/library/procedures/${f.slug}`} name={f.name} count={f.docs.length}
                note={f.slug === 'general' ? 'Every boat' : f.boats.length ? `${f.boats.length} boat${f.boats.length > 1 ? 's' : ''}` : undefined} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <section className="card">
        <h2 className="page-title">Library</h2>
        <div className="folders">
          <FolderRow href="#/library/procedures" name="Procedures" note="General equipment, and a folder for each engine" count={total} />
        </div>
      </section>
    </div>
  );
}
