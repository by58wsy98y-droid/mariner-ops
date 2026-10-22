import { useState } from 'react';
import { cellKey, fmt2, niceDate } from './calc';
import type { AppData } from './storage';
import type { DayCalc } from './types';

interface Props {
  data: AppData;
  chain: DayCalc[];
  onOpen: (date: string) => void;
  onPdf: (dates: string[]) => void;
  onPrint?: (dates: string[]) => void;
}

export default function History({ data, chain, onOpen, onPdf, onPrint }: Props) {
  const dates = data.entries.map((e) => e.date);
  // Blank until picked, so the range always covers days that arrive later (from the other device).
  const [pickedFrom, setFrom] = useState('');
  const [pickedTo, setTo] = useState('');
  const from = pickedFrom || dates[0] || '';
  const to = pickedTo || dates[dates.length - 1] || '';
  const inRange = dates.filter((d) => d >= from && d <= to);
  const hasMain = data.settings.sections.some((s) => s.id === 'main' && s.rows.some((r) => r.id === 'totalHours'));

  if (!chain.length)
    return (
      <section className="card">
        <h2>History</h2>
        <p>No days saved yet. Each day you fill in on the Day screen shows up here, newest first.</p>
      </section>
    );

  const months = new Map<string, DayCalc[]>();
  for (const c of [...chain].reverse()) months.set(c.date.slice(0, 7), [...(months.get(c.date.slice(0, 7)) ?? []), c]);
  const monthName = (m: string) =>
    new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="screen">
      <section className="card">
        <h2>Print several days</h2>
        <p className="small muted">Each day starts on a new page. Handy for re-entering into the company site or for the file.</p>
        <div className="grid2">
          <label htmlFor="pdf-from">From<input id="pdf-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label htmlFor="pdf-to">To<input id="pdf-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="actions">
          {onPrint && (
            <button id="print-range" onClick={() => onPrint(inRange)} disabled={!inRange.length}>
              Print {inRange.length} day{inRange.length === 1 ? '' : 's'}
            </button>
          )}
          <button id="pdf-range" className={onPrint ? 'secondary' : ''} onClick={() => onPdf(inRange)} disabled={!inRange.length}>
            Save PDF of {inRange.length} day{inRange.length === 1 ? '' : 's'}
          </button>
        </div>
      </section>

      {[...months].map(([m, days]) => (
        <section key={m} className="card">
          <h2>{monthName(m)}</h2>
          <div className="tablewrap">
            <table className="history">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Fuel end</th>
                  <th>Water end</th>
                  {hasMain && <th>Main P / S hrs</th>}
                </tr>
              </thead>
              <tbody>
                {days.map((c) => (
                  <tr key={c.date} onClick={() => onOpen(c.date)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(c.date)}>
                    <td>{niceDate(c.date).replace(/, \d{4}$/, '')}</td>
                    <td>{fmt2(c.fluids.fuel.end)}</td>
                    <td>{fmt2(c.fluids.water.end)}</td>
                    {hasMain && (
                      <td>
                        {fmt2(c.cells[cellKey('main', 'totalHours', 'port')]?.total)} / {fmt2(c.cells[cellKey('main', 'totalHours', 'stbd')]?.total)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="small muted">Tap a day to open it. Changing an earlier day updates every day after it.</p>
    </div>
  );
}
