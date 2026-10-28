import { useState } from 'react';
import { issuePath, newIssueText, STATUSES } from '../edits';
import { docHref } from '../Md';
import { go, useKb } from '../KbApp';
import { nowStamp, today } from './parts';

const FALLBACK_TEMPLATE = `---\nboat:\nsystem:\ntitle:\nopened: YYYY-MM-DD\nstatus: OPEN\nseverity: medium\ntags: []\nreported_to:\nrelated:\n---\n\n# <short title>\n\n## Symptoms\n\n## Timeline\n| Date / time | What happened / what was done / what it showed |\n|---|---|\n| | |\n\n## Ruled out\n\n## Working theory\n\n## Next steps, in order\n1.\n\n## Operating restriction while open\n\n## Resolution\n`;

export default function NewIssue({ slug }: { slug: string }) {
  const { corpus: c, store, save } = useKb();
  const boat = c.boats.find((b) => b.slug === slug);
  const systems = [...new Set(c.docs.map((d) => d.system).filter(Boolean) as string[])].sort();
  const [f, setF] = useState({ title: '', system: '', opened: today(), status: 'OPEN', severity: 'medium', tags: '', reportedTo: '', symptoms: '', when: nowStamp(), what: '' });
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  if (!boat) return <section className="card"><h2>Boat not found</h2></section>;

  const create = () => {
    const files = store.view();
    let path = issuePath(slug, f.opened, f.title);
    for (let n = 2; files.has(path); n++) path = path.replace(/(-\d+)?\.md$/, `-${n}.md`);
    const text = newIssueText(files.get('templates/issue.md') ?? FALLBACK_TEMPLATE, {
      boatName: boat.name, system: f.system.trim(), title: f.title.trim(), opened: f.opened, status: f.status, severity: f.severity,
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), reportedTo: f.reportedTo.trim(), symptoms: f.symptoms,
      firstEntry: f.what.trim() ? { when: f.when.trim(), what: f.what.trim() } : undefined,
    });
    save({ kind: 'create', path, text }, `new issue: ${f.title.trim()}`);
    go(docHref(path));
  };

  return (
    <div className="screen">
      <section className="card">
        <div className="crumbs"><a href={`#/boat/${slug}`}>{boat.name}</a> · New issue</div>
        <h2 className="page-title">New issue</h2>
        <p className="small muted">Numbers over adjectives. Write down what was ruled out, not just what was found.</p>
        <label htmlFor="ni-title">Short title<input id="ni-title" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Port main ramps itself up with the lever untouched" /></label>
        <label htmlFor="ni-system">System
          <input id="ni-system" list="ni-systems" value={f.system} onChange={(e) => set('system', e.target.value)} placeholder="steering, port main engine / EMDEC controls…" />
          <datalist id="ni-systems">{systems.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <div className="grid3">
          <label htmlFor="ni-opened">Opened<input id="ni-opened" type="date" value={f.opened} onChange={(e) => set('opened', e.target.value)} /></label>
          <label htmlFor="ni-status">Status<select id="ni-status" value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label htmlFor="ni-sev">Severity<select id="ni-sev" value={f.severity} onChange={(e) => set('severity', e.target.value)}><option>low</option><option>medium</option><option>high</option></select></label>
        </div>
        <label htmlFor="ni-tags">Tags (comma separated)<input id="ni-tags" value={f.tags} onChange={(e) => set('tags', e.target.value)} placeholder="steering, rudder, diver" /></label>
        <label htmlFor="ni-rep">Reported to<input id="ni-rep" value={f.reportedTo} onChange={(e) => set('reportedTo', e.target.value)} placeholder="port engineer (10/28)" /></label>
        <label htmlFor="ni-sym">Symptoms<textarea id="ni-sym" rows={4} value={f.symptoms} onChange={(e) => set('symptoms', e.target.value)} placeholder="What it does, when, under what conditions. Panel/meter numbers. What's normal alongside it." /></label>
        <div className="grid2">
          <label htmlFor="ni-when">First timeline entry: when<input id="ni-when" value={f.when} onChange={(e) => set('when', e.target.value)} /></label>
          <label htmlFor="ni-what">What happened<input id="ni-what" value={f.what} onChange={(e) => set('what', e.target.value)} /></label>
        </div>
        <button className="big" onClick={create} disabled={!f.title.trim()}>Create issue</button>
      </section>
    </div>
  );
}
