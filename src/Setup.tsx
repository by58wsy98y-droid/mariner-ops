import { useRef, useState } from 'react';
import { readBackup, type AppData, type SyncState } from './storage';
import type { Ask } from './Confirm';
import type { RowDef, SectionDef, Settings } from './types';

interface Props {
  data: AppData;
  sync: SyncState;
  onSettings: (fn: (s: Settings) => Settings) => void;
  onRestore: (d: AppData) => void;
  onBackup: () => void;
  ask: Ask;
}

const newId = (prefix: string) => prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export default function Setup({ data, sync, onSettings, onRestore, onBackup, ask }: Props) {
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const set = (patch: Partial<Settings>) => onSettings((x) => ({ ...x, ...patch }));
  const editSection = (id: string, fn: (sec: SectionDef) => SectionDef) =>
    onSettings((x) => ({ ...x, sections: x.sections.map((sec) => (sec.id === id ? fn(sec) : sec)) }));
  const editRow = (secId: string, rowId: string, patch: Partial<RowDef>) =>
    editSection(secId, (sec) => ({ ...sec, rows: sec.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }));
  const moveRow = (secId: string, i: number, by: number) =>
    editSection(secId, (sec) => {
      const rows = [...sec.rows];
      const j = i + by;
      if (j < 0 || j >= rows.length) return sec;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      return { ...sec, rows };
    });

  const restore = async (f: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!f) return;
    setMsg('');
    try {
      const d = await readBackup(f);
      const place = sync.where === 'account' ? 'in your Claude account' : 'in this browser';
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
        <h2>Boat</h2>
        <label htmlFor="set-boat">Boat name<input id="set-boat" value={s.boatName} onChange={(e) => set({ boatName: e.target.value })} autoComplete="off" /></label>
        <label htmlFor="set-chief">Chief Engineer (filled in on new days)<input id="set-chief" value={s.chief} onChange={(e) => set({ chief: e.target.value })} autoComplete="off" /></label>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="small">
          {sync.where === 'account'
            ? 'Your log is saved to your Claude account, so it shows on your phone and your laptop. A backup file is a spare copy you keep yourself (email it to yourself or keep it in Files/Drive).'
            : 'Your log is only in this browser right now. Back up often and keep the file somewhere else.'}
          {s.lastBackup ? ` Last backup: ${new Date(s.lastBackup).toLocaleString()}.` : ' No backup yet.'}
        </p>
        <div className="actions">
          <button id="backup" onClick={onBackup}>Back up (save file)</button>
          <button id="restore" className="secondary" onClick={() => fileRef.current?.click()}>Restore from file…</button>
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
        <input ref={fileRef} id="restore-file" type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </section>

      <section className="card">
        <h2>Equipment sheets</h2>
        <p className="small muted">
          Rename, add or remove lines to match the boat. "Hours" lines fill from "ran __ hrs"; "Added" lines (like lube oil added) you type
          yourself. Removing a line hides it from new days; saved days keep their numbers.
        </p>
        {s.sections.map((sec) => (
          <details key={sec.id} className="sec-edit">
            <summary>{sec.title} <span className="muted small">· {sec.rows.length} lines{sec.sided ? ' · Port & Starboard' : ''}</span></summary>
            <label htmlFor={`sec-title-${sec.id}`}>Sheet name<input id={`sec-title-${sec.id}`} value={sec.title} onChange={(e) => editSection(sec.id, (x) => ({ ...x, title: e.target.value }))} /></label>
            {sec.rows.map((r, i) => (
              <div key={r.id} className="row-edit">
                <input id={`row-${sec.id}-${r.id}`} aria-label="Line name" value={r.label} onChange={(e) => editRow(sec.id, r.id, { label: e.target.value })} />
                <select id={`kind-${sec.id}-${r.id}`} aria-label="Line type" value={r.kind} onChange={(e) => editRow(sec.id, r.id, { kind: e.target.value as RowDef['kind'] })}>
                  <option value="hours">Hours</option>
                  <option value="added">Added</option>
                </select>
                <button className="secondary icon" onClick={() => moveRow(sec.id, i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button className="secondary icon" onClick={() => moveRow(sec.id, i, 1)} disabled={i === sec.rows.length - 1} aria-label="Move down">↓</button>
                <button
                  className="secondary icon danger-text"
                  aria-label={`Remove ${r.label}`}
                  onClick={async () => (await ask(`Remove "${r.label}" from ${sec.title}?`, 'Remove', true)) && editSection(sec.id, (x) => ({ ...x, rows: x.rows.filter((y) => y.id !== r.id) }))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="actions">
              <button className="secondary" onClick={() => editSection(sec.id, (x) => ({ ...x, rows: [...x.rows, { id: newId('r'), label: 'New line', kind: 'hours' }] }))}>+ Add line</button>
              <button
                className="secondary danger-text"
                onClick={async () => (await ask(`Remove the whole ${sec.title} sheet?`, 'Remove sheet', true)) && onSettings((x) => ({ ...x, sections: x.sections.filter((y) => y.id !== sec.id) }))}
              >
                Remove sheet
              </button>
            </div>
          </details>
        ))}
        <div className="actions">
          <button className="secondary" onClick={() => onSettings((x) => ({ ...x, sections: [...x.sections, { id: newId('s'), title: 'New sheet', sided: true, rows: [] }] }))}>
            + Add sheet (Port &amp; Starboard)
          </button>
          <button className="secondary" onClick={() => onSettings((x) => ({ ...x, sections: [...x.sections, { id: newId('s'), title: 'New sheet', sided: false, rows: [] }] }))}>
            + Add sheet (one column)
          </button>
        </div>
      </section>
    </div>
  );
}
