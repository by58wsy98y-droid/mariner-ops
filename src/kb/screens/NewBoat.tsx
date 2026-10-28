import { useState } from 'react';
import { boatFields, boatSlug, newBoatText } from '../edits';
import { go, useKb } from '../KbApp';
import { today } from './parts';

const FALLBACK = `---\nboat:\ncompany:\nbuilder:\ntype:\nengines:\ncontrols:\nrated_rpm:\nidle_rpm:\ndc_system:\nsteering:\nfuel_capacity_full:\nlast_updated:\n---\n\n# <boat name>\n\n## Quick facts\n\n## Open issues\n| Issue | Status | File |\n|---|---|---|\n\n## Things to know walking aboard\n\n## People / contacts\n`;
const LABEL: Record<string, string> = { fuel_capacity_full: 'Fuel capacity (e.g. 91,500 gal usual top-off)', dc_system: 'DC system', rated_rpm: 'Rated rpm', idle_rpm: 'Idle rpm' };

export default function NewBoat() {
  const { corpus: c, store, save } = useKb();
  const template = store.view().get('templates/boat-profile.md') ?? FALLBACK;
  const keys = boatFields(template);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const slug = boatSlug(name);
  const taken = c.boats.some((b) => b.slug === slug);

  const create = () => {
    save({ kind: 'create', path: `boats/${slug}/boat.md`, text: newBoatText(template, { name: name.trim(), fields }, today()) }, `new boat: ${name.trim()}`);
    go(`#/boat/${slug}`);
  };

  return (
    <div className="screen">
      <section className="card">
        <h2 className="page-title">Add a boat</h2>
        <p className="small muted">Fill in what you know; the rest can wait. This makes boats/{slug || '<name>'}/boat.md from the template.</p>
        <label htmlFor="nb-name">Boat name<input id="nb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="M/V Example" /></label>
        {taken && <p className="warnbox">There's already a boat with that name.</p>}
        {keys.map((k) => (
          <label key={k} htmlFor={`nb-${k}`}>{LABEL[k] ?? k.replace(/_/g, ' ')}
            <input id={`nb-${k}`} value={fields[k] ?? ''} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} />
          </label>
        ))}
        <button className="big" onClick={create} disabled={!name.trim() || taken}>Add boat</button>
        <p className="small muted">Tank tables: in GitHub, upload one CSV per tank to boats/{slug || '<name>'}/fuel/tank-tables/ named tank-2.csv, tank-3.csv… with two columns, inches,gallons. One file serves port and starboard; name them tank-2p.csv / tank-2s.csv if the sides differ.</p>
      </section>
    </div>
  );
}
