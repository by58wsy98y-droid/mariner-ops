import { useState } from 'react';
import { boatFields, boatSlug, newBoatText } from '../edits';
import { go, useKb } from '../KbApp';
import { today } from './parts';
import { SPEC_LABEL, spec } from '../fleet';

const FALLBACK = `---\nboat:\nformer_names:\ncompany:\ndivision:\npropulsion:\nofficial_number:\nhorsepower:\nsize:\nbuilt:\nrepowered:\nbuilder:\nhome_port:\nengines:\nengine_model:\ngenerators:\ngenerator_model:\ngear:\ngear_make:\nwheels:\nkort_nozzles:\ngross_tons:\nnet_tons:\nfuel_capacity:\nlube_capacity:\nheight:\neye_level:\nhull_depth:\nelectronics:\ntype:\ncontrols:\nrated_rpm:\nidle_rpm:\ndc_system:\nsteering:\nfuel_capacity_full:\nlast_updated:\n---\n\n# <boat name>\n\n## Quick facts\n\n## Open issues\n| Issue | Status | File |\n|---|---|---|\n\n## Things to know walking aboard\n\n## People / contacts\n`;
const LABEL: Record<string, string> = {
  ...SPEC_LABEL,
  engines: 'Main engines, as on the spec sheet (e.g. P-CAT-3612-LH / S-CAT-3612-RH)',
  engine_model: 'Main engine, to group the fleet (e.g. CAT 3612, EMD 710 16cyl, EMD 645 12cyl)',
  generator_model: 'Generator model, to group the fleet (e.g. CAT 3306)',
  gear: 'Gear ratio and maker (e.g. 4.75:1 Reintjes)',
  gear_make: 'Gear maker, to group the fleet (e.g. Reintjes)',
  fuel_capacity_full: 'Usual fuel top-off (e.g. 91,500 gal)', dc_system: 'DC system', rated_rpm: 'Rated rpm', idle_rpm: 'Idle rpm',
  propulsion: 'Propulsion (Z drive; leave blank for a conventional boat)',
  spec_note: 'Note (e.g. what the sheet leaves out)',
  spec_source: 'Where the specs came from (e.g. company spec sheet)',
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
        <p className="small muted">Fill in what you know; the rest can wait. This makes boats/{slug || '<name>'}/boat.md from the template.</p>
        <label htmlFor="nb-name">Boat name<input id="nb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="M/V Example" /></label>
        {taken && <p className="warnbox">There's already a boat with that name.</p>}
        {formerly && <p className="warnbox">That's the former name of <a href={`#/boat/${formerly.slug}`}>{formerly.name}</a>. Add it only if it's a different boat.</p>}
        {keys.map((k) => (
          <label key={k} htmlFor={`nb-${k}`}>{LABEL[k] ?? k.replace(/_/g, ' ')}
            <input id={`nb-${k}`} value={fields[k] ?? ''} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} />
          </label>
        ))}
        <button className="big" onClick={create} disabled={!name.trim() || taken}>Add boat</button>
      </section>
    </div>
  );
}
