import { fmText } from '../frontmatter';
import { isOpen } from '../corpus';
import { section } from '../markdown';
import Md, { docHref } from '../Md';
import { loggedDays } from '../fuel';
import { go, useKb } from '../KbApp';
import { DocRow } from './parts';

const LABELS: Record<string, string> = {
  company: 'Company', builder: 'Builder', type: 'Type', engines: 'Engines', controls: 'Controls', rated_rpm: 'Rated rpm',
  idle_rpm: 'Idle rpm', dc_system: 'DC system', steering: 'Steering', fuel_capacity_full: 'Fuel capacity',
  fuel_capacity_gal: 'Capacity for alerts (gal)', truck_load_gal: 'Truck load (gal)', last_updated: 'Notes updated',
};

export default function BoatPage({ slug }: { slug: string }) {
  const { corpus: c, store, save } = useKb();
  const boat = c.boats.find((b) => b.slug === slug);
  if (!boat) return <section className="card"><h2>Boat not found</h2><p>No boat called “{slug}”. <a href="#/">Back to search</a></p></section>;
  const docs = c.docs.filter((d) => d.boat === slug);
  const issues = docs.filter((d) => d.type === 'issue').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const open = issues.filter(isOpen);
  const systems = docs.filter((d) => d.type === 'system').sort((a, b) => a.title.localeCompare(b.title));
  const fuelDocs = docs.filter((d) => d.type === 'fuel');
  const know = section(boat.doc.blocks, /things to know walking aboard/i);
  const days = loggedDays(store.view(), slug);
  const last = days[days.length - 1];

  return (
    <div className="screen">
      <section className="card">
        <h2 className="page-title">{boat.name}</h2>
        <dl className="profile">
          {Object.entries(boat.doc.fm).filter(([k, v]) => k !== 'boat' && fmText(v)).map(([k, v]) => (
            <div key={k}><dt>{LABELS[k] ?? k.replace(/_/g, ' ')}</dt><dd>{fmText(v)}</dd></div>
          ))}
        </dl>
        <div className="actions">
          <a className="button" href={`#/new-issue/${slug}`}>+ New issue</a>
          <a className="button secondary" href={`#/fuel/${slug}`}>Fuel log</a>
          <a className="button secondary" href={docHref(boat.doc.path)}>All boat notes</a>
        </div>
      </section>

      {know.length > 0 && (
        <section className="card">
          <h2>Things to know walking aboard</h2>
          <Md c={c} from={boat.doc.path} blocks={know} />
        </section>
      )}

      <section className="card">
        <h2>Open issues <span className="count">{open.length}</span></h2>
        <div className="list">{open.map((d) => <DocRow key={d.path} c={c} d={d} showBoat={false} />)}</div>
        {!open.length && <p className="muted">Nothing open.</p>}
      </section>

      <section className="card">
        <h2>Systems</h2>
        <div className="list">{systems.map((d) => <DocRow key={d.path} c={c} d={d} showBoat={false} />)}</div>
        {!systems.length && <p className="muted">No system notes yet. Add a file under boats/{slug}/systems/ in GitHub.</p>}
      </section>

      <section className="card">
        <h2>Fuel</h2>
        {last ? (
          <p>Last logged {last.date}: <b>{last.fuel?.toLocaleString('en-US') ?? '—'} gal</b> on hand{last.used != null ? `, ${last.used.toLocaleString('en-US')} used` : ''}.</p>
        ) : (
          <p className="muted">No fuel days logged yet.</p>
        )}
        <div className="list">{fuelDocs.map((d) => <DocRow key={d.path} c={c} d={d} showBoat={false} />)}</div>
        <a className="button secondary" href={`#/fuel/${slug}`}>Open the fuel log</a>
      </section>

      <section className="card">
        <h2>All issues <span className="count">{issues.length}</span></h2>
        <div className="list">{issues.map((d) => <DocRow key={d.path} c={c} d={d} showBoat={false} />)}</div>
      </section>

      <section className="card">
        <h2>Files for this boat</h2>
        <div className="actions">
          <a className="button secondary" href="#/files">Edit or delete files</a>
          <button className="secondary danger-text" onClick={() => {
            const typed = prompt(`Delete ${boat.name} and ALL its files (systems, issues, fuel logs, tank tables)? GitHub keeps the history. Type the word DELETE to confirm.`);
            if (typed?.trim().toUpperCase() !== 'DELETE') return;
            save({ kind: 'deleteDir', dir: `boats/${slug}/` }, `delete boat ${boat.name}`);
            go('#/');
          }}>Delete this boat</button>
        </div>
      </section>
    </div>
  );
}
