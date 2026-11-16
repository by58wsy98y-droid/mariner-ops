import { fmText } from '../frontmatter';
import { isOpen, type Boat, type Corpus } from '../corpus';
import { KINDS, SPEC_LABEL, fleetHref, groups, modelOf, spec } from '../fleet';
import { section } from '../markdown';
import Md, { docHref } from '../Md';
import { loggedDays } from '../fuel';
import { go, useKb } from '../KbApp';
import { DocRow } from './parts';

const LABELS: Record<string, string> = {
  type: 'Type', controls: 'Controls', rated_rpm: 'Rated rpm', idle_rpm: 'Idle rpm', dc_system: 'DC system', steering: 'Steering',
  fuel_capacity_full: 'Usual fuel top-off', fuel_capacity_gal: 'Capacity for truck alerts (gal)', truck_load_gal: 'Truck load (gal)',
};
// shown elsewhere on the page (the spec sheet, the title, the footer line)
const SHOWN = new Set(['boat', 'division', 'spec_source', 'last_updated', ...Object.keys(SPEC_LABEL)]);
// every boat here is Marquette's: the company line only shows when it says something else
const hidden = (k: string, v: string) => SHOWN.has(k) || (k === 'company' && /^marquette\b/i.test(v.trim()));
const STATS = ['gross_tons', 'net_tons', 'fuel_capacity', 'lube_capacity', 'height', 'eye_level', 'hull_depth'];

/** The company spec sheet: size and build up top, the machinery, then tonnage, capacities and air draft. */
function SpecSheet({ c, boat }: { c: Corpus; boat: Boat }) {
  const v = (k: string) => spec(boat, k);
  const built = [v('built') && `Built ${v('built')}`, v('builder') && `${v('built') ? 'at' : 'Built at'} ${v('builder')}`].filter(Boolean).join(' ');
  const head = [v('horsepower') && `${v('horsepower')} HP`, v('size') && `${v('size')} ft`, built, v('official_number') && `Official no. ${v('official_number')}`, v('home_port'), v('division')].filter(Boolean);
  const rows = [
    ...KINDS.map((k) => ({ label: SPEC_LABEL[k.printed], text: v(k.printed) || modelOf(boat, k.kind), kind: k.kind })),
    { label: 'Wheels', text: v('wheels'), kind: undefined },
  ].filter((r) => r.text);
  const stats = STATS.filter((k) => v(k));
  return (
    <div className="spec">
      {head.length > 0 && <div className="spec-head">{head.map((x) => <span key={x}>{x}</span>)}</div>}
      {rows.length > 0 && (
        <div className="spec-equip">
          {rows.map((r) => {
            const model = r.kind ? modelOf(boat, r.kind) : '';
            const n = model && r.kind ? groups(c.boats, r.kind).find((g) => g.model === model)?.boats.length ?? 0 : 0;
            return (
              <div key={r.label} className="spec-row">
                <span className="spec-label">{r.label}</span>
                <span className="spec-val">
                  {r.text.split(' / ').map((line) => <span key={line} className="spec-line">{line}</span>)}
                  {r.kind && model && n > 1 && <a className="small" href={fleetHref(r.kind, model)}>{model}: {n} boats in the fleet →</a>}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {stats.length > 0 && (
        <div className="spec-stats">
          {stats.map((k) => <div key={k}><span className="spec-label">{SPEC_LABEL[k]}</span><b>{v(k)}</b></div>)}
        </div>
      )}
    </div>
  );
}

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
        {spec(boat, 'former_names') && <p className="muted">Formerly {spec(boat, 'former_names')}</p>}
        <SpecSheet c={c} boat={boat} />
        {Object.entries(boat.doc.fm).some(([k, v]) => !hidden(k, fmText(v)) && fmText(v)) && (
          <dl className="profile">
            {Object.entries(boat.doc.fm).filter(([k, v]) => !hidden(k, fmText(v)) && fmText(v)).map(([k, v]) => (
              <div key={k}><dt>{LABELS[k] ?? k.replace(/_/g, ' ')}</dt><dd>{fmText(v)}</dd></div>
            ))}
          </dl>
        )}
        {(spec(boat, 'spec_source') || spec(boat, 'last_updated')) && (
          <p className="small muted">{[spec(boat, 'spec_source') && `From the ${spec(boat, 'spec_source')}`, spec(boat, 'last_updated') && `updated ${spec(boat, 'last_updated')}`].filter(Boolean).join(' · ')}</p>
        )}
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

      {issues.length > 0 && (
        <section className="card">
          <h2>All issues <span className="count">{issues.length}</span></h2>
          <div className="list">{issues.map((d) => <DocRow key={d.path} c={c} d={d} showBoat={false} />)}</div>
        </section>
      )}

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
