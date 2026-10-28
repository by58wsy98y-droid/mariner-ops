// Edit any text file: the details at the top of a page as boxes, the rest as one big text box.
import { useState } from 'react';
import { parseFrontmatter, setFrontmatterField } from '../frontmatter';
import { docType } from '../corpus';
import { docHref } from '../Md';
import { go, useKb } from '../KbApp';

const HELP: Record<string, string> = {
  status: 'OPEN, WATCHING, RESOLVED or UNKNOWN, then a note if you like',
  tags: 'in square brackets, commas between: [steering, rudder]',
  opened: 'YYYY-MM-DD',
  severity: 'low, medium or high',
};

/** Split a file into its top block lines and the rest, keeping the rest byte for byte. */
function split(text: string): { fields: [string, string][]; body: string; hasFm: boolean } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
  if (!m) return { fields: [], body: text, hasFm: false };
  const fields: [string, string][] = [];
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):[ \t]?(.*)$/.exec(line);
    if (kv) fields.push([kv[1], kv[2]]);
  }
  return { fields, body: text.slice(m[0].length), hasFm: true };
}

export default function EditFile({ path }: { path: string }) {
  const { store, save } = useKb();
  const original = store.view().get(path);
  const [startText] = useState(original ?? null); // what editing started from (for merging later)
  const parts = split(original ?? '');
  const [fields, setFields] = useState<[string, string][]>(parts.fields);
  const [body, setBody] = useState(parts.body);
  const isMd = path.endsWith('.md');
  if (original == null) return <section className="card"><h2>Not found</h2><p>{path} isn't in the knowledge base (it may have been deleted). <a href="#/files">All files</a></p></section>;

  const build = () => {
    if (!parts.hasFm || !isMd) return body;
    let text = original;
    for (const [k, v] of fields) if (parseFrontmatter(text).fm[k] !== undefined || v.trim()) text = setFrontmatterField(text, k, v);
    const head = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/.exec(text)![0];
    return head + body;
  };
  const next = build();
  const changed = next !== original;
  // pages open as pages; anything else (READMEs, templates, CSVs) goes back to the file list
  const home = docType(path) ? docHref(path) : '#/files';
  const back = () => go(home);

  return (
    <div className="screen">
      <section className="card">
        <div className="crumbs"><a href={home}>{path}</a> · Edit</div>
        <h2 className="page-title">Edit</h2>
        {fields.length > 0 && (
          <div className="form">
            <h3>Details</h3>
            {fields.map(([k, v], i) => (
              <label key={k} htmlFor={`f-${k}`}>{k.replace(/_/g, ' ')}{HELP[k] ? <span className="hint"> — {HELP[k]}</span> : null}
                <input id={`f-${k}`} value={v} onChange={(e) => setFields(fields.map((f, j) => (j === i ? [k, e.target.value] : f)))} />
              </label>
            ))}
          </div>
        )}
        <label htmlFor="f-body">{isMd ? 'Text' : 'Contents'}
          <textarea id="f-body" className="editor" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={isMd} rows={Math.min(40, Math.max(12, body.split('\n').length + 2))} />
        </label>
        {isMd && <p className="small muted">Headings start with ##. Table rows are lines like | 10/28 14:05 | what happened |. A line starting with - is a bullet.</p>}
        <div className="actions">
          <button disabled={!changed} onClick={() => { save({ kind: 'replace', path, base: startText, text: next }, `edit ${path.split('/').pop()}`); back(); }}>Save changes</button>
          <button className="secondary" onClick={back}>Cancel</button>
        </div>
      </section>
    </div>
  );
}
