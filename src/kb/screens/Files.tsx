// Every file in the knowledge base: open, edit, delete; add a new page to a folder.
import { useState } from 'react';
import { docType } from '../corpus';
import { docHref, fileHref } from '../Md';
import { slugify } from '../edits';
import { go, useKb } from '../KbApp';

const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export default function Files() {
  const { store, docsList, save, corpus: c } = useKb();
  const files = store.view();
  const all = [
    ...[...files.keys()].map((p) => ({ path: p, size: new Blob([files.get(p)!]).size, text: true })),
    ...docsList.filter((d) => !store.isGone(d.path)).map((d) => ({ ...d, text: false })),
  ].sort((a, b) => a.path.localeCompare(b.path));
  const folders = new Map<string, typeof all>();
  for (const f of all) { const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/') + 1) : ''; folders.set(dir, [...(folders.get(dir) ?? []), f]); }
  const [filter, setFilter] = useState('');

  const del = (path: string) => {
    if (!confirm(`Delete ${path}? It's removed from GitHub too (GitHub keeps the history, so it can be brought back from there).`)) return;
    save({ kind: 'delete', path }, `delete ${path}`);
  };

  return (
    <div className="screen">
      <section className="card">
        <h2 className="page-title">All files</h2>
        <p className="small muted">Everything in the knowledge base. Edit or delete what doesn't belong; add a page to any folder. Deleted files stay in GitHub's history.</p>
        <label htmlFor="files-q">Show files containing<input id="files-q" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="issues, fuel, steering…" /></label>
      </section>
      {[...folders].filter(([dir, list]) => !filter || (dir + list.map((f) => f.path).join(' ')).toLowerCase().includes(filter.toLowerCase())).map(([dir, list]) => (
        <section key={dir} className="card">
          <h2 className="folder">{dir || 'top folder'}</h2>
          <div className="list">
            {list.map((f) => {
              const name = f.path.slice(dir.length);
              const isDoc = !!docType(f.path);
              return (
                <div key={f.path} className="filerow">
                  <a href={isDoc ? docHref(f.path) : f.text ? `#/edit/${encodeURI(f.path)}` : fileHref(f.path)} target={!f.text ? '_blank' : undefined} rel="noreferrer" className="filename">{name}</a>
                  <span className="small muted">{size(f.size)}</span>
                  {f.text && <a className="button secondary slim" href={`#/edit/${encodeURI(f.path)}`}>Edit</a>}
                  <button className="secondary slim danger-text" onClick={() => del(f.path)}>Delete</button>
                </div>
              );
            })}
          </div>
          <NewFile dir={dir} exists={(p) => files.has(p)} onCreate={(path, text) => { save({ kind: 'create', path, text }, `new file ${path}`); go(path.endsWith('.md') && docType(path) ? docHref(path) : `#/edit/${encodeURI(path)}`); }} boats={c.boats.map((b) => b.slug)} />
        </section>
      ))}
    </div>
  );
}

function NewFile({ dir, exists, onCreate }: { dir: string; exists: (p: string) => boolean; onCreate: (path: string, text: string) => void; boats: string[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const csv = /tank-tables\/$/.test(dir);
  if (!open) return <button className="secondary slim" onClick={() => setOpen(true)}>+ New {csv ? 'tank table' : 'page'} here</button>;
  const name = csv ? `tank-${slugify(title)}.csv` : `${slugify(title)}.md`;
  const path = dir + name;
  const text = csv ? 'inches,gallons\n0,0\n' : `---\ntitle: ${title.trim()}\n---\n\n# ${title.trim()}\n\n`;
  return (
    <div className="form">
      <label htmlFor={`nf-${dir}`}>{csv ? 'Tank number (e.g. 2, or 2p / 2s if port and starboard differ)' : 'Title'}<input id={`nf-${dir}`} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <p className="small muted">Makes {path}</p>
      {exists(path) && <p className="warnbox">That file already exists.</p>}
      <div className="actions">
        <button disabled={!title.trim() || exists(path)} onClick={() => onCreate(path, text)}>Create</button>
        <button className="secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
