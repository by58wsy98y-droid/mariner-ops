import { fmtGal } from './calc';
import type { DayResult } from './types';

export default function Log({ chain, onOpen }: { chain: DayResult[]; onOpen: (date: string) => void }) {
  if (!chain.length) return <p className="muted">No entries yet. Save your first day on the Entry screen.</p>;

  // Newest month first; days in order within the month, like the spreadsheet.
  const months = new Map<string, DayResult[]>();
  for (const r of chain) {
    const m = r.date.slice(0, 7);
    months.set(m, [...(months.get(m) ?? []), r]);
  }
  const monthName = (m: string) =>
    new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="log">
      {[...months.entries()].reverse().map(([m, days]) => (
        <section key={m} className="card">
          <h2>{monthName(m)}</h2>
          <table>
            <thead>
              <tr><th>Day</th><th>On hand</th><th>Rec'd</th><th>Used</th><th>Lube</th><th>Water</th></tr>
            </thead>
            <tbody>
              {days.map((r) => (
                <tr key={r.date} onClick={() => onOpen(r.date)}>
                  <td>{Number(r.date.slice(8))}</td>
                  <td>{fmtGal(r.fuel.onHand)}</td>
                  <td>{r.fuel.received ? fmtGal(r.fuel.received) : ''}</td>
                  <td className={r.fuel.used < 0 ? 'neg' : ''}>{fmtGal(r.fuel.used)}</td>
                  <td>{fmtGal(r.lube.onHand)}</td>
                  <td>{fmtGal(r.water.onHand)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="small muted">Tap a day to view or edit it. Later days recalculate automatically.</p>
    </div>
  );
}
