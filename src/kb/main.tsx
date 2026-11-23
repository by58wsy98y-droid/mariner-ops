// Marquette Engineering Knowledge Base (/kb/). The files come in kb-data.json, made when the site is published.
import { createRoot } from 'react-dom/client';
import KbApp, { type DocFile } from './KbApp';
import { KbStore } from './sync';
import type { KbFile } from './corpus';
import './base.css';
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
      <div className="boot"><h1>Marquette Engineering Knowledge Base</h1><p>Couldn't load the files. Check the signal and reopen it.</p></div>
    );
  });

// Older versions kept a copy on the phone for no signal. kb/sw.js now removes it on the phone's next visit; if this
// page still finds one, it removes it itself: this site's kept files, then its helper.
const site = new URL('..', location.href).href;
const ours = (k: string) => k.startsWith('kb-') || k.startsWith('engine-log-') || k === 'fonts';
navigator.serviceWorker?.getRegistration().then(async (r) => {
  if (!r || !r.scope.startsWith(site)) return;
  if ('caches' in window) for (const k of await caches.keys()) if (ours(k)) await caches.delete(k);
  await r.unregister();
}).catch(() => {});
navigator.storage?.persist?.();
