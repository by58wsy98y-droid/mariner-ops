import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { buildCorpus, type Corpus } from './corpus';
import { buildIndex, type Index } from './search';
import type { KbStore, Op } from './sync';
import Home from './screens/Home';
import BoatPage from './screens/BoatPage';
import DocPage from './screens/DocPage';
import FuelPage from './screens/FuelPage';
import NewIssue from './screens/NewIssue';
import NewBoat from './screens/NewBoat';
import Library from './screens/Library';
import Documents from './screens/Documents';
import Settings from './screens/Settings';
import EditFile from './screens/EditFile';
import Files from './screens/Files';

export interface DocFile { path: string; size: number }
export interface Kb {
  store: KbStore;
  corpus: Corpus;
  index: Index;
  docsList: DocFile[];
  save: (op: Op, label: string) => void;
  offline: 'ready' | 'preparing' | 'none';
}

const Ctx = createContext<Kb | null>(null);
export const useKb = () => useContext(Ctx)!;

export const go = (hash: string) => { location.hash = hash; window.scrollTo(0, 0); };

function useRoute(): string[] {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return decodeURI(hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
}

function useOffline(): Kb['offline'] {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
  // Only this app's own helper counts (the engine log's, one folder up, can be in charge until it's installed).
  const mine = () => sw?.controller?.scriptURL === new URL('sw.js', location.href).href;
  const [state, setState] = useState<Kb['offline']>(sw ? (mine() ? 'ready' : 'preparing') : 'none');
  useEffect(() => {
    const on = () => { if (mine()) setState('ready'); };
    on(); // it may have taken over before this screen was up
    sw?.addEventListener('controllerchange', on);
    sw?.ready.then(on).catch(() => {});
    return () => sw?.removeEventListener('controllerchange', on);
  }, [sw]);
  return state;
}

export default function KbApp({ store, docsList }: { store: KbStore; docsList: DocFile[] }) {
  const version = useSyncExternalStore((cb) => store.subscribe(cb), () => store.view());
  const status = store.status();
  const corpus = useMemo(() => buildCorpus([...version].map(([path, text]) => ({ path, text }))), [version]);
  const index = useMemo(() => buildIndex(corpus), [corpus]);
  const offline = useOffline();
  const route = useRoute();

  useEffect(() => {
    const kick = () => { if (document.visibilityState !== 'hidden') void store.sync(); };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', kick);
    void store.sync();
    return () => { window.removeEventListener('online', kick); document.removeEventListener('visibilitychange', kick); };
  }, [store]);

  const kb: Kb = { store, corpus, index, docsList, offline, save: (op, label) => store.enqueue(op, label) };
  const [screen, a, ...rest] = route;
  let page;
  if (screen === 'boat' && a) page = <BoatPage slug={a} />;
  else if (screen === 'doc' && a) page = <DocPage key={[a, ...rest].join('/')} path={[a, ...rest].join('/')} />;
  else if (screen === 'fuel' && a) page = <FuelPage slug={a} />;
  else if (screen === 'new-issue' && a) page = <NewIssue slug={a} />;
  else if (screen === 'new-boat') page = <NewBoat />;
  else if (screen === 'library') page = <Library />;
  else if (screen === 'docs') page = <Documents />;
  else if (screen === 'settings') page = <Settings />;
  else if (screen === 'edit' && a) page = <EditFile key={[a, ...rest].join('/')} path={[a, ...rest].join('/')} />;
  else if (screen === 'files') page = <Files />;
  else page = <Home />;
  const tab = screen === 'library' || screen === 'docs' ? screen : screen === 'settings' || screen === 'files' ? 'settings' : 'home';

  return (
    <Ctx.Provider value={kb}>
      <div className="kbapp">
        <header>
          <div className="wrap">
            <div className="top">
              <h1><a href="#/" className="home-link">Towboat Knowledge Base</a></h1>
            </div>
            <SyncLine status={status} offline={offline} />
          </div>
        </header>
        <main className="wrap">{page}</main>
        <nav>
          <div className="wrap">
            <button className={tab === 'home' ? 'on' : ''} onClick={() => go('#/')}>Search</button>
            <button className={tab === 'library' ? 'on' : ''} onClick={() => go('#/library')}>Library</button>
            <button className={tab === 'docs' ? 'on' : ''} onClick={() => go('#/docs')}>Docs</button>
            <button className={tab === 'settings' ? 'on' : ''} onClick={() => go('#/settings')}>Settings</button>
          </div>
        </nav>
      </div>
    </Ctx.Provider>
  );
}

function SyncLine({ status, offline }: { status: ReturnType<KbStore['status']>; offline: Kb['offline'] }) {
  const parts: string[] = [];
  let cls = 'sync';
  if (status.error && status.pending) { cls += ' is-warn'; parts.push(`${status.pending} change${status.pending > 1 ? 's' : ''} kept on this device · ${status.error}`); }
  else if (!status.connected && status.pending) { cls += ' is-warn'; parts.push(`${status.pending} change${status.pending > 1 ? 's' : ''} kept on this device · connect GitHub in Settings to save them`); }
  else if (status.syncing || status.pending) parts.push('Saving to GitHub…');
  else if (status.lastSaved) parts.push('✓ Saved to GitHub');
  if (offline === 'ready') parts.push('Opens with no signal');
  if (offline === 'preparing') parts.push('Getting ready to open with no signal…');
  return parts.length ? <div className={cls}>{parts.join(' · ')}</div> : null;
}
