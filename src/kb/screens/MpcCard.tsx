// A maintenance procedure card, laid out like the company's paper card: the header cells, the black
// "Maintenance Procedure Card" bar, Step 1 (parts, tools, safety) and the numbered tasks of Step 2.
// The file itself is plain markdown: "## Step …" for each step, "### Parts required" etc. for the boxes,
// and "### 1. Gather Tools" for each task.
import { useEffect, useState } from 'react';
import { inlineText, type Block } from '../markdown';
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
// Printing: a short step is kept whole on one page. A long one (or one with pictures) runs on across pages,
// with its title held to its first paragraph so a title never sits alone at the bottom of a page.
const hasPics = (blocks: Block[]) => blocks.some((b) => b.t === 'p' && b.c.some((x) => x.t === 'img'));
const textLength = (blocks: Block[]) => blocks.reduce((n, b) =>
  n + (b.t === 'p' || b.t === 'quote' || b.t === 'h' ? inlineText(b.c).length : b.t === 'list' ? b.items.reduce((m, it) => m + inlineText(it).length, 0)
    : b.t === 'table' ? [b.head, ...b.rows].flat().reduce((m, cell) => m + inlineText(cell).length, 0) : b.t === 'code' ? b.v.length : 0), 0);
const flows = (blocks: Block[]) => hasPics(blocks) || textLength(blocks) > 900;

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
    setArmed(false);
    if (!ticked[n]) return;
    // bring the next open task up, just under the progress bar (or the Done button after the last one)
    const after = tasks.find((t) => !ticked[t]);
    requestAnimationFrame(() => document.getElementById(after ? `task-${after}` : 'mpc-done')?.scrollIntoView({ behavior: 'smooth', block: after ? 'start' : 'center' }));
  };
  // Done: the card is finished; the ticks clear so it starts fresh next time (e.g. the next gear box).
  // With steps left unticked, the first tap says which and the second tap finishes anyway (no pop-up).
  const [armed, setArmed] = useState(false);
  const [finished, setFinished] = useState('');
  const open = tasks.filter((n) => !run.ticked[n]);
  const finish = () => {
    if (open.length && !armed) { setArmed(true); return; }
    const at = clock(new Date().toISOString());
    setFinished(open.length ? `Finished at ${at}, with step${open.length > 1 ? 's' : ''} ${open.join(', ')} not ticked.` : `Finished at ${at}: all ${tasks.length} steps ticked.`);
    setArmed(false);
    setRun({ on: false, ticked: {} });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  return (
    <>
    {tasks.length > 0 && (run.on ? (
      <div className="mpc-run no-print" role="status">
        <div className="mpc-run-line">
          <b>{done === tasks.length ? `All ${tasks.length} steps done` : `${done} of ${tasks.length} done${next ? ` · next: step ${next}` : ''}`}</b>
          <span className="mpc-run-actions">
            <button className="secondary small-btn" onClick={() => setRun({ ...run, on: false })}>Stop</button>
          </span>
        </div>
        <div className="mpc-progress" aria-hidden><span style={{ width: `${(100 * done) / tasks.length}%` }} /></div>
      </div>
    ) : (
      <div className="actions no-print">
        {finished && <p className="small" role="status">{finished}</p>}
        <button onClick={() => { setFinished(''); setRun({ ...run, on: true }); if (next) requestAnimationFrame(() => document.getElementById(`task-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>
          {done ? `Carry on tick by tick (${done} of ${tasks.length} done)` : 'Follow tick by tick'}
        </button>
      </div>
    ))}
    <div className={`mpc${run.on ? ' following' : ''}`}>
      <div className="mpc-head">
        {cell('Procedure title', doc.title, 'mpc-title')}
        {cell(f('code_label') || 'MPC code', f('mpc_code'))}
        {cell('Frequency', f('frequency'))}
        {cell('Department / category', f('department'))}
        {cell('Revision date', f('revision_date'))}
        {cell('Applicable vessels / units', f('applies_to'), 'wide')}
      </div>
      <div className="mpc-banner">{f('card') || 'Maintenance procedure card'}</div>
      {steps.map((step, i) => (
        <section key={i} className="mpc-step">
          {step.head && <div className="mpc-bar">{step.head.text}</div>}
          <div className={`mpc-parts${splitAt(step.body, 3).some((p) => p.head && !TASK.test(p.head.text)) ? ' has-boxes' : ''}`}>
            {splitAt(step.body, 3).map((part, j) => {
              const task = part.head && TASK.exec(part.head.text);
              if (task)
                return (
                  <div key={j} id={`task-${task[1]}`} className={`mpc-task${flows(part.body) ? ' flows' : ''}${run.ticked[task[1]] ? ' done' : ''}${run.on && task[1] === next ? ' current' : ''}`}>
                    <div className="mpc-keep">
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
                    {flows(part.body) && part.body.length > 0 && <div className="mpc-task-body first"><Md c={c} from={doc.path} blocks={part.body.slice(0, 1)} /></div>}
                    </div>
                    {part.body.length > (flows(part.body) ? 1 : 0) && (
                      <div className={`mpc-task-body${flows(part.body) ? ' rest' : ''}`}><Md c={c} from={doc.path} blocks={flows(part.body) ? part.body.slice(1) : part.body} /></div>
                    )}
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
      {(f('revision') || f('marking')) && (
        <div className="mpc-foot"><span>{[f('mpc_code'), f('revision')].filter(Boolean).join(' ')}</span><span>{f('marking')}</span></div>
      )}
    </div>
    {run.on && tasks.length > 0 && (
      <div className="mpc-finish no-print">
        {armed && <p className="warnbox">Step{open.length > 1 ? 's' : ''} {open.join(', ')} {open.length > 1 ? "aren't" : "isn't"} ticked. Tap Done again to finish anyway.</p>}
        <button id="mpc-done" className="big" onClick={finish}>{armed ? 'Done anyway' : 'Done'}</button>
      </div>
    )}
    </>
  );
}
