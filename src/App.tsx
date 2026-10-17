import { useMemo, useState } from 'react';
import { computeChain, fmtGal, truckAlert } from './calc';
import { downloadBackup, load, save, type AppData } from './storage';
import type { DayEntry, Settings } from './types';
import Today from './Today';
import Log from './Log';
import SettingsPage from './SettingsPage';

type Screen = 'today' | 'log' | 'settings';
const BACKUP_REMIND_DAYS = 7;

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [data, setData] = useState<AppData>(load);
  const [screen, setScreen] = useState<Screen>('today');
  const [date, setDate] = useState(todayStr);
  const [showAlert, setShowAlert] = useState(true); // shown on open and after every save

  const update = (next: AppData) => {
    save(next);
    setData(next);
  };

  const chain = useMemo(
    () => computeChain(data.entries, data.settings.start ?? { fuel: 0, lube: 0, water: 0 }),
    [data.entries, data.settings.start]
  );
  const latest = chain[chain.length - 1];
  const s = data.settings;
  const alert = latest ? truckAlert(latest.fuel.onHand, s.capacity, s.truckSize, s.alertTrucks) : null;

  const daysSinceBackup = s.lastBackup ? (Date.now() - Date.parse(s.lastBackup)) / 86400000 : Infinity;
  const needBackup = data.entries.length > 0 && daysSinceBackup > BACKUP_REMIND_DAYS;

  const saveEntry = (entry: DayEntry, newStart?: Settings['start']) => {
    const entries = data.entries.filter((e) => e.date !== entry.date).concat(entry);
    entries.sort((a, b) => a.date.localeCompare(b.date));
    update({ settings: newStart ? { ...s, start: newStart } : s, entries });
    setShowAlert(true);
  };

  const deleteEntry = (d: string) => update({ ...data, entries: data.entries.filter((e) => e.date !== d) });

  const backup = () => {
    downloadBackup(data);
    update({ ...data, settings: { ...s, lastBackup: new Date().toISOString() } });
  };

  return (
    <div className="app">
      <header>
        <h1>{s.boatName || 'Fuel Log'}</h1>
        {latest && <div className="onhand">On hand {fmtGal(latest.fuel.onHand)} gal</div>}
      </header>

      {alert && showAlert && (
        <div className="banner truck" role="alert">
          <div>
            <strong>
              Room for {alert.trucks} truck{alert.trucks > 1 ? 's' : ''} ({fmtGal(alert.gallons)} gal)
            </strong>
            <div className="small">
              On hand {fmtGal(alert.onHand)} · Room to full {fmtGal(alert.roomToFull)} · Alert at ≤ {fmtGal(alert.threshold)} gal
            </div>
          </div>
          <button className="ghost" onClick={() => setShowAlert(false)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {needBackup && (
        <div className="banner backup">
          <div>
            {s.lastBackup ? `Last backup ${Math.floor(daysSinceBackup)} days ago.` : 'No backup yet.'} A lost phone is lost data.
          </div>
          <button onClick={backup}>Back up now</button>
        </div>
      )}

      <main>
        {screen === 'today' && (
          <Today data={data} date={date} setDate={setDate} onSave={saveEntry} onDelete={deleteEntry} />
        )}
        {screen === 'log' && (
          <Log chain={chain} onOpen={(d) => { setDate(d); setScreen('today'); }} />
        )}
        {screen === 'settings' && (
          <SettingsPage data={data} onChange={update} onBackup={backup} />
        )}
      </main>

      <nav>
        <button className={screen === 'today' ? 'on' : ''} onClick={() => setScreen('today')}>Entry</button>
        <button className={screen === 'log' ? 'on' : ''} onClick={() => setScreen('log')}>Log</button>
        <button className={screen === 'settings' ? 'on' : ''} onClick={() => setScreen('settings')}>Fuel / Settings</button>
      </nav>
    </div>
  );
}
