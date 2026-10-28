import { useState } from 'react';
import { boatName, similarIssues, statusWord, TYPE_LABEL } from '../corpus';
import { STATUSES } from '../edits';
import { fmText } from '../frontmatter';
import Md from '../Md';
import { useKb } from '../KbApp';
import { DocRow, StatusPill, nowStamp } from './parts';

export default function DocPage({ path }: { path: string }) {
  const { corpus: c } = useKb();
  const doc = c.docs.find((d) => d.path === path);
  if (!doc) {
    return (
      <section className="card">
        <h2>Not found</h2>
        <p>There's no page at {path}. It may have been renamed. <a href="#/">Back to search</a></p>
      </section>
    );
  }
  // The file's own "# Title" is shown as the page heading, so leave it out of the body.
  const first = doc.blocks.findIndex((b) => b.t === 'h' && b.level === 1);
  const blocks = first >= 0 ? doc.blocks.filter((_, i) => i !== first) : doc.blocks;
  const similar = doc.type === 'issue' ? similarIssues(c, doc) : [];

  return (
    <div className="screen">
      <section className="card doc">
        <div className="crumbs no-print">
          {doc.boat ? <a href={`#/boat/${doc.boat}`}>{boatName(c, doc.boat)}</a> : <a href="#/library">Procedures &amp; knowledge</a>}
          <span> · {TYPE_LABEL[doc.type]}</span>
        </div>
        <h2 className="page-title">{doc.title}</h2>
        {doc.type === 'issue' && (
          <div className="issue-meta">
            <StatusPill status={doc.status} />
            {doc.status && statusWord(doc.status) !== doc.status.trim().toUpperCase() && <span className="muted">{doc.status}</span>}
            {fmText(doc.fm.severity) && <span><b>Severity:</b> {fmText(doc.fm.severity)}</span>}
            {doc.system && <span><b>System:</b> {doc.system}</span>}
            {doc.date && <span><b>Opened:</b> {doc.date}</span>}
            {fmText(doc.fm.reported_to) && <span><b>Reported to:</b> {fmText(doc.fm.reported_to)}</span>}
            {doc.tags.length > 0 && <span className="chips">{doc.tags.map((t) => <span key={t} className="chip">{t}</span>)}</span>}
          </div>
        )}
        {doc.type === 'issue' && <IssueActions path={doc.path} status={doc.status} />}
        <Md c={c} from={doc.path} blocks={blocks} />
        <div className="actions no-print">
          <button className="secondary" onClick={() => window.print()}>Print</button>
        </div>
      </section>

      {doc.type === 'issue' && (
        <section className="card no-print">
          <h2>Similar issues</h2>
          {similar.length ? (
            <div className="list">
              {similar.map((s) => (
                <div key={s.doc.path}>
                  <DocRow c={c} d={s.doc} />
                  <div className="small muted shared">In common: {s.shared.join(', ')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No other issue shares a tag or the system with this one yet.</p>
          )}
        </section>
      )}
    </div>
  );
}

function IssueActions({ path, status }: { path: string; status?: string }) {
  const { save } = useKb();
  const [open, setOpen] = useState<'timeline' | 'status' | null>(null);
  const [when, setWhen] = useState(nowStamp);
  const [what, setWhat] = useState('');
  const [word, setWord] = useState<string>(statusWord(status));
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const addRow = () => {
    if (!what.trim()) return;
    save({ kind: 'timeline', path, when: when.trim(), what: what.trim() }, `timeline: ${what.trim().slice(0, 50)}`);
    setWhat('');
    setWhen(nowStamp());
    setOpen(null);
    setMsg('Added to the timeline.');
  };
  const setStatusNow = () => {
    const value = note.trim() ? `${word} — ${note.trim()}` : word;
    save({ kind: 'status', path, status: value }, `status → ${value}`);
    setOpen(null);
    setMsg(`Status set to ${value}.`);
  };

  return (
    <div className="issue-actions no-print">
      <div className="actions">
        <button onClick={() => { setOpen(open === 'timeline' ? null : 'timeline'); setMsg(''); }}>+ Add to timeline</button>
        <button className="secondary" onClick={() => { setOpen(open === 'status' ? null : 'status'); setMsg(''); }}>Change status</button>
      </div>
      {msg && <p className="small" role="status">{msg}</p>}
      {open === 'timeline' && (
        <div className="form">
          <label htmlFor="tl-when">Date / time<input id="tl-when" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <label htmlFor="tl-what">What happened / what was done / what it showed
            <textarea id="tl-what" rows={3} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Numbers over adjectives: 25.8 V at the ECM, 26.6 V at the charger" />
          </label>
          <div className="actions">
            <button onClick={addRow} disabled={!what.trim()}>Add row</button>
            <button className="secondary" onClick={() => setOpen(null)}>Cancel</button>
          </div>
        </div>
      )}
      {open === 'status' && (
        <div className="form">
          <label htmlFor="st-word">Status
            <select id="st-word" value={word} onChange={(e) => setWord(e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label htmlFor="st-note">Note (optional)<input id="st-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="needs diver; reported to port engineer" /></label>
          <div className="actions">
            <button onClick={setStatusNow}>Set status</button>
            <button className="secondary" onClick={() => setOpen(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
