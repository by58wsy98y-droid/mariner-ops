// A maintenance procedure card, laid out like the company's paper card: the header cells, the black
// "Maintenance Procedure Card" bar, Step 1 (parts, tools, safety) and the numbered tasks of Step 2.
// The file itself is plain markdown: "## Step …" for each step, "### Parts required" etc. for the boxes,
// and "### 1. Gather Tools" for each task.
import { useEffect, useState } from 'react';
import type { Block } from '../markdown';
import type { Corpus, Doc } from '../corpus';
import { fmText } from '../frontmatter';
import Md from '../Md';

interface Part { head?: Block & { t: 'h' }; body: Block[] }

/** Cut the blocks at each heading of one level. */
function splitAt(blocks: Block[], level: number): Part[] {
  const out: Part[] = [];
  for (const b of blocks) {
    if (b.t === 'h' && b.level === level) out.push({ head: b, body: [] });
    else {
      if (!out.length) out.push({ body: [] }); // text before the first heading
      out[out.length - 1].body.push(b);
    }
  }
  return out;
}

const TASK = /^(\d+)[.)]\s+(.*)$/;

// Working through a card tick by tick: which tasks are ticked and when, kept on this device per card.
interface Run { on: boolean; ticked: Record<string, string> } // task number -> time ticked (ISO)
const runKey = (path: string) => `kb:card:${path}`;
function loadRun(path: string): Run {
  try { return { on: false, ticked: {}, ...JSON.parse(localStorage.getItem(runKey(path)) ?? '{}') }; } catch { return { on: false, ticked: {} }; }
}
function saveRun(path: string, r: Run) {
  try { r.on || Object.keys(r.ticked).length ? localStorage.setItem(runKey(path), JSON.stringify(r)) : localStorage.removeItem(runKey(path)); } catch { /* kept for this visit only */ }
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function MpcCard({ c, doc }: { c: Corpus; doc: Doc }) {
  const f = (k: string) => fmText(doc.fm[k]).trim();
  const blocks = doc.blocks.filter((b) => !(b.t === 'h' && b.level === 1));
  const steps = splitAt(blocks, 2);
  const cell = (label: string, value: string, cls = '') => value && <div className={`mpc-cell ${cls}`}><span className="mpc-label">{label}</span><b>{value}</b></div>;

  const tasks = steps.flatMap((s) => splitAt(s.body, 3)).map((p) => p.head && TASK.exec(p.head.text)?.[1]).filter((n): n is string => !!n);
  const [run, setRun] = useState<Run>(() => loadRun(doc.path));
  useEffect(() => saveRun(doc.path, run), [doc.path, run]);
  const done = tasks.filter((n) => run.ticked[n]).length;
  const next = tasks.find((n) => !run.ticked[n]);
  const tick = (n: string) => {
    const ticked = { ...run.ticked };
    if (ticked[n]) delete ticked[n];
    else ticked[n] = new Date().toISOString();
    setRun({ ...run, ticked });
    // bring the next open task up, just under the progress bar
    const after = tasks.find((t) => !ticked[t]);
    if (!ticked[n] || !after) return;
    requestAnimationFrame(() => document.getElementById(`task-${after}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const startOver = () => {
    if (done && !confirm('Clear the ticks and start this card again (e.g. for the next gear box)?')) return;
    setRun({ on: true, ticked: {} });
    requestAnimationFrame(() => document.getElementById(`task-${tasks[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <>
    {tasks.length > 0 && (run.on ? (
      <div className="mpc-run no-print" role="status">
        <div className="mpc-run-line">
          <b>{done === tasks.length ? `All ${tasks.length} steps done` : `${done} of ${tasks.length} done${next ? ` · next: step ${next}` : ''}`}</b>
          <span className="mpc-run-actions">
            <button className="secondary small-btn" onClick={startOver}>Start over</button>
            <button className="secondary small-btn" onClick={() => setRun({ ...run, on: false })}>Stop</button>
          </span>
        </div>
        <div className="mpc-progress" aria-hidden><span style={{ width: `${(100 * done) / tasks.length}%` }} /></div>
      </div>
    ) : (
      <div className="actions no-print">
        <button onClick={() => { setRun({ ...run, on: true }); if (next) requestAnimationFrame(() => document.getElementById(`task-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>
          {done ? `Carry on tick by tick (${done} of ${tasks.length} done)` : 'Follow tick by tick'}
        </button>
      </div>
    ))}
    <div className={`mpc${run.on ? ' following' : ''}`}>
      <div className="mpc-head">
        {cell('Procedure title', doc.title, 'mpc-title')}
        {cell('MPC code', f('mpc_code'))}
        {cell('Frequency', f('frequency'))}
        {cell('Department / category', f('department'))}
        {cell('Revision date', f('revision_date'))}
        {cell('Applicable vessels / units', f('applies_to'), 'wide')}
      </div>
      <div className="mpc-banner">Maintenance procedure card</div>
      {steps.map((step, i) => (
        <section key={i} className="mpc-step">
          {step.head && <div className="mpc-bar">{step.head.text}</div>}
          <div className={`mpc-parts${splitAt(step.body, 3).some((p) => p.head && !TASK.test(p.head.text)) ? ' has-boxes' : ''}`}>
            {splitAt(step.body, 3).map((part, j) => {
              const task = part.head && TASK.exec(part.head.text);
              if (task)
                return (
                  <div key={j} id={`task-${task[1]}`} className={`mpc-task${run.ticked[task[1]] ? ' done' : ''}${run.on && task[1] === next ? ' current' : ''}`}>
                    <div className="mpc-task-head">
                      <span className="mpc-num">{task[1]}</span>
                      {run.on ? (
                        <button className="mpc-tick" role="checkbox" aria-checked={!!run.ticked[task[1]]} aria-label={`Step ${task[1]}: ${task[2]}`} onClick={() => tick(task[1])}>
                          {run.ticked[task[1]] ? '☑' : '☐'}
                        </button>
                      ) : (
                        <span className="box" aria-hidden>{run.ticked[task[1]] ? '☑' : '☐'}</span>
                      )}
                      <b>{task[2]}</b>
                      {run.ticked[task[1]] && <span className="mpc-when">{clock(run.ticked[task[1]])}</span>}
                    </div>
                    {part.body.length > 0 && <div className="mpc-task-body"><Md c={c} from={doc.path} blocks={part.body} /></div>}
                  </div>
                );
              if (!part.head) return part.body.length ? <div key={j} className="mpc-free"><Md c={c} from={doc.path} blocks={part.body} /></div> : null;
              return (
                <div key={j} className={`mpc-box${/safety|caution|warning/i.test(part.head.text) ? ' mpc-safety' : ''}`}>
                  <span className="mpc-label">{part.head.text}</span>
                  <Md c={c} from={doc.path} blocks={part.body} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
    </>
  );
}
