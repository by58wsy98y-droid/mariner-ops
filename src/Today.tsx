import { useEffect, useMemo, useState } from 'react';
import { computeDay, fmtGal, parseGal, parseSounding, previousBalances, tankLayout } from './calc';
import type { AppData } from './storage';
import type { Balances, DayEntry, Side, TankReading } from './types';

interface Props {
  data: AppData;
  date: string;
  setDate: (d: string) => void;
  onSave: (e: DayEntry, start?: Balances) => void;
  onDelete: (date: string) => void;
}

interface TankRow { tankId: string; label: string; side: Side; isDayTank: boolean; sounding: string; gallons: string }
type Num = 'fuelReceived' | 'lubeReceived' | 'lubeUsed' | 'waterReceived' | 'waterUsed';
const NUMS: Num[] = ['fuelReceived', 'lubeReceived', 'lubeUsed', 'waterReceived', 'waterUsed'];

export default function Today({ data, date, setDate, onSave, onDelete }: Props) {
  const { settings, entries } = data;
  const existing = entries.find((e) => e.date === date);
  const isFirst = !entries.some((e) => e.date < date);

  const [rows, setRows] = useState<TankRow[]>([]);
  const [nums, setNums] = useState<Record<Num, string>>({} as Record<Num, string>);
  const [startForm, setStartForm] = useState({ fuel: '', lube: '', water: '' });
  const [saved, setSaved] = useState(false);

  // Load the form whenever the date (or saved data) changes.
  useEffect(() => {
    const layout = tankLayout(settings);
    const r: TankRow[] = layout.map((t) => {
      const old = existing?.tanks.find((x) => x.tankId === t.id);
      return { tankId: t.id, label: t.label, side: t.side, isDayTank: t.isDayTank, sounding: old?.sounding ?? '', gallons: old?.gallons != null ? fmtGal(old.gallons) : '' };
    });
    // Keep readings for tanks that were removed from the layout since this day was entered.
    existing?.tanks.filter((x) => !layout.some((t) => t.id === x.tankId)).forEach((x) =>
      r.push({ tankId: x.tankId, label: x.label, side: x.side, isDayTank: false, sounding: x.sounding, gallons: fmtGal(x.gallons) })
    );
    setRows(r);
    setNums(Object.fromEntries(NUMS.map((k) => [k, existing && existing[k] ? fmtGal(existing[k]) : ''])) as Record<Num, string>);
    const st = settings.start;
    setStartForm({ fuel: st ? fmtGal(st.fuel) : '', lube: st ? fmtGal(st.lube) : '', water: st ? fmtGal(st.water) : '' });
  }, [date, data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setSaved(false), [date]);

  const entry: DayEntry = useMemo(() => ({
    date,
    tanks: rows.map<TankReading>((r) => ({ tankId: r.tankId, label: r.label, side: r.side, sounding: r.sounding.trim(), gallons: parseGal(r.gallons) })),
    ...(Object.fromEntries(NUMS.map((k) => [k, parseGal(nums[k] ?? '') ?? 0])) as Record<Num, number>),
  }), [rows, nums, date]);

  const startBal: Balances = { fuel: parseGal(startForm.fuel) ?? 0, lube: parseGal(startForm.lube) ?? 0, water: parseGal(startForm.water) ?? 0 };
  const prev = isFirst ? startBal : previousBalances(entries, settings.start ?? startBal, date);
  const result = computeDay(entry, prev);

  const setRow = (i: number, field: 'sounding' | 'gallons', v: string) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [field]: v } : r)));
    setSaved(false);
  };
  const setNum = (k: Num, v: string) => { setNums((n) => ({ ...n, [k]: v })); setSaved(false); };

  const badSoundings = rows.filter((r) => r.sounding.trim() && parseSounding(r.sounding) == null);

  const save = () => {
    if (isFirst && (!startForm.fuel.trim() || !startForm.lube.trim() || !startForm.water.trim())) {
      alert('Enter the starting balances (fuel, lube oil, water on hand) first.');
      return;
    }
    if (badSoundings.length && !confirm(`Sounding not understood for ${badSoundings.map((r) => r.side + ' ' + r.label).join(', ')}. Save anyway?`)) return;
    onSave(entry, isFirst ? startBal : undefined);
    setSaved(true);
  };

  const sideRows = (side: Side) => rows.map((r, i) => ({ r, i })).filter(({ r }) => r.side === side);

  return (
    <div className="today">
      <label className="date">
        Date
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <div className="small muted">{existing ? 'Editing saved entry for this day.' : 'New entry.'}</div>

      {isFirst && (
        <section className="card start">
          <h2>Starting balances</h2>
          <p className="small">First entry: what was on hand before this day.</p>
          <div className="grid3">
            {(['fuel', 'lube', 'water'] as const).map((k) => (
              <label key={k}>
                {k === 'fuel' ? 'Fuel' : k === 'lube' ? 'Lube oil' : 'Water'}
                <input inputMode="numeric" value={startForm[k]} onChange={(e) => setStartForm({ ...startForm, [k]: e.target.value })} />
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Tanks</h2>
        <div className="sides">
          {(['PORT', 'STBD'] as Side[]).map((side) => (
            <div key={side} className="side">
              <div className="sidehead"><span>{side}</span><span>Sounding <small>(9'4 or in.)</small></span><span>Gallons</span></div>
              {sideRows(side).map(({ r, i }) => (
                <div key={r.tankId} className="tank">
                  <span className="tlabel">{r.label}</span>
                  <input
                    className={r.sounding.trim() && parseSounding(r.sounding) == null ? 'bad' : ''}
                    autoCapitalize="off"
                    value={r.sounding}
                    onChange={(e) => setRow(i, 'sounding', e.target.value)}
                  />
                  <input inputMode="numeric" value={r.gallons} onChange={(e) => setRow(i, 'gallons', e.target.value)} onBlur={(e) => setRow(i, 'gallons', fmtGal(parseGal(e.target.value)))} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="total">TOTAL <b>{fmtGal(result.fuel.onHand)}</b> gal</div>
      </section>

      <section className="card">
        <h2>Fuel report</h2>
        <Report rows={[['Previous', result.fuel.previous], ['Received', null, 'fuelReceived'], ['Total', result.fuel.total], ['On hand', result.fuel.onHand], ['Used', result.fuel.used]]} nums={nums} setNum={setNum} />
        {result.fuel.used < 0 && (
          <div className="warn">USED is negative ({fmtGal(result.fuel.used)}). Did you forget to enter fuel received?</div>
        )}
      </section>

      <section className="card">
        <h2>Lube oil</h2>
        <Report rows={[['Previous', result.lube.previous], ['Received', null, 'lubeReceived'], ['Total', result.lube.total], ['On hand', result.lube.onHand], ['Used', null, 'lubeUsed']]} nums={nums} setNum={setNum} />
      </section>

      <section className="card">
        <h2>Water</h2>
        <Report rows={[['Previous', result.water.previous], ['Received', null, 'waterReceived'], ['Total', result.water.total], ['On hand', result.water.onHand], ['Used', null, 'waterUsed']]} nums={nums} setNum={setNum} />
      </section>

      <button className="save" onClick={save}>{saved ? 'Saved ✓' : existing ? 'Save changes' : 'Save day'}</button>
      {existing && (
        <button className="danger" onClick={() => confirm(`Delete the entry for ${date}? Later days will recalculate.`) && onDelete(date)}>
          Delete this day
        </button>
      )}
    </div>
  );
}

function Report({ rows, nums, setNum }: { rows: [string, number | null, Num?][]; nums: Record<Num, string>; setNum: (k: Num, v: string) => void }) {
  return (
    <div className="report">
      {rows.map(([label, value, input]) => (
        <div key={label} className="rrow">
          <span>{label.toUpperCase()}</span>
          {input ? (
            <input inputMode="numeric" placeholder="0" value={nums[input] ?? ''} onChange={(e) => setNum(input, e.target.value)} onBlur={(e) => setNum(input, fmtGal(parseGal(e.target.value)))} />
          ) : (
            <b className={value != null && value < 0 ? 'neg' : ''}>{fmtGal(value)}</b>
          )}
        </div>
      ))}
    </div>
  );
}
