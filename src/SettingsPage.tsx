import { useRef } from 'react';
import { fmtGal, parseGal } from './calc';
import { readBackup, type AppData } from './storage';
import type { DayTankMode, Settings } from './types';

interface Props { data: AppData; onChange: (d: AppData) => void; onBackup: () => void }

export default function SettingsPage({ data, onChange, onBackup }: Props) {
  const s = data.settings;
  const set = (patch: Partial<Settings>) => onChange({ ...data, settings: { ...s, ...patch } });
  const fileRef = useRef<HTMLInputElement>(null);

  const resize = (labels: string[], n: number) =>
    n <= labels.length ? labels.slice(0, n) : [...labels, ...Array.from({ length: n - labels.length }, (_, i) => `#${labels.length + i + 1}`)];
  const perSide = Math.max(s.portLabels.length, s.stbdLabels.length);

  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = await readBackup(f);
      if (confirm(`Restore ${d.entries.length} day(s) from this backup? This REPLACES everything on this device.`)) onChange(d);
    } catch (e) {
      alert(`Could not read that file: ${(e as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="settings">
      <section className="card">
        <h2>Fuel</h2>
        <label>Boat name<input value={s.boatName} onChange={(e) => set({ boatName: e.target.value })} /></label>
        <label>
          This boat holds ___ gallons full
          <NumInput value={s.capacity} onChange={(capacity) => set({ capacity })} />
        </label>
        <label>
          Truck load (gallons per truck)
          <NumInput value={s.truckSize} onChange={(truckSize) => set({ truckSize })} />
        </label>
        <label>
          Alert levels (number of trucks, comma separated)
          <input
            defaultValue={s.alertTrucks.join(', ')}
            onBlur={(e) => set({ alertTrucks: e.target.value.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0) })}
          />
        </label>
        <ul className="small muted">
          {[...s.alertTrucks].sort((a, b) => a - b).map((n) => (
            <li key={n}>
              {n} truck{n > 1 ? 's' : ''} ({fmtGal(n * s.truckSize)} gal) when on hand ≤ {fmtGal(s.capacity - n * s.truckSize)}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Tank layout</h2>
        <label>
          Main tanks per side
          <input
            type="number" inputMode="numeric" min={1} max={12} value={perSide}
            onChange={(e) => {
              const n = Math.min(12, Math.max(1, Number(e.target.value) || 1));
              set({ portLabels: resize(s.portLabels, n), stbdLabels: resize(s.stbdLabels, n) });
            }}
          />
        </label>
        <div className="sides">
          {(['portLabels', 'stbdLabels'] as const).map((k) => (
            <div key={k} className="side">
              <div className="sidehead"><span>{k === 'portLabels' ? 'PORT' : 'STBD'} labels</span></div>
              {s[k].map((l, i) => (
                <input key={i} value={l} onChange={(e) => set({ [k]: s[k].map((x, j) => (j === i ? e.target.value : x)) })} />
              ))}
            </div>
          ))}
        </div>
        <label>
          Day tanks
          <select value={s.dayTanks} onChange={(e) => set({ dayTanks: e.target.value as DayTankMode })}>
            <option value="none">None</option>
            <option value="one">One day tank</option>
            <option value="perSide">One per side</option>
          </select>
        </label>
        <p className="small muted">Changing the layout doesn't touch days already saved.</p>
      </section>

      <section className="card">
        <h2>Starting balances</h2>
        <p className="small muted">On hand before your first entry. Changing these recalculates every day.</p>
        <div className="grid3">
          {(['fuel', 'lube', 'water'] as const).map((k) => (
            <label key={k}>
              {k === 'fuel' ? 'Fuel' : k === 'lube' ? 'Lube oil' : 'Water'}
              <NumInput
                value={s.start?.[k] ?? null}
                onChange={(v) => set({ start: { ...(s.start ?? { fuel: 0, lube: 0, water: 0 }), [k]: v } })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="small">
          Your log lives only on this device. Back up regularly and keep the file somewhere else (email it to
          yourself, Google Drive, iCloud).
          {s.lastBackup ? ` Last backup: ${new Date(s.lastBackup).toLocaleString()}.` : ' No backup yet.'}
        </p>
        <button onClick={onBackup}>Back up (download file)</button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>Restore from file…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </section>
    </div>
  );
}

function NumInput({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <input
      key={value ?? ''}
      inputMode="numeric"
      defaultValue={fmtGal(value)}
      onBlur={(e) => {
        const n = parseGal(e.target.value);
        if (n != null && n !== value) onChange(n);
        else e.target.value = fmtGal(value);
      }}
    />
  );
}
