// Towboat Knowledge Base (own site, /kb/). The files come in kb-data.json, made when the site is published.
import { createRoot } from 'react-dom/client';
import KbApp, { type DocFile } from './KbApp';
import { KbStore } from './sync';
import type { KbFile } from './corpus';
import '../styles.css';
import './kb.css';

interface KbData { builtAt: string; owner: string; repo: string; branch: string; root: string; files: KbFile[]; docs: DocFile[] }

const root = createRoot(document.getElementById('root')!);
fetch('kb-data.json')
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<KbData>; })
  .then((d) => {
    const store = new KbStore({ builtAt: d.builtAt, files: d.files }, { owner: d.owner, repo: d.repo, branch: d.branch, root: d.root });
    root.render(<KbApp store={store} docsList={d.docs} />);
  })
  .catch(() => {
    root.render(
      <div className="boot"><h1>Towboat Knowledge Base</h1><p>Couldn't load the files. If this is the first time on this device, it needs signal once. Then reopen it.</p></div>
    );
  });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
navigator.storage?.persist?.();
