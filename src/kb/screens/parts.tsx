// Small pieces shared by the screens.
import { boatName, statusWord, type Corpus, type Doc } from '../corpus';
import { docHref } from '../Md';

export function StatusPill({ status }: { status?: string }) {
  const w = statusWord(status);
  return <span className={`pill pill-${w.toLowerCase()}`}>{w}</span>;
}

export function DocRow({ c, d, snippet, showBoat = true }: { c: Corpus; d: Doc; snippet?: string; showBoat?: boolean }) {
  return (
    <a className="docrow" href={docHref(d.path)}>
      <span className="docrow-top">
        {d.type === 'issue' && <StatusPill status={d.status} />}
        <span className="docrow-title">{d.title}</span>
      </span>
      <span className="docrow-meta">
        {showBoat && d.boat && <span className="chip">{boatName(c, d.boat)}</span>}
        {d.date && <span>{d.date}</span>}
        {d.system && <span>{d.system}</span>}
      </span>
      {snippet && <span className="docrow-snip">{snippet}</span>}
    </a>
  );
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const nowStamp = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
