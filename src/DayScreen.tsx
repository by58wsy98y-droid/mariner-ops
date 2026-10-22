import { useMemo, useState } from 'react';
import {
  FLUIDS, SIDE_LABEL, balancesBefore, cellKey, computeDay, copyFrom, emptyDay, fillHours, fmt2, fmtIn, hasEntry,
  niceDate, parseNum, sectionKeys, sectionsForDay, setReset, setStartValue, setToday, shiftDate, sidesOf, startDateOf, todayISO,
} from './calc';
import { Modal, type Ask } from './Confirm';
import NumField from './NumField';
import type { AppData } from './storage';
import type { Balances, DayLog, FluidId, Issue, SectionDef, Side } from './types';

interface Props {
  data: AppData;
  date: string;
  setDate: (d: string) => void;
  editDay: (date: string, fn: (d: DayLog) => DayLog) => void;
  editStart: (date: string, fn: (b: Balances) => Balances) => void;
  onDelete: (date: string) => void;
  onPdf: (dates: string[]) => void;
  onPrint?: (dates: string[]) => void;
  ask: Ask;
}

interface ResetTarget { key: string; title: string; prev: number }

export default function DayScreen({ data, date, setDate, editDay, editStart, onDelete, onPdf, onPrint, ask }: Props) {
  const { settings, entries } = data;
  const saved = entries.find((e) => e.date === date);
  const day = saved ?? emptyDay(date, settings);
  const earlier = entries.filter((e) => e.date < date);
  const startDate = startDateOf(entries, settings);
  const isFirst = startDate ? date === startDate : true; // the start day: its Prev boxes hold the starting values
  const beforeStart = !!startDate && date < startDate;
  const lastBefore = earlier[earlier.length - 1];
  const typedHours = Object.values(day.cells).some((c) => c.today != null);
  const before = useMemo(() => balancesBefore(entries, settings, date), [entries, settings, date]);
  const calc = computeDay(day, before, sectionKeys(settings.sections));
  const [resetFor, setResetFor] = useState<ResetTarget | null>(null);

  const edit = (fn: (d: DayLog) => DayLog) => editDay(date, fn);
  const setField = <K extends keyof DayLog>(k: K, v: DayLog[K]) => edit((d) => ({ ...d, [k]: v }));
  const setFluid = (id: FluidId, patch: Partial<DayLog['fluids'][FluidId]>) =>
    edit((d) => ({ ...d, fluids: { ...d.fluids, [id]: { ...d.fluids[id], ...patch } } }));
  // A counter with no history yet (a line added after the start day) gets a box for its current reading.
  const newLine = (key: string) => settings.start.counters[key] === undefined && !earlier.some((e) => hasEntry(e, key));
  const setIssue = (i: number, patch: Partial<Issue>) =>
    edit((d) => ({ ...d, issues: d.issues.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const del = async () => {
    if (await ask(`Delete the whole log for ${niceDate(date)}? Later days will recalculate from the day before it.`, 'Delete day', true))
      onDelete(date);
  };

  return (
    <div className="screen">
      <div className="datebar card">
        <div className="daterow">
          <button className="secondary step" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
          <input id="log-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Log date" />
          <button className="secondary step" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">›</button>
        </div>
        <div className="small muted">
          {niceDate(date)} · {saved ? 'Saved. Changes save as you type.' : 'Nothing entered for this day yet.'}
          {date !== todayISO() && (
            <>
              {' '}
              <button className="link" onClick={() => setDate(todayISO())}>Go to today</button>
            </>
          )}
        </div>
        {!beforeStart && lastBefore && !typedHours && (
          <>
            <button id="copy-yesterday" onClick={() => editDay(date, (cur) => copyFrom(lastBefore, date, settings, cur))}>
              Start from {niceDate(lastBefore.date)}
            </button>
            <p className="small muted">Fills in that day's hours run, chief, draft &amp; tow and open issues. Anything you've already typed stays.</p>
          </>
        )}
        {isFirst && !beforeStart && (
          <p className="note-inline">
            <b>First day of the log.</b> In each <b>Prev</b> box type the <b>Total</b> from your last printed log before this date, and for
            Fuel, Lube and Water its <b>Ending Balance</b>. (Entering the printed day itself? Then copy its Prev and Beginning columns.)
            After this, every day starts from the day before.
          </p>
        )}
      </div>

      {beforeStart ? (
        <section className="card">
          <h2>Before the start of the log</h2>
          <p>
            Your log starts on <b>{niceDate(startDate!)}</b>. That day's Prev numbers are the starting point for every day after it, so
            earlier days can't be added here.
          </p>
          <button className="secondary" onClick={() => setDate(startDate!)}>Go to {niceDate(startDate!)}</button>
        </section>
      ) : (
      <>

      <section className="card">
        <label htmlFor="chief">
          Chief Engineer
          <input id="chief" value={day.chief} onChange={(e) => setField('chief', e.target.value)} autoComplete="off" />
        </label>
      </section>

      <section className="card">
        <h2>Fuel · Lube · Potable Water</h2>
        <p className="small muted">Type Used, or type the Ending balance from your soundings and Used works itself out.</p>
        {FLUIDS.map(({ id, label }) => {
          const c = calc.fluids[id];
          const f = day.fluids[id];
          return (
            <div key={id} className="fluid">
              <div className="fluid-head">
                <span className="fluid-name">{label}</span>
                <span className="small muted">
                  Beginning{' '}
                  {isFirst ? (
                    <NumField id={`begin-${id}`} className="inline" aria-label={`${label} beginning balance`} value={settings.start.fluids[id]} onChange={(v) => editStart(date, (b) => ({ ...b, fluids: { ...b.fluids, [id]: v ?? 0 } }))} />
                  ) : (
                    <b className="num">{fmt2(c.begin)}</b>
                  )}
                </span>
              </div>
              <div className="grid4">
                <label htmlFor={`${id}-used`}>
                  Used
                  <NumField id={`${id}-used`} value={f.ending != null ? c.used : f.used} onChange={(v) => setFluid(id, { used: v, ending: null })} placeholder="0" />
                </label>
                {(['purchased', 'transferred'] as const).map((k) => (
                  <label key={k} htmlFor={`${id}-${k}`}>
                    {k === 'transferred' ? 'Transferred off' : k}
                    <NumField id={`${id}-${k}`} value={f[k]} onChange={(v) => setFluid(id, { [k]: v })} placeholder="0" />
                  </label>
                ))}
                <label htmlFor={`${id}-end`} className="ending">
                  Ending{f.ending != null ? ' (sounded)' : ''}
                  <NumField id={`${id}-end`} value={c.end} onChange={(v) => setFluid(id, v == null ? { ending: null } : { ending: v, used: null })} />
                </label>
              </div>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>Draft &amp; tow</h2>
        <div className="grid2">
          <label htmlFor="draft-bow">Draft (Bow)<NumField id="draft-bow" value={day.draftBow} onChange={(v) => setField('draftBow', v)} /></label>
          <label htmlFor="draft-stern">Draft (Stern)<NumField id="draft-stern" value={day.draftStern} onChange={(v) => setField('draftStern', v)} /></label>
          <label htmlFor="loads">Load<NumField id="loads" value={day.loads} onChange={(v) => setField('loads', v)} /></label>
          <label htmlFor="empties">Empty<NumField id="empties" value={day.empties} onChange={(v) => setField('empties', v)} /></label>
          <label htmlFor="from">From<input id="from" value={day.from} onChange={(e) => setField('from', e.target.value)} autoComplete="off" /></label>
          <label htmlFor="to">To<input id="to" value={day.to} onChange={(e) => setField('to', e.target.value)} autoComplete="off" /></label>
        </div>
      </section>

      {sectionsForDay(settings.sections, day).map((sec) => (
        <Sheet
          key={`${date}-${sec.id}`}
          sec={sec}
          day={day}
          calc={calc.cells}
          isFirst={isFirst}
          newLine={newLine}
          start={settings.start}
          onToday={(key, v) => edit((d) => setToday(d, key, v))}
          onPrev={(key, v) => editStart(date, (b) => ({ ...b, counters: { ...b.counters, [key]: v ?? 0 } }))}
          onStartValue={(key, v) => edit((d) => setStartValue(d, key, v))}
          onFill={(side, hrs) => edit((d) => fillHours(d, sec, side, hrs))}
          onReset={setResetFor}
        />
      ))}

      <section className="card">
        <h2>Comments</h2>
        <textarea id="comments" rows={7} value={day.comments} onChange={(e) => setField('comments', e.target.value)} placeholder="GAR/SAFE: LOW/GREEN. BEGINNING OF WATCH WALKTHROUGH." aria-label="Comments" />
        <h3>Issues</h3>
        {day.issues.length === 0 && <p className="small muted">No issues listed.</p>}
        {day.issues.map((x, i) => (
          <div key={i} className="issue">
            <div className="grid2">
              <label htmlFor={`issue-cat-${i}`}>Category<input id={`issue-cat-${i}`} value={x.category} onChange={(e) => setIssue(i, { category: e.target.value })} /></label>
              <div className="grid2 tight">
                <label htmlFor={`issue-res-${i}`}>Resolved?
                  <select id={`issue-res-${i}`} value={x.resolved} onChange={(e) => setIssue(i, { resolved: e.target.value as Issue['resolved'] })}>
                    <option value="" /> <option>Yes</option> <option>No</option>
                  </select>
                </label>
                <label htmlFor={`issue-pe-${i}`}>Port Eng. notified
                  <select id={`issue-pe-${i}`} value={x.notified} onChange={(e) => setIssue(i, { notified: e.target.value as Issue['notified'] })}>
                    <option value="" /> <option>Yes</option> <option>No</option>
                  </select>
                </label>
              </div>
            </div>
            <label htmlFor={`issue-com-${i}`}>Comment<textarea id={`issue-com-${i}`} rows={2} value={x.comment} onChange={(e) => setIssue(i, { comment: e.target.value })} /></label>
            <button className="link danger-text" onClick={async () => (await ask('Remove this issue?', 'Remove', true)) && edit((d) => ({ ...d, issues: d.issues.filter((_, j) => j !== i) }))}>
              Remove issue
            </button>
          </div>
        ))}
        <button id="add-issue" className="secondary" onClick={() => edit((d) => ({ ...d, issues: [...d.issues, { category: '', comment: '', resolved: '', notified: '' }] }))}>
          + Add issue
        </button>
      </section>

      {onPrint && (
        <button id="print-day" className="big" onClick={() => onPrint([date])} disabled={!saved}>
          Print this day
        </button>
      )}
      <button id="pdf-day" className={onPrint ? 'secondary' : 'big'} onClick={() => onPdf([date])} disabled={!saved}>
        {onPrint ? 'Save as PDF' : 'Save printable PDF of this day'}
      </button>
      {saved && <button id="delete-day" className="danger" onClick={del}>Delete this day</button>}
      </>
      )}

      {resetFor && (
        <ResetDialog
          target={resetFor}
          current={day.cells[resetFor.key]?.reset}
          onCancel={() => setResetFor(null)}
          onSave={(reset) => {
            edit((d) => setReset(d, resetFor.key, reset));
            setResetFor(null);
          }}
        />
      )}
    </div>
  );
}

interface SheetProps {
  sec: SectionDef;
  day: DayLog;
  calc: ReturnType<typeof computeDay>['cells'];
  isFirst: boolean;
  newLine: (key: string) => boolean;
  start: Balances;
  onToday: (key: string, v: number | null) => void;
  onPrev: (key: string, v: number | null) => void;
  onStartValue: (key: string, v: number | null) => void;
  onFill: (side: Side, hrs: number) => void;
  onReset: (t: ResetTarget) => void;
}

/** One equipment sheet (Main Engines, Gear Boxes, ...): Prev + Today = Total for each line and side. */
function Sheet({ sec, day, calc, isFirst, newLine, start, onToday, onPrev, onStartValue, onFill, onReset }: SheetProps) {
  const sides = sidesOf(sec);
  const [ran, setRan] = useState<Record<string, string>>({});
  const fill = () => {
    for (const side of sides) {
      const n = parseNum(ran[side] ?? '');
      if (n != null) onFill(side, n);
    }
    setRan({});
  };
  return (
    <section className="card sheet">
      <h2>{sec.title}</h2>
      {sec.rows.some((r) => r.kind === 'hours') && (
      <div className="fillbar">
        {sides.map((side) => (
          <label key={side} htmlFor={`ran-${sec.id}-${side}`}>
            {side === 'one' ? 'Ran' : `${SIDE_LABEL[side]} ran`}
            <input id={`ran-${sec.id}-${side}`} inputMode="decimal" placeholder="hrs" value={ran[side] ?? ''} onChange={(e) => setRan({ ...ran, [side]: e.target.value })} autoComplete="off" />
          </label>
        ))}
        <button className="secondary" onClick={fill} disabled={!sides.some((s) => parseNum(ran[s] ?? '') != null)}>
          Fill hours
        </button>
      </div>
      )}
      <div className={`sidehead ${sec.sided ? 'two' : 'one'}`}>
        <span />
        {sides.map((s) => <span key={s}>{s === 'one' ? '' : SIDE_LABEL[s]}</span>)}
      </div>
      {sec.rows.map((r) => (
        <div key={r.id} className={`crow ${sec.sided ? 'two' : 'one'}`}>
          <div className="clabel">{r.label}</div>
          {sides.map((side) => {
            const key = cellKey(sec.id, r.id, side);
            const c = calc[key] ?? { prev: 0, today: 0, total: 0 };
            const cell = day.cells[key];
            const where = `${sec.title}${side === 'one' ? '' : ` ${SIDE_LABEL[side]}`} · ${r.label}`;
            return (
              <div key={side} className="ccell">
                <div className="prev">
                  {cell?.reset ? (
                    <span className="reset-tag">Reset {fmt2(cell.reset.to)}</span>
                  ) : isFirst ? (
                    <NumField id={`prev-${key}`} className="inline" aria-label={`${where} prev`} value={start.counters[key] ?? null} onChange={(v) => onPrev(key, v)} placeholder="Prev" />
                  ) : newLine(key) ? (
                    <NumField id={`prev-${key}`} className="inline" aria-label={`${where} current reading`} value={cell?.start ?? null} onChange={(v) => onStartValue(key, v)} placeholder="Current" />
                  ) : (
                    <span className="num">{fmt2(c.prev)}</span>
                  )}
                  <span className="muted"> +</span>
                </div>
                <NumField id={`today-${key}`} aria-label={`${where} today`} value={cell?.today ?? null} onChange={(v) => onToday(key, v)} placeholder="0" />
                <div className="total">
                  <b className="num">= {fmt2(c.total)}</b>
                  <button className="link small" onClick={() => onReset({ key, title: where, prev: c.prev })}>
                    {cell?.reset ? 'Edit reset' : 'Reset'}
                  </button>
                </div>
                {cell?.reset?.note && <div className="reset-note">{cell.reset.note}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function ResetDialog({ target, current, onCancel, onSave }: {
  target: ResetTarget;
  current?: { to: number; note: string };
  onCancel: () => void;
  onSave: (r: { to: number; note: string } | undefined) => void;
}) {
  const [to, setTo] = useState(fmtIn(current?.to ?? 0));
  const [note, setNote] = useState(current?.note ?? '');
  const n = parseNum(to);
  return (
    <Modal labelledBy="reset-title">
      <h2 id="reset-title">Reset counter</h2>
      <p className="small">{target.title}</p>
      <p className="small muted">For a filter change, overhaul or oil sample: the count starts again from this number today, and the note prints in Reset Comments.</p>
      <label htmlFor="reset-to">Start from<input id="reset-to" inputMode="decimal" value={to} onChange={(e) => setTo(e.target.value)} autoFocus /></label>
      <label htmlFor="reset-note">Reset comment<input id="reset-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Changed fuel filters" /></label>
      <div className="actions end">
        {current && <button className="secondary" onClick={() => onSave(undefined)}>Remove reset</button>}
        <button className="secondary" onClick={onCancel}>Cancel</button>
        <button id="reset-save" onClick={() => onSave({ to: n ?? 0, note: note.trim() })} disabled={n === undefined}>Reset</button>
      </div>
    </Modal>
  );
}
