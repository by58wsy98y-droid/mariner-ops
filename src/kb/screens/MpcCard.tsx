// A maintenance procedure card, laid out like the company's paper card: the header cells, the black
// "Maintenance Procedure Card" bar, Step 1 (parts, tools, safety) and the numbered tasks of Step 2.
// The file itself is plain markdown: "## Step …" for each step, "### Parts required" etc. for the boxes,
// and "### 1. Gather Tools" for each task.
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

export default function MpcCard({ c, doc }: { c: Corpus; doc: Doc }) {
  const f = (k: string) => fmText(doc.fm[k]).trim();
  const blocks = doc.blocks.filter((b) => !(b.t === 'h' && b.level === 1));
  const steps = splitAt(blocks, 2);
  const cell = (label: string, value: string, cls = '') => value && <div className={`mpc-cell ${cls}`}><span className="mpc-label">{label}</span><b>{value}</b></div>;

  return (
    <div className="mpc">
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
                  <div key={j} className="mpc-task">
                    <div className="mpc-task-head">
                      <span className="mpc-num">{task[1]}</span>
                      <span className="box" aria-hidden>☐</span>
                      <b>{task[2]}</b>
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
  );
}
