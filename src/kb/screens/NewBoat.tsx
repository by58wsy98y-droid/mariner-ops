import { useState } from 'react';
import { boatFields, boatSlug, newBoatText } from '../edits';
import { go, useKb } from '../KbApp';
import { today } from './parts';
import { SPEC_LABEL, spec } from '../fleet';

const FALLBACK = `---\nboat:\nformer_names:\ncompany:\ndivision:\npropulsion:\nofficial_number:\nhorsepower:\nsize:\nbuilt:\nrepowered:\nbuilder:\nhome_port:\nengines:\nengine_model:\ngenerators:\ngenerator_model:\ngear:\ngear_make:\nwheels:\nkort_nozzles:\ngross_tons:\nnet_tons:\nfuel_capacity:\nlube_capacity:\nheight:\neye_level:\nhull_depth:\nelectronics:\nlast_updated:\n---\n\n# <boat name>\n`;
const LABEL: Record<string, string> = {
  ...SPEC_LABEL,
  company: 'Company', division: 'Division',
  engines: 'Main engines', engine_model: 'Engine model', generator_model: 'Generator model',
  gear: 'Gear ratio', gear_make: 'Gear maker', propulsion: 'Propulsion',
  fuel_capacity_full: 'Usual fuel top-off (gal)', dc_system: 'DC system', rated_rpm: 'Rated rpm', idle_rpm: 'Idle rpm',
  spec_note: 'Note', spec_source: 'Source',
};

export default function NewBoat() {
  const { corpus: c, store, save } = useKb();
  const template = store.view().get('templates/boat-profile.md') ?? FALLBACK;
  const keys = boatFields(template);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const slug = boatSlug(name);
  const taken = c.boats.some((b) => b.slug === slug);
  const bareName = name.trim().replace(/^(m\/?v\.?)\s+/i, '').toLowerCase();
  const formerly = bareName ? c.boats.find((b) => spec(b, 'former_names').split(',').some((f) => f.trim().toLowerCase() === bareName)) : undefined;

  const create = () => {
    save({ kind: 'create', path: `boats/${slug}/boat.md`, text: newBoatText(template, { name: name.trim(), fields }, today()) }, `new boat: ${name.trim()}`);
    go(`#/boat/${slug}`);
  };

  return (
    <div className="screen">
      <section className="card">
        <h2 className="page-title">Add a boat</h2>
        <label htmlFor="nb-name">Boat name<input id="nb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="M/V" /></label>
        {taken && <p className="warnbox">There's already a boat with that name.</p>}
        {formerly && <p className="warnbox">That's the former name of <a href={`#/boat/${formerly.slug}`}>{formerly.name}</a>. Add it only if it's a different boat.</p>}
        {keys.map((k) => (
          <label key={k} htmlFor={`nb-${k}`}>{LABEL[k] ?? (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' ')}
            <input id={`nb-${k}`} value={fields[k] ?? ''} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} />
          </label>
        ))}
        <button className="big" onClick={create} disabled={!name.trim() || taken}>Add boat</button>
      </section>
    </div>
  );
}
