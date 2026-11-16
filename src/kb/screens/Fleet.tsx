import { useState } from 'react';
import { isOpen } from '../corpus';
import { KINDS, boatMatches, fleetHref, groups, modelOf, sortBoats, spec, type Kind } from '../fleet';
import { useKb } from '../KbApp';

export default function Fleet({ kind, model }: { kind?: Kind; model?: string }) {
  const { corpus: c } = useKb();
  const [q, setQ] = useState('');
  const shown = sortBoats(c.boats).filter((b) => (!kind || !model || modelOf(b, kind) === model) && boatMatches(b, q));
  const label = kind && KINDS.find((k) => k.kind === kind)!.label;

  return (
    <div className="screen">
      <section className="card">
        <h2 className="page-title">Fleet <span className="count">{c.boats.length} boats</span></h2>
        <label htmlFor="fleet-q">Find a boat
          <input id="fleet-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, former name or official number" autoComplete="off" />
        </label>
        {KINDS.map((k) => {
          const gs = groups(c.boats, k.kind);
          if (!gs.length) return null;
          return (
            <div key={k.kind} className="fleet-filter">
              <span className="fleet-filter-label">{k.label}</span>
              <div className="chips">
                {gs.map((g) => {
                  const on = kind === k.kind && model === g.model;
                  return <a key={g.model} className={`chip-btn${on ? ' on' : ''}`} href={on ? '#/fleet' : fleetHref(k.kind, g.model)}>{g.model} · {g.boats.length}</a>;
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>{model ? <>{model} <span className="muted small">{label}</span></> : 'All boats'} <span className="count">{shown.length}</span></h2>
        {model && <a className="small" href="#/fleet">Show every boat</a>}
        <div className="list">
          {shown.map((b) => {
            const open = c.docs.filter((d) => d.boat === b.slug && isOpen(d)).length;
            const line1 = [spec(b, 'horsepower') && `${spec(b, 'horsepower')} HP`, spec(b, 'size') && `${spec(b, 'size')} ft`, spec(b, 'built') && `built ${spec(b, 'built')}`].filter(Boolean);
            const line2 = [modelOf(b, 'engine') || spec(b, 'engines'), modelOf(b, 'generator'), spec(b, 'gear')].filter(Boolean);
            return (
              <a key={b.slug} className="docrow" href={`#/boat/${b.slug}`}>
                <span className="docrow-top">
                  <span className="docrow-title">{b.name}</span>
                  {open > 0 && <span className="count small">{open} open</span>}
                </span>
                {spec(b, 'former_names') && <span className="docrow-meta">ex {spec(b, 'former_names')}</span>}
                {line1.length > 0 && <span className="docrow-meta">{line1.map((x) => <span key={x}>{x}</span>)}</span>}
                {line2.length > 0 && <span className="docrow-meta">{line2.map((x) => <span key={x}>{x}</span>)}</span>}
              </a>
            );
          })}
        </div>
        {!shown.length && <p className="muted">No boat matches “{q}”.</p>}
        <a className="button secondary" href="#/new-boat">+ Add a boat</a>
      </section>
    </div>
  );
}
