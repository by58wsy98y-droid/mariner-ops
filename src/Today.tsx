import { useEffect, useMemo, useState } from 'react';
import { computeDay, fmtGal, parseGal, parseSounding, previousBalances, tankLayout } from './calc';
import { draftDates, readDraft, writeDraft, type AppData, type Draft } from './storage';
import type { Ask } from './Confirm';
import type { Balances, DayEntry, Settings, Side, TankReading } from './types';

interface Props {
  data: AppData;
  date: string;
  setDate: (d: string) => void;
  onSave: (e: DayEntry, start?: Balances) => void;
  onDelete: (date: string) => void;
  ask: Ask;
}

interface TankRow { tankId: string; label: string; side: Side; sounding: string; gallons: string }
type Num = 'fuelReceived' | 'lubeReceived' | 'lubeUsed' | 'waterReceived' | 'waterUsed';
const NUMS: Num[] = ['fuelReceived', 'lubeReceived', 'lubeUsed', 'waterReceived', 'waterUsed'];
type StartForm = { fuel: string; lube: string; water: string };

interface Form {
  date: string;
  rows: TankRow[];
  nums: Record<Num, string>;
  start: StartForm;
  dirty: boolean; // typed since last load/save
  restored: boolean; // came back from an unsaved draft
}

export const niceDate = (d: string) =>
  new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

function buildForm(date: string, settings: Settings, existing: DayEntry | undefined, draft: Draft | null): Form {
  const layout = tankLayout(settings);
  const rows: TankRow[] = layout.map((t) => {
    const old = existing?.tanks.find((x) => x.tankId === t.id);
    return { tankId: t.id, label: t.label, side: t.side, sounding: old?.sounding ?? '', gallons: old?.gallons != null ? fmtGal(old.gallons) : '' };
  });
  // Keep readings for tanks that were removed from the layout since this day was entered.
  existing?.tanks
    .filter((x) => !layout.some((t) => t.id === x.tankId))
    .forEach((x) => rows.push({ tankId: x.tankId, label: x.label, side: x.side, sounding: x.sounding, gallons: fmtGal(x.gallons) }));
  const nums = Object.fromEntries(NUMS.map((k) => [k, existing && existing[k] ? fmtGal(existing[k]) : ''])) as Record<Num, string>;
  const st = settings.start;
  const start = { fuel: st ? fmtGal(st.fuel) : '', lube: st ? fmtGal(st.lube) : '', water: st ? fmtGal(st.water) : '' };
  if (!draft) return { date, rows, nums, start, dirty: false, restored: false };
  return {
    date,
    rows: rows.map((r) => ({ ...r, ...draft.tanks[r.tankId] })),
    nums: { ...nums, ...draft.nums },
    start: { ...start, ...draft.start },
    dirty: true,
    restored: true,
  };
}

