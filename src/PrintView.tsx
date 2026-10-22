// The log laid out like the company's printed sheets, for the browser's own Print (own-site version).
// Hidden on screen; only shows when printing.
import { FLUIDS, cellKey, computeChain, fmt2, sectionsForDay, sidesOf, usDate } from './calc';
import type { AppData } from './storage';
import type { CellCalc } from './types';

const blank = (n: number | null | undefined) => (n == null ? '' : fmt2(n));
const resetText = (c?: CellCalc) => (c?.reset ? c.reset.note + (c.reset.to ? ` (from ${fmt2(c.reset.to)})` : '') : '');

export default function PrintView({ data, dates }: { data: AppData; dates: string[] }) {
  const { settings } = data;
  const calcs = new Map(computeChain(data.entries, settings).map((c) => [c.date, c]));
  const days = data.entries.filter((e) => dates.includes(e.date));
  return (
    <div className="print-only">
      {days.map((day) => {
        const calc = calcs.get(day.date)!;
        const when = usDate(day.date);
        return (
          <article key={day.date} className="pday">
            <header className="phead">
              <div className="ptitle">DAILY ENGINE MAINTENANCE</div>
              <div className="pboat">{settings.boatName}</div>
              <div>{when}</div>
            </header>
            <h3>Chief Engineer: {day.chief}</h3>
            <table className="pt">
              <thead><tr><th /><th>Beginning Balance</th><th>Used</th><th>Purchased</th><th>Transferred</th><th>Ending Balance</th></tr></thead>
              <tbody>
                {FLUIDS.map(({ id, label }) => {
                  const c = calc.fluids[id];
                  const f = day.fluids[id];
                  return (
                    <tr key={id}>
                      <th>{label}</th><td>{fmt2(c.begin)}</td><td>{f.ending != null ? fmt2(c.used) : blank(f.used)}</td>
                      <td>{blank(f.purchased)}</td><td>{blank(f.transferred)}</td><td>{fmt2(c.end)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <table className="pt pdraft">
              <tbody>
                <tr><th>Draft (Bow)</th><td>{blank(day.draftBow)}</td><th>Load</th><td>{blank(day.loads)}</td><th>From</th><td className="txt">{day.from}</td></tr>
                <tr><th>Draft (Stern)</th><td>{blank(day.draftStern)}</td><th>Empty</th><td>{blank(day.empties)}</td><th>To</th><td className="txt">{day.to}</td></tr>
              </tbody>
            </table>
            {sectionsForDay(settings.sections, day).map((sec) => {
              const sides = sidesOf(sec);
              return (
                <section key={sec.id} className="psheet">
                  <h3>{sec.title} <span className="pwhen">· {settings.boatName} · {when}</span></h3>
                  <table className="pt">
                    <thead>
                      {sec.sided ? (
                        <>
                          <tr><th rowSpan={2} className="plabel">Label</th><th colSpan={4}>Port</th><th colSpan={4}>Starboard</th></tr>
                          <tr>{sides.flatMap((s) => ['Reset Comments', 'Prev', 'Today', 'Total'].map((h) => <th key={s + h}>{h}</th>))}</tr>
                        </>
                      ) : (
                        <tr><th className="plabel">Label</th><th>Reset Comments</th><th>Prev</th><th>Today</th><th>Total</th></tr>
                      )}
                    </thead>
                    <tbody>
                      {sec.rows.map((r) => (
                        <tr key={r.id}>
                          <th className="plabel">{r.label}</th>
                          {sides.flatMap((side) => {
                            const c = calc.cells[cellKey(sec.id, r.id, side)];
                            return [
                              <td key={side + 'r'} className="txt">{resetText(c)}</td>,
                              <td key={side + 'p'}>{fmt2(c?.prev ?? 0)}</td>,
                              <td key={side + 't'}>{fmt2(c?.today ?? 0)}</td>,
                              <td key={side + 'o'}>{fmt2(c?.total ?? 0)}</td>,
                            ];
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
            <section className="psheet">
              <h3>Comments: <span className="pwhen">· {settings.boatName} · {when}</span></h3>
              <div className="pcomments">{day.comments}</div>
              <table className="pt pissues">
                <thead><tr><th>Category</th><th>Comment</th><th>Resolved?</th><th>Port Engineer Notified</th></tr></thead>
                <tbody>
                  {(day.issues.length ? day.issues : [{ category: '', comment: '', resolved: '', notified: '' }]).map((x, i) => (
                    <tr key={i}><td className="txt">{x.category}</td><td className="txt">{x.comment}</td><td className="c">{x.resolved}</td><td className="c">{x.notified}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          </article>
        );
      })}
    </div>
  );
}
