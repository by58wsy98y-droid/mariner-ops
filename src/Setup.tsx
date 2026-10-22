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
      let j = i + by;
      while (j >= 0 && j < rows.length && rows[j].removed) j += by; // skip lines taken off
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
          Rename, add or take off lines to match the boat. <b>Fills</b> lines get the hours from "ran __ hrs"; <b>Typed</b> lines (lube oil
          added, compressors, pilot bearings) you type yourself. A line you take off stops showing on new days; days that already have numbers
          for it keep showing and printing them, and you can put it back below.
        </p>
        {s.sections.filter((sec) => !sec.removed).map((sec) => {
          const live = sec.rows.filter((r) => !r.removed);
          const gone = sec.rows.filter((r) => r.removed);
          return (
          <details key={sec.id} className="sec-edit">
            <summary>{sec.title} <span className="muted small">· {live.length} lines{sec.sided ? ' · Port & Starboard' : ''}</span></summary>
            <label htmlFor={`sec-title-${sec.id}`}>Sheet name<input id={`sec-title-${sec.id}`} value={sec.title} onChange={(e) => editSection(sec.id, (x) => ({ ...x, title: e.target.value }))} /></label>
            {sec.rows.map((r, i) => r.removed ? null : (
              <div key={r.id} className="row-edit">
                <input id={`row-${sec.id}-${r.id}`} aria-label="Line name" value={r.label} onChange={(e) => editRow(sec.id, r.id, { label: e.target.value })} />
                <select id={`kind-${sec.id}-${r.id}`} aria-label="Line type" value={r.kind} onChange={(e) => editRow(sec.id, r.id, { kind: e.target.value as RowDef['kind'] })}>
                  <option value="hours">Fills</option>
                  <option value="added">Typed</option>
                </select>
                <button className="secondary icon" onClick={() => moveRow(sec.id, i, -1)} disabled={!sec.rows.slice(0, i).some((x) => !x.removed)} aria-label={`Move ${r.label} up`}>↑</button>
                <button className="secondary icon" onClick={() => moveRow(sec.id, i, 1)} disabled={!sec.rows.slice(i + 1).some((x) => !x.removed)} aria-label={`Move ${r.label} down`}>↓</button>
                <button
                  className="secondary icon danger-text"
                  aria-label={`Take off ${r.label}`}
                  onClick={async () => (await ask(`Take "${r.label}" off ${sec.title}? Days that already have numbers for it keep them, and you can put it back.`, 'Take off', true)) && editRow(sec.id, r.id, { removed: true })}
                >
                  ✕
                </button>
              </div>
            ))}
            {gone.length > 0 && (
              <div className="removed">
                <span className="small muted">Taken off:</span>
                {gone.map((r) => (
                  <button key={r.id} className="secondary" onClick={() => editRow(sec.id, r.id, { removed: false })}>Put back “{r.label}”</button>
                ))}
              </div>
            )}
            <div className="actions">
              <button className="secondary" onClick={() => editSection(sec.id, (x) => ({ ...x, rows: [...x.rows, { id: newId('r'), label: 'New line', kind: 'hours' }] }))}>+ Add line</button>
              <button
                className="secondary danger-text"
                onClick={async () => (await ask(`Take the whole ${sec.title} sheet off? Days that already have numbers for it keep them, and you can put it back.`, 'Take sheet off', true)) && editSection(sec.id, (x) => ({ ...x, removed: true }))}
              >
                Take sheet off
              </button>
            </div>
          </details>
          );
        })}
        {s.sections.some((sec) => sec.removed) && (
          <div className="removed">
            <span className="small muted">Sheets taken off:</span>
            {s.sections.filter((sec) => sec.removed).map((sec) => (
              <button key={sec.id} className="secondary" onClick={() => editSection(sec.id, (x) => ({ ...x, removed: false }))}>Put back “{sec.title}”</button>
            ))}
          </div>
        )}
        <p className="small muted">A line added after the first day shows a <b>Current</b> box on the Day screen for its present reading.</p>
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
