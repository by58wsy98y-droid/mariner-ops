import { useEffect, useMemo, useRef, useState } from 'react';
import { computeChain, fmtGal, truckAlert } from './calc';
import { backupFile, type AppData, type Store, type SyncState } from './storage';
import type { Balances, DayEntry } from './types';
import { useAsk } from './Confirm';
import Today from './Today';
import Log from './Log';
import SettingsPage from './SettingsPage';

type Screen = 'today' | 'log' | 'settings';
const BACKUP_REMIND_DAYS = 7;

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App({ store }: { store: Store }) {
  const [data, setData] = useState<AppData>(store.initial);
  const dataRef = useRef(data); // always the latest, so saves never start from a stale copy
  const [sync, setSync] = useState<SyncState>({ where: 'account', loading: !store.ready, pending: 0, fallback: false });
  const [screen, setScreen] = useState<Screen>('today');
  const [date, setDate] = useState(todayStr);
  const [showAlert, setShowAlert] = useState(true); // shown on open and after every save
  const [note, setNote] = useState('');
  const [ask, dialog] = useAsk();

  useEffect(
    () =>
      store.start((d) => {
        dataRef.current = d;
        setData(d);
      }, setSync),
    [store]
  );

  const change = (fn: (d: AppData) => AppData, replace = false) => {
    const prev = dataRef.current;
    const next = fn(prev);
    dataRef.current = next;
    setData(next);
    if (replace) store.replaceAll(prev, next);
    else store.persist(prev, next);
  };

  const s = data.settings;
  const chain = useMemo(
    () => computeChain(data.entries, s.start ?? { fuel: 0, lube: 0, water: 0 }),
    [data.entries, s.start]
  );
  const latest = chain[chain.length - 1];
  const alert = latest ? truckAlert(latest.fuel.onHand, s.capacity, s.truckSize, s.alertTrucks) : null;

  const daysSinceBackup = s.lastBackup ? (Date.now() - Date.parse(s.lastBackup)) / 86400000 : Infinity;
  const needBackup = data.entries.length > 0 && daysSinceBackup > BACKUP_REMIND_DAYS;
  const waiting = sync.loading && !store.ready;

  const saveEntry = (entry: DayEntry, start?: Balances) => {
    change((d) => ({
      settings: start ? { ...d.settings, start } : d.settings,
      entries: [...d.entries.filter((e) => e.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setShowAlert(true);
  };

  const deleteEntry = (day: string) => change((d) => ({ ...d, entries: d.entries.filter((e) => e.date !== day) }));

  const backup = async () => {
    setNote('');
    const { filename, text } = backupFile(dataRef.current);
    const result = await store.saveFile(filename, text);
    if (result === 'saved') change((d) => ({ ...d, settings: { ...d.settings, lastBackup: new Date().toISOString() } }));
    if (result === 'unavailable') setNote("Couldn't save the backup file here. Try again in a minute.");
  };

  const banners = (alert && showAlert) || needBackup || note;

  return (
    <div className="app">
      <header>
        <div className="wrap">
          <div className="top">
            <h1>{s.boatName || 'Fuel Log'}</h1>
            {latest && (
              <div className="onhand">
                <small>On hand</small> {fmtGal(latest.fuel.onHand)} gal
              </div>
            )}
          </div>
          <SyncLine s={sync} />
        </div>
      </header>

      {banners && (
        <div className="wrap banners">
          {alert && showAlert && (
            <div className="banner truck" role="alert">
              <div>
                <strong>
                  Room for {alert.trucks} truck{alert.trucks > 1 ? 's' : ''} ({fmtGal(alert.gallons)} gal)
                </strong>
                <div className="small">
                  On hand {fmtGal(alert.onHand)} · Room to full {fmtGal(alert.roomToFull)} · Alert at ≤{' '}
                  {fmtGal(alert.threshold)} gal
                </div>
              </div>
              <button className="ghost" onClick={() => setShowAlert(false)} aria-label="Dismiss">✕</button>
            </div>
          )}
          {needBackup && (
            <div className="banner note">
              <div>
                {s.lastBackup ? `Last backup ${Math.floor(daysSinceBackup)} days ago.` : 'No backup yet.'} Keep a copy of
                your log somewhere safe.
              </div>
              <button onClick={backup}>Back up now</button>
            </div>
          )}
          {note && (
            <div className="banner note">
              <div>{note}</div>
              <button className="ghost" onClick={() => setNote('')} aria-label="Dismiss">✕</button>
            </div>
          )}
        </div>
      )}

      <main className="wrap">
        {waiting ? (
          <section className="card">
            <h2>Loading your log</h2>
            <p>Getting your saved days from your Claude account. This needs a signal the first time on each device.</p>
          </section>
        ) : (
          <>
            {screen === 'today' && (
              <Today data={data} date={date} setDate={setDate} onSave={saveEntry} onDelete={deleteEntry} ask={ask} />
            )}
            {screen === 'log' && (
              <Log
                chain={chain}
                onOpen={(d) => {
                  setDate(d);
                  setScreen('today');
                }}
              />
            )}
            {screen === 'settings' && (
              <SettingsPage
                data={data}
                sync={sync}
                onChange={change}
                onRestore={(d) => change(() => d, true)}
                onBackup={backup}
                ask={ask}
              />
            )}
          </>
        )}
      </main>

      <nav>
        <div className="wrap">
          <button className={screen === 'today' ? 'on' : ''} onClick={() => setScreen('today')}>Entry</button>
          <button className={screen === 'log' ? 'on' : ''} onClick={() => setScreen('log')}>Log</button>
          <button className={screen === 'settings' ? 'on' : ''} onClick={() => setScreen('settings')}>Fuel / Settings</button>
        </div>
      </nav>
      {dialog}
    </div>
  );
}

function SyncLine({ s }: { s: SyncState }) {
  if (s.error) return <div className="sync is-bad">{s.error}</div>;
  if (s.fallback)
    return <div className="sync is-warn">Can't reach your Claude account. Saving in this browser; it sends next time.</div>;
  if (s.where === 'device') return null;
  if (s.loading) return <div className="sync">Loading…</div>;
  if (s.pending)
    return (
      <div className="sync is-warn">
        {s.pending} change{s.pending > 1 ? 's' : ''} waiting for signal · kept on this device, sends by itself
      </div>
    );
  return <div className="sync is-ok">✓ Saved to your Claude account</div>;
}