export default function Today({ data, date, setDate, onSave, onDelete, ask }: Props) {
  const { settings, entries } = data;
  const existing = entries.find((e) => e.date === date);
  const isFirst = !entries.some((e) => e.date < date);
  const loadKey = JSON.stringify([existing ?? null, settings.portLabels, settings.stbdLabels, settings.dayTanks, settings.start]);

  const [form, setForm] = useState<Form>(() => buildForm(date, settings, existing, readDraft(date)));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Reload when the day changes, or when the saved day/layout changes and nothing is being typed.
  useEffect(() => {
    setForm((f) => (f.date === date && f.dirty ? f : buildForm(date, settings, existing, readDraft(date))));
    if (form.date !== date) {
      setError('');
      setSaved(false);
    }
  }, [date, loadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep unsaved typing so a reload or a dropped page doesn't lose it.
  useEffect(() => {
    if (!form.dirty) return;
    writeDraft(form.date, {
      tanks: Object.fromEntries(form.rows.map((r) => [r.tankId, { sounding: r.sounding, gallons: r.gallons }])),
      nums: form.nums,
      start: form.start,
    });
  }, [form]);

  const entry: DayEntry = useMemo(
    () => ({
      date,
      tanks: form.rows.map<TankReading>((r) => ({ tankId: r.tankId, label: r.label, side: r.side, sounding: r.sounding.trim(), gallons: parseGal(r.gallons) })),
      ...(Object.fromEntries(NUMS.map((k) => [k, parseGal(form.nums[k] ?? '') ?? 0])) as Record<Num, number>),
    }),
    [form, date]
  );

  const startBal: Balances = { fuel: parseGal(form.start.fuel) ?? 0, lube: parseGal(form.start.lube) ?? 0, water: parseGal(form.start.water) ?? 0 };
  const prev = isFirst ? startBal : previousBalances(entries, settings.start ?? startBal, date);
  const result = computeDay(entry, prev);
  const otherDrafts = draftDates().filter((d) => d !== date);

  const edit = (fn: (f: Form) => Form) => {
    setForm((f) => ({ ...fn(f), dirty: true }));
    setSaved(false);
    setError('');
  };
  const setRow = (i: number, field: 'sounding' | 'gallons', v: string) =>
    edit((f) => ({ ...f, rows: f.rows.map((r, j) => (j === i ? { ...r, [field]: v } : r)) }));
  const setNum = (k: Num, v: string) => edit((f) => ({ ...f, nums: { ...f.nums, [k]: v } }));
  const setStart = (k: keyof StartForm, v: string) => edit((f) => ({ ...f, start: { ...f.start, [k]: v } }));
  // Tidy a gallons field on leaving it (adds the commas) without marking unchanged fields as edited.
  const tidy = (v: string, put: (v: string) => void) => {
    const t = fmtGal(parseGal(v));
    if (t !== v) put(t);
  };

  const badSoundings = form.rows.filter((r) => r.sounding.trim() && parseSounding(r.sounding) == null);

  const save = async () => {
    if (isFirst && (!form.start.fuel.trim() || !form.start.lube.trim() || !form.start.water.trim())) {
      setError('Enter the starting balances at the top (fuel, lube oil and water on hand) before saving the first day.');
      return;
    }
    if (badSoundings.length) {
      const which = badSoundings.map((r) => `${r.side} ${r.label}`).join(', ');
      if (!(await ask(`Can't read the sounding for ${which}. Save anyway?`, 'Save anyway'))) return;
    }
    onSave(entry, isFirst ? startBal : undefined);
    writeDraft(date, null);
    setForm((f) => ({ ...f, dirty: false, restored: false }));
    setSaved(true);
  };

  const discard = () => {
    writeDraft(date, null);
    setForm(buildForm(date, settings, existing, null));
  };

  const del = async () => {
    if (!(await ask(`Delete the entry for ${niceDate(date)}? Later days will recalculate.`, 'Delete day', true))) return;
    writeDraft(date, null);
    onDelete(date);
  };

  const sideRows = (side: Side) => form.rows.map((r, i) => ({ r, i })).filter(({ r }) => r.side === side);

  return (
    <div className="screen">
      <div className="datebar">
        <label htmlFor="entry-date">Date</label>
        <input id="entry-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <div className="small muted">{existing ? 'Editing the saved entry for this day.' : 'New entry.'}</div>
      </div>

      {otherDrafts.length > 0 && (
        <div className="banner note">
          <div>
            Unsaved entry for{' '}
            {otherDrafts.map((d, i) => (
              <span key={d}>
                {i > 0 && ', '}
                <button className="link" onClick={() => setDate(d)}>{niceDate(d)}</button>
              </span>
            ))}
          </div>
        </div>
      )}
      {form.restored && (
        <div className="banner note">
          <div>Restored what you typed earlier for this day. It isn't saved yet.</div>
          <button className="secondary" onClick={discard}>Discard</button>
        </div>
      )}

      {isFirst && (
        <section className="card">
          <h2>Starting balances</h2>
          <p className="small">First entry: what was on hand before this day.</p>
          <div className="grid3">
            {(['fuel', 'lube', 'water'] as const).map((k) => (
              <label key={k} htmlFor={`start-${k}`}>
                {k === 'fuel' ? 'Fuel' : k === 'lube' ? 'Lube oil' : 'Water'}
                <input id={`start-${k}`} inputMode="numeric" value={form.start[k]} onChange={(e) => setStart(k, e.target.value)} onBlur={(e) => tidy(e.target.value, (v) => setStart(k, v))} />
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Tanks</h2>
        <p className="small muted">Soundings as 9'4, 9' 4" or inches (112). Gallons from the tank tables.</p>
        <div className="sides">
          {(['PORT', 'STBD'] as Side[]).map((side) => (
            <div key={side} className="side">
              <div className="sidehead"><span>{side}</span><span>Sounding</span><span>Gallons</span></div>
              {sideRows(side).map(({ r, i }) => (
                <div key={r.tankId} className="tank">
                  <span className="tlabel">{r.label}</span>
                  <input
                    id={`snd-${r.tankId}`}
                    aria-label={`${side} ${r.label} sounding`}
                    className={r.sounding.trim() && parseSounding(r.sounding) == null ? 'bad' : ''}
                    autoCapitalize="off"
                    autoComplete="off"
                    value={r.sounding}
                    onChange={(e) => setRow(i, 'sounding', e.target.value)}
                  />
                  <input
                    id={`gal-${r.tankId}`}
                    aria-label={`${side} ${r.label} gallons`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={r.gallons}
                    onChange={(e) => setRow(i, 'gallons', e.target.value)}
                    onBlur={(e) => tidy(e.target.value, (v) => setRow(i, 'gallons', v))}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="total">Total <b>{fmtGal(result.fuel.onHand)} gal</b></div>
      </section>

      <section className="card">
        <h2>Fuel report</h2>
        <Report id="fuel" rows={[['Previous', result.fuel.previous], ['Received', null, 'fuelReceived'], ['Total', result.fuel.total], ['On hand', result.fuel.onHand], ['Used', result.fuel.used]]} nums={form.nums} setNum={setNum} tidy={tidy} />
        {result.fuel.used < 0 && (
          <div className="warn">USED is negative ({fmtGal(result.fuel.used)}). Did you forget to enter fuel received?</div>
        )}
      </section>

      <section className="card">
        <h2>Lube oil</h2>
        <Report id="lube" rows={[['Previous', result.lube.previous], ['Received', null, 'lubeReceived'], ['Total', result.lube.total], ['On hand', result.lube.onHand], ['Used', null, 'lubeUsed']]} nums={form.nums} setNum={setNum} tidy={tidy} />
      </section>

      <section className="card">
        <h2>Water</h2>
        <Report id="water" rows={[['Previous', result.water.previous], ['Received', null, 'waterReceived'], ['Total', result.water.total], ['On hand', result.water.onHand], ['Used', null, 'waterUsed']]} nums={form.nums} setNum={setNum} tidy={tidy} />
      </section>

      {error && <div className="warn" role="alert">{error}</div>}
      <button id="save-day" className="save" onClick={save}>
        {saved ? 'Saved ✓' : existing ? 'Save changes' : 'Save day'}
      </button>
      {existing && <button id="delete-day" className="danger" onClick={del}>Delete this day</button>}
    </div>
  );
}

interface ReportProps {
  id: string;
  rows: [string, number | null, Num?][];
  nums: Record<Num, string>;
  setNum: (k: Num, v: string) => void;
  tidy: (v: string, put: (v: string) => void) => void;
}

function Report({ id, rows, nums, setNum, tidy }: ReportProps) {
  return (
    <div className="report">
      {rows.map(([label, value, input]) => (
        <div key={label} className="rrow">
          {input ? <label htmlFor={`${id}-${input}`}>{label}</label> : <span>{label}</span>}
          {input ? (
            <input id={`${id}-${input}`} inputMode="numeric" placeholder="0" autoComplete="off" value={nums[input] ?? ''} onChange={(e) => setNum(input, e.target.value)} onBlur={(e) => tidy(e.target.value, (v) => setNum(input, v))} />
          ) : (
            <b className={value != null && value < 0 ? 'neg' : ''}>{fmtGal(value)}</b>
          )}
        </div>
      ))}
    </div>
  );
}
