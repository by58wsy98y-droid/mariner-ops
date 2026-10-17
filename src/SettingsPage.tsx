import { useRef, useState } from 'react';
import { fmtGal, parseGal } from './calc';
import { readBackup, type AppData, type SyncState } from './storage';
import type { Ask } from './Confirm';
import type { DayTankMode, Settings } from './types';

interface Props {
  data: AppData;
  sync: SyncState;
  onChange: (fn: (d: AppData) => AppData) => void;
  onRestore: (d: AppData) => void;
  onBackup: () => void;
  ask: Ask;
}

const MAX_TANKS = 12;

/** Label for an added tank: one more than the last label's number (#5 -> #6). */
function nextLabel(labels: string[]): string {
  const last = labels[labels.length - 1] ?? '';
  const m = /(\d+)\s*$/.exec(last);
  return m ? last.slice(0, m.index) + (Number(m[1]) + 1) : `#${labels.length + 1}`;
}

const resize = (labels: string[], n: number) => {
  const out = labels.slice(0, n);
  while (out.length < n) out.push(nextLabel(out));
  return out;
};

export default function SettingsPage({ data, sync, onChange, onRestore, onBackup, ask }: Props) {
  const s = data.settings;
  const set = (patch: Partial<Settings>) => onChange((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const perSide = Math.max(s.portLabels.length, s.stbdLabels.length);
  const setPerSide = (n: number) => {
    const k = Math.min(MAX_TANKS, Math.max(1, n));
    set({ portLabels: resize(s.portLabels, k), stbdLabels: resize(s.stbdLabels, k) });
  };

  const restore = async (f: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!f) return;
    setMsg('');
    try {
      const d = await readBackup(f);
      const place = sync.where === 'account' ? 'in your Claude account' : 'on this device';
      if (await ask(`Restore ${d.entries.length} day(s) from this file? This replaces the whole log ${place}.`, 'Replace log', true)) {
        onRestore(d);
        setMsg(`Restored ${d.entries.length} day(s).`);
      }
    } catch (e) {
      setMsg(`Couldn't read that file: ${(e as Error).message}`);
    }
  };

  return (
    <div className="screen">
      <section className="card">
        <h2>Fuel</h2>
        <label htmlFor="set-boat">
          Boat name
          <input id="set-boat" value={s.boatName} onChange={(e) => set({ boatName: e.target.value })} />
        </label>
        <label htmlFor="set-capacity">
          This boat holds ___ gallons full
          <NumInput id="set-capacity" value={s.capacity} onChange={(capacity) => set({ capacity })} />
        </label>
        <label htmlFor="set-truck">
          Truck load (gallons per truck)
          <NumInput id="set-truck" value={s.truckSize} onChange={(truckSize) => set({ truckSize })} />
        </label>
        <label htmlFor="set-levels">
          Alert levels (number of trucks, comma separated)
          <input
            id="set-levels"
            key={s.alertTrucks.join(',')}
            defaultValue={s.alertTrucks.join(', ')}
            onBlur={(e) => set({ alertTrucks: e.target.value.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0) })}
          />
        </label>
        <ul className="small muted levels">
          {[...s.alertTrucks].sort((a, b) => a - b).map((n) => (
            <li key={n}>
              {n} truck{n > 1 ? 's' : ''} ({fmtGal(n * s.truckSize)} gal) when on hand ≤ {fmtGal(s.capacity - n * s.truckSize)}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Tank layout</h2>
        <div>
          <span className="lbl">Main tanks per side</span>
          <div className="stepper">
            <button id="tanks-less" className="secondary" onClick={() => setPerSide(perSide - 1)} disabled={perSide <= 1} aria-label="One fewer tank per side">−</button>
            <output aria-live="polite">{perSide}</output>
            <button id="tanks-more" className="secondary" onClick={() => setPerSide(perSide + 1)} disabled={perSide >= MAX_TANKS} aria-label="One more tank per side">+</button>
          </div>
        </div>
        <div className="sides">
          {(['portLabels', 'stbdLabels'] as const).map((k) => (
            <div key={k} className="side">
              <div className="sidehead single">{k === 'portLabels' ? 'PORT' : 'STBD'} labels</div>
              {s[k].map((l, i) => (
                <input
                  key={i}
                  id={`${k}-${i}`}
                  aria-label={`${k === 'portLabels' ? 'PORT' : 'STBD'} tank ${i + 1} label`}
                  value={l}
                  onChange={(e) => set({ [k]: s[k].map((x, j) => (j === i ? e.target.value : x)) })}
                />
              ))}
            </div>
          ))}
        </div>
        <label htmlFor="set-daytanks">
          Day tanks
          <select id="set-daytanks" value={s.dayTanks} onChange={(e) => set({ dayTanks: e.target.value as DayTankMode })}>
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
            <label key={k} htmlFor={`set-start-${k}`}>
              {k === 'fuel' ? 'Fuel' : k === 'lube' ? 'Lube oil' : 'Water'}
              <NumInput
                id={`set-start-${k}`}
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
          {sync.where === 'account'
            ? 'Your log is saved to your Claude account, so it is on your phone and your laptop. A backup file is a spare copy you keep yourself.'
            : 'Your log lives only in this browser. Back up regularly and keep the file somewhere else (email it to yourself, Google Drive, iCloud).'}
          {s.lastBackup ? ` Last backup: ${new Date(s.lastBackup).toLocaleString()}.` : ' No backup yet.'}
        </p>
        <div className="actions">
          <button id="backup" onClick={onBackup}>Back up (save file)</button>
          <button id="restore" className="secondary" onClick={() => fileRef.current?.click()}>Restore from file…</button>
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
        <input ref={fileRef} id="restore-file" type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </section>
    </div>
  );
}

function NumInput({ id, value, onChange }: { id: string; value: number | null; onChange: (n: number) => void }) {
  return (
    <input
      id={id}
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
