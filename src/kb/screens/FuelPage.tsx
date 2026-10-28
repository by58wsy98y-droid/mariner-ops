import { useMemo, useState } from 'react';
import {
  computeFuel, entryFromDetail, fuelSettings, loggedDays, previousDay, tableMax, tanksFrom, truckAlert, type FuelEntry, type Tank,
} from '../fuel';
import { docHref } from '../Md';
import { useKb } from '../KbApp';
import { today } from './parts';

const gal = (x: number | null | undefined) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));
const num = (s: string): number | null => { const t = s.replace(/,/g, '').trim(); return t === '' || isNaN(+t) ? null : +t; };

function blank(date: string): FuelEntry {
  return { date, inches: {}, received: null, lubeP: null, lubeS: null, lubeReceived: null, water: null, waterReceived: null, notes: '' };
}

export default function FuelPage({ slug }: { slug: string }) {
  const { corpus: c, store, save } = useKb();
  const files = store.view();
  const boat = c.boats.find((b) => b.slug === slug);
  const tanks = useMemo(() => tanksFrom(files, slug), [files, slug]);
  const days = useMemo(() => loggedDays(files, slug), [files, slug]);
  const settings = boat ? fuelSettings(files.get(boat.doc.path) ?? '') : { capacity: 0, truck: 7500 };
  const [date, setDate] = useState(today);
  const saved = days.find((d) => d.date === date);
  const [form, setForm] = useState<Record<string, string>>(() => toForm(saved ? entryFromDetail(saved, date) : null));
  const [formDate, setFormDate] = useState(date);
  const [msg, setMsg] = useState('');
  if (formDate !== date) { // another day picked: load what was saved for it, if anything
    setFormDate(date);
    setForm(toForm(saved ? entryFromDetail(saved, date) : null));
    setMsg('');
  }
  if (!boat) return <section className="card"><h2>Boat not found</h2><a href="#/">Back</a></section>;

  const entry: FuelEntry = {
    date,
    inches: Object.fromEntries(tanks.map((t) => [t.key, num(form[t.key] ?? '')])),
    received: num(form.received ?? ''), lubeP: num(form.lubeP ?? ''), lubeS: num(form.lubeS ?? ''), lubeReceived: num(form.lubeReceived ?? ''),
    water: num(form.water ?? ''), waterReceived: num(form.waterReceived ?? ''), notes: form.notes ?? '',
  };
  const prev = previousDay(days, date);
  const calc = computeFuel(entry, tanks, prev, settings.capacity, settings.truck);
  const alert = truckAlert(calc.room, settings.truck);
  const set = (k: string, v: string) => { setForm({ ...form, [k]: v }); setMsg(''); };
  const canSave = calc.total != null && !calc.bad.length;

  const doSave = () => {
    save({ kind: 'fuel', boat: slug, boatName: boat.name, entry, calc, tankKeys: tanks.map((t) => t.key), truck: settings.truck }, `fuel log ${date}`);
    setMsg(`Saved ${date}. It goes into fuel/log-${date.slice(0, 7)}.md and .csv.`);
  };

  const side = (s: 'P' | 'S') => tanks.filter((t) => t.side === s);
  const fuelProc = c.docs.find((d) => d.path === `boats/${slug}/fuel/fueling-procedure.md`);

  return (
    <div className="screen">
      <section className="card">
        <div className="crumbs"><a href={`#/boat/${slug}`}>{boat.name}</a> · Fuel</div>
        <h2 className="page-title">Daily fuel log</h2>
        <div className="daterow-kb">
          <label htmlFor="fuel-date">Date<input id="fuel-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
          <span className="small muted">
            {saved
              ? saved.detail
                ? 'Already logged: change and save to replace it.'
                : `Logged in the month table: ${gal(saved.fuel)} gal on hand${saved.used != null ? `, ${gal(saved.used)} used` : ''}. The soundings weren't recorded in the app; enter them to replace that row.`
              : prev ? `Previous: ${prev.date}, ${gal(prev.fuel)} gal` : 'First day for this boat.'}
          </span>
        </div>
        {!tanks.length && <p className="warnbox">This boat has no tank tables yet. Add them in GitHub as boats/{slug}/fuel/tank-tables/tank-2.csv (columns: inches,gallons).</p>}
      </section>

      {alert && <div className="banner truck" role="alert"><div><strong>{alert}</strong><div className="small">On hand {gal(calc.total)} · room to full {gal(calc.room)} · capacity {gal(settings.capacity)}</div></div></div>}

      {tanks.length > 0 && (
        <section className="card">
          <h2>Soundings (inches)</h2>
          <p className="small muted">91.5 is fine: half inches are worked out between the table lines.</p>
          <div className="tankgrid">
            {(['P', 'S'] as const).map((s) => (
              <div key={s} className="tankcol">
                <div className="sidehead single">{s === 'P' ? 'Port' : 'Starboard'}</div>
                {side(s).map((t) => <TankInput key={t.key} t={t} value={form[t.key] ?? ''} gallons={calc.gallons[t.key]} bad={calc.bad.includes(t.key)} onChange={(v) => set(t.key, v)} />)}
                <div className="tanktotal">{s === 'P' ? 'Port' : 'Stbd'} total <b>{gal(s === 'P' ? calc.port : calc.stbd)}</b></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Fuel</h2>
        <div className="chain">
          <Row label="Previous" value={gal(prev?.fuel)} />
          <label htmlFor="received" className="chain-row"><span>Received</span><input id="received" inputMode="decimal" value={form.received ?? ''} onChange={(e) => set('received', e.target.value)} placeholder="0" /></label>
          <Row label="Total" value={gal(prev?.fuel != null ? prev.fuel + (entry.received ?? 0) : null)} />
          <Row label="On hand (soundings)" value={gal(calc.total)} strong />
          <Row label="Used" value={gal(calc.used)} warn={calc.used != null && calc.used < 0} />
          <Row label="Room to full" value={gal(calc.room)} />
        </div>
        {calc.used != null && calc.used < 0 && <p className="warnbox">Used is negative: did fuel come aboard? Enter it under Received.</p>}
      </section>

      <section className="card">
        <h2>Lube oil</h2>
        <div className="grid3">
          <label htmlFor="lubeP">Port L/O gal<input id="lubeP" inputMode="decimal" value={form.lubeP ?? ''} onChange={(e) => set('lubeP', e.target.value)} /></label>
          <label htmlFor="lubeS">Stbd L/O gal<input id="lubeS" inputMode="decimal" value={form.lubeS ?? ''} onChange={(e) => set('lubeS', e.target.value)} /></label>
          <label htmlFor="lubeReceived">Received<input id="lubeReceived" inputMode="decimal" value={form.lubeReceived ?? ''} onChange={(e) => set('lubeReceived', e.target.value)} placeholder="0" /></label>
        </div>
        <div className="chain">
          <Row label="Previous" value={gal(prev?.lube)} />
          <Row label="On hand" value={gal(calc.lubeTotal)} strong />
          <Row label="Used" value={gal(calc.lubeUsed)} warn={calc.lubeUsed != null && calc.lubeUsed < 0} />
        </div>
      </section>

      <section className="card">
        <h2>Potable water</h2>
        <div className="grid2">
          <label htmlFor="water">On hand gal<input id="water" inputMode="decimal" value={form.water ?? ''} onChange={(e) => set('water', e.target.value)} /></label>
          <label htmlFor="waterReceived">Received<input id="waterReceived" inputMode="decimal" value={form.waterReceived ?? ''} onChange={(e) => set('waterReceived', e.target.value)} placeholder="0" /></label>
        </div>
        <div className="chain">
          <Row label="Previous" value={gal(prev?.water)} />
          <Row label="Used" value={gal(calc.waterUsed)} warn={calc.waterUsed != null && calc.waterUsed < 0} />
        </div>
      </section>

      <section className="card">
        <label htmlFor="notes">Notes<textarea id="notes" rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Fueled before sounding; 3s then 4s" /></label>
        {calc.bad.length > 0 && <p className="warnbox">Past the end of the tank table: {calc.bad.join(', ')}. Check the sounding.</p>}
        <button className="big" onClick={doSave} disabled={!canSave}>{saved ? `Save changes to ${date}` : `Save ${date}`}</button>
        {saved && (
          <button className="secondary danger-text" onClick={() => {
            if (!confirm(`Delete the fuel log entry for ${date}? Later days' "used" will then compare to the day before it.`)) return;
            save({ kind: 'fuelDelete', boat: slug, date }, `delete fuel day ${date}`);
            setForm({});
            setMsg(`Deleted ${date}.`);
          }}>Delete this day</button>
        )}
        {msg && <p className="small" role="status">{msg}</p>}
      </section>

      <FuelSettings slug={slug} capacity={settings.capacity} truck={settings.truck} boatPath={boat.doc.path} />

      <section className="card">
        <h2>Days logged</h2>
        <div className="tablewrap">
          <table className="mdtable">
            <thead><tr><th>Date</th><th>On hand</th><th>Received</th><th>Used</th><th>Lube</th><th>Water</th><th>Notes</th></tr></thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date} onClick={() => setDate(d.date)} className="clickable">
                  <td>{d.date}</td><td>{gal(d.fuel)}</td><td>{gal(d.received)}</td><td>{gal(d.used)}</td><td>{gal(d.lube)}</td><td>{gal(d.water)}</td><td>{d.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Tank tables</h2>
        {fuelProc && <p><a href={docHref(fuelProc.path)}>Fueling procedure for this boat →</a></p>}
        {tanks.filter((t, i, all) => all.findIndex((x) => x.label === t.label && x.table === t.table) === i).map((t) => (
          <details key={t.key} className="tanktable">
            <summary>Tank {t.label} {tanks.filter((x) => x.label === t.label).length > 1 ? '(port & starboard)' : t.side === 'P' ? '(port)' : '(starboard)'} · 0–{tableMax(t.table)}"</summary>
            <div className="tt-grid">
              {[...t.table].map(([i, g]) => <span key={i}><b>{i}"</b> {g.toLocaleString('en-US')}</span>)}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

function toForm(e: FuelEntry | null): Record<string, string> {
  if (!e) return {};
  const s = (x: number | null) => (x == null ? '' : String(x));
  return {
    ...Object.fromEntries(Object.entries(e.inches).map(([k, v]) => [k, s(v)])),
    received: s(e.received), lubeP: s(e.lubeP), lubeS: s(e.lubeS), lubeReceived: s(e.lubeReceived), water: s(e.water), waterReceived: s(e.waterReceived), notes: e.notes,
  };
}

function TankInput({ t, value, gallons, bad, onChange }: { t: Tank; value: string; gallons: number | null; bad: boolean; onChange: (v: string) => void }) {
  return (
    <label htmlFor={`in-${t.key}`} className="tankrow">
      <span className="tanklabel">{t.label}</span>
      <input id={`in-${t.key}`} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={bad ? 'bad' : ''} aria-label={`${t.side === 'P' ? 'Port' : 'Starboard'} ${t.label} inches`} placeholder='in.' />
      <span className="tankgal">{bad ? `max ${tableMax(t.table)}"` : gallons == null ? '' : `${gallons.toLocaleString('en-US')} gal`}</span>
    </label>
  );
}

function Row({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return <div className="chain-row"><span>{label}</span><b className={`${strong ? 'big-num' : ''}${warn ? ' neg' : ''}`}>{value}</b></div>;
}

function FuelSettings({ slug, capacity, truck, boatPath }: { slug: string; capacity: number; truck: number; boatPath: string }) {
  const { save } = useKb();
  const [cap, setCap] = useState(String(capacity || ''));
  const [tr, setTr] = useState(String(truck || ''));
  const changed = String(capacity || '') !== cap || String(truck || '') !== tr;
  return (
    <section className="card">
      <h2>Alerts for this boat</h2>
      <p className="small muted">Room for 1 truck when on hand is at or below capacity − 1 load; room for 2 at capacity − 2 loads. Saved in boat.md.</p>
      <div className="grid2">
        <label htmlFor={`cap-${slug}`}>Full capacity (gal)<input id={`cap-${slug}`} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} /></label>
        <label htmlFor={`truck-${slug}`}>Truck load (gal)<input id={`truck-${slug}`} inputMode="numeric" value={tr} onChange={(e) => setTr(e.target.value)} /></label>
      </div>
      <button className="secondary" disabled={!changed || !num(cap) || !num(tr)} onClick={() => {
        if (num(cap) !== capacity) save({ kind: 'field', path: boatPath, key: 'fuel_capacity_gal', value: String(num(cap)) }, `fuel capacity ${num(cap)}`);
        if (num(tr) !== truck) save({ kind: 'field', path: boatPath, key: 'truck_load_gal', value: String(num(tr)) }, `truck load ${num(tr)}`);
      }}>Save alert settings</button>
    </section>
  );
}
