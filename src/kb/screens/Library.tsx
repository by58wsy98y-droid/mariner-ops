// The Library: folders. Procedures → General equipment, one folder per main engine model in the fleet,
// and Generators → one folder per generator model → the procedures and maintenance cards filed there.
import { allDocs, findFolder, procedureFolders, type Folder } from '../fleet';
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

const boatsNote = (n: number) => (n ? `${n} boat${n > 1 ? 's' : ''}` : undefined);

export default function Library({ at }: { at: string[] }) {
  const { corpus: c } = useKb();
  const folders = procedureFolders(c.boats, c.docs);
  const [section, ...inside] = at;
  const path = inside.join('/');
  const total = folders.reduce((n, f) => n + allDocs(f).length, 0);
  const row = (f: Folder) => (
    <FolderRow key={f.slug} href={`#/library/procedures/${f.slug}`} name={f.name} count={allDocs(f).length}
      note={f.slug === 'general' ? 'Every boat' : f.children ? `${f.children.length} model${f.children.length === 1 ? '' : 's'}` : boatsNote(f.boats.length)} />
  );

  if (section === 'procedures' && path) {
    const f = findFolder(folders, path);
    // the folders above this one, for the line back up
    const above = inside.slice(0, -1).map((_, i) => findFolder(folders, inside.slice(0, i + 1).join('/'))).filter((x): x is Folder => !!x);
    return (
      <div className="screen">
        <section className="card">
          <div className="crumbs">
            <a href="#/library">Library</a> · <a href="#/library/procedures">Procedures</a>
            {above.map((x) => <span key={x.slug}> · <a href={`#/library/procedures/${x.slug}`}>{x.name}</a></span>)}
          </div>
          <h2 className="page-title">{f?.name ?? path}</h2>
          {f?.slug === 'general' && <p className="small muted">Equipment every boat has. These show on every boat's page.</p>}
          {f && f.slug !== 'general' && !f.children && f.boats.length > 0 && <p className="small muted">On {f.boats.length} boat{f.boats.length > 1 ? 's' : ''}: {f.boats.map((b) => b.name.replace(/^M\/V\s+/, '')).join(', ')}.</p>}
          {f?.children && <div className="folders">{f.children.map(row)}</div>}
          {(f?.docs.length ?? 0) > 0 && <div className="list">{f!.docs.map((d) => <DocRow key={d.path} c={c} d={d} showFolder={false} />)}</div>}
          {f && !f.children && !f.docs.length && <p className="muted">No procedures in this folder yet.</p>}
          {!f && <p className="muted">There's no folder called {path}.</p>}
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
          <div className="folders">{folders.map(row)}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <section className="card">
        <h2 className="page-title">Library</h2>
        <div className="folders">
          <FolderRow href="#/library/procedures" name="Procedures" note="General equipment, main engines and generators" count={total} />
        </div>
      </section>
    </div>
  );
}
