// Small pieces shared by the screens.
import { boatName, isCard, procedureFolder, statusWord, type Corpus, type Doc } from '../corpus';
import { folderPath, modelOf } from '../fleet';
import { fmText } from '../frontmatter';
import { docHref } from '../Md';

export function StatusPill({ status }: { status?: string }) {
  const w = statusWord(status);
  return <span className={`pill pill-${w.toLowerCase()}`}>{w}</span>;
}

/** The main engine model of a boat, so a search result shows whether it came from a similar boat. */
const engineOf = (c: Corpus, slug: string) => { const b = c.boats.find((x) => x.slug === slug); return b ? modelOf(b, 'engine') : ''; };

export function DocRow({ c, d, snippet, showBoat = true, showFolder = true }: { c: Corpus; d: Doc; snippet?: string; showBoat?: boolean; showFolder?: boolean }) {
  return (
    <a className="docrow" href={d.type === 'boat' && d.boat ? `#/boat/${d.boat}` : docHref(d.path)}>
      <span className="docrow-top">
        {d.type === 'issue' && <StatusPill status={d.status} />}
        <span className="docrow-title">{d.title}</span>
      </span>
      <span className="docrow-meta">
        {showBoat && d.boat && <span className="chip">{boatName(c, d.boat)}{engineOf(c, d.boat) && <> · {engineOf(c, d.boat)}</>}</span>}
        {d.type === 'procedure' && showFolder && <span className="chip">{folderPath(c.boats, procedureFolder(d.path))}</span>}
        {isCard(d) && <>{[d.fm.mpc_code, d.fm.frequency].map((v) => fmText(v)).filter(Boolean).map((v) => <span key={v}>{v}</span>)}</>}
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
