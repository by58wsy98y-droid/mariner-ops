import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { balancesBefore, computeChain, emptyDay, startDateOf, todayISO } from './calc';
import { backupFile, pdfName, type AppData, type Store, type SyncState } from './storage';
import { buildPdf, pdfLibFromWindow } from './pdf';
import type { Balances, DayLog, Settings } from './types';
import { useAsk } from './Confirm';
import DayScreen from './DayScreen';
import History from './History';
import Setup from './Setup';
import PrintView from './PrintView';

type Screen = 'day' | 'history' | 'setup';
const BACKUP_REMIND_DAYS = 7;

export default function App({ store }: { store: Store }) {
  const [data, setData] = useState<AppData>(store.initial);
  const dataRef = useRef(data); // always the latest, so saves never start from a stale copy
  const [sync, setSync] = useState<SyncState>({
    where: 'account', ready: store.ready, loading: true, pending: 0, stalled: false, fallback: false, notKept: false,
  });
  const [screen, setScreen] = useState<Screen>('day');
  const [date, setDateState] = useState(todayISO);
  const shownToday = useRef(todayISO()); // the calendar day when "today" was last put on screen
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [printDates, setPrintDates] = useState<string[] | null>(null);
  const [ask, dialog] = useAsk();

  useEffect(
    () =>
      store.start((d) => {
        dataRef.current = d;
        setData(d);
      }, setSync),
    [store]
  );

  const setDate = (d: string) => {
    shownToday.current = todayISO();
    setDateState(d);
  };

  // A page left open overnight moves on to the new day, instead of writing into yesterday's log.
  useEffect(() => {
    const roll = () => {
      const now = todayISO();
      if (now === shownToday.current) return;
      setDateState((d) => (d === shownToday.current ? now : d));
      shownToday.current = now;
    };
    const t = setInterval(roll, 60000);
    document.addEventListener('visibilitychange', roll);
    window.addEventListener('focus', roll);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', roll);
      window.removeEventListener('focus', roll);
    };
  }, []);

  const change = (fn: (d: AppData) => AppData, replace = false) => {
    const prev = dataRef.current;
    const next = fn(prev);
    dataRef.current = next;
    setData(next);
    if (replace) store.replaceAll(prev, next);
    else store.persist(prev, next);
  };

  // The very first day typed in a new log becomes the start day (its Prev numbers are the starting values).
  const withStart = (d: AppData, day: string): Settings =>
    startDateOf(d.entries, d.settings) ? d.settings : { ...d.settings, start: { ...d.settings.start, date: day } };

  const editDay = (day: string, fn: (d: DayLog) => DayLog) =>
    change((d) => {
      const cur = d.entries.find((e) => e.date === day) ?? emptyDay(day, d.settings);
      const next = fn(cur);
      return {
        settings: withStart(d, day),
        entries: [...d.entries.filter((e) => e.date !== day), next].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
  const editSettings = (fn: (s: Settings) => Settings) => change((d) => ({ ...d, settings: fn(d.settings) }));
  const editStart = (day: string, fn: (b: Balances) => Balances) =>
    change((d) => {
      const s = withStart(d, day);
      return { ...d, settings: { ...s, start: { ...s.start, ...fn(s.start) } } };
    });
  // Deleting the start day: the next day becomes the start day, starting from the deleted day's totals,
  // so every later number stays the same.
  const deleteDay = (day: string) =>
    change((d) => {
      const entries = d.entries.filter((e) => e.date !== day);
      const next = entries.find((e) => e.date > day);
      if (startDateOf(d.entries, d.settings) !== day || !next) {
        const settings = entries.length ? d.settings : { ...d.settings, start: { ...d.settings.start, date: undefined } };
        return { settings, entries };
      }
      const carried = balancesBefore(d.entries, d.settings, next.date);
      return { settings: { ...d.settings, start: { ...carried, date: next.date } }, entries };
    });

  const s = data.settings;
  const chain = useMemo(() => computeChain(data.entries, s), [data.entries, s]);
  const daysSinceBackup = s.lastBackup ? (Date.now() - Date.parse(s.lastBackup)) / 86400000 : Infinity;
  const needBackup = data.entries.length > 0 && daysSinceBackup > BACKUP_REMIND_DAYS;
  const waiting = !sync.ready;

  const backup = async () => {
    setNote('');
    const { filename, text } = backupFile(dataRef.current);
    const result = await store.saveFile(filename, text);
    if (result === 'saved') editSettings((x) => ({ ...x, lastBackup: new Date().toISOString() }));
    if (result === 'unavailable') setNote("Couldn't save the backup file here. Try again in a minute.");
  };

  const savePdf = async (dates: string[]) => {
    setNote('');
    const lib = pdfLibFromWindow();
    if (!lib) {
      setNote("The PDF maker didn't load. Check your signal, then close and reopen the page.");
      return;
    }
    const d = dataRef.current;
    const saved = dates.filter((x) => d.entries.some((e) => e.date === x));
    if (!saved.length) return;
    setBusy('Making PDF…');
    try {
      const bytes = buildPdf(lib, d, saved);
      const result = await store.saveFile(pdfName(d, saved), bytes);
      if (result === 'unavailable') setNote("Couldn't save the PDF here. Try again in a minute.");
    } catch (e) {
      setNote(`Couldn't make the PDF: ${(e as Error).message}`);
    } finally {
      setBusy('');
    }
  };

  // Own-site version: lay the days out for printing, then open the browser's Print (still inside the tap).
  const print = store.canPrint
    ? (dates: string[]) => {
        const saved = dates.filter((x) => dataRef.current.entries.some((e) => e.date === x));
        if (!saved.length) return;
        flushSync(() => setPrintDates(saved));
        window.print();
      }
    : undefined;

  const go = (sc: Screen) => {
    setScreen(sc);
    window.scrollTo(0, 0);
  };

  return (
    <>
    <div className="app">
      <header>
        <div className="wrap">
          <div className="top">
            <h1>Daily Engine Maintenance</h1>
            <div className="boat">{s.boatName}</div>
          </div>
          <SyncLine s={sync} />
        </div>
      </header>

      {(needBackup || note || busy) && (
        <div className="wrap banners">
          {busy && <div className="banner note" role="status">{busy}</div>}
          {needBackup && (
            <div className="banner note">
              <div>{s.lastBackup ? `Last backup ${Math.floor(daysSinceBackup)} days ago.` : 'No backup yet.'} Keep a spare copy of your log.</div>
              <button onClick={backup}>Back up now</button>
            </div>
          )}
          {note && (
            <div className="banner warnbox" role="alert">
              <div>{note}</div>
              <button className="ghost" onClick={() => setNote('')} aria-label="Dismiss">✕</button>
            </div>
          )}
        </div>
      )}

      <main className="wrap">
        {waiting ? (
          <section className="card">
            {sync.fallback ? (
              <>
                <h2>Can't open your log here yet</h2>
                <p>
                  Your Claude account didn't answer, and this device doesn't have a copy of your log yet. Get a signal and reopen the
                  page. Nothing has been lost.
                </p>
              </>
            ) : (
              <>
                <h2>Loading your log</h2>
                <p>Getting your saved days from your Claude account. This needs a signal the first time on each device.</p>
              </>
            )}
          </section>
        ) : (
          <>
            {screen === 'day' && (
              <DayScreen data={data} date={date} setDate={setDate} editDay={editDay} editStart={editStart} onDelete={deleteDay} onPdf={savePdf} onPrint={print} ask={ask} />
            )}
            {screen === 'history' && (
              <History
                data={data}
                chain={chain}
                onOpen={(d) => {
                  setDate(d);
                  go('day');
                }}
                onPdf={savePdf}
                onPrint={print}
              />
            )}
            {screen === 'setup' && (
              <Setup data={data} sync={sync} onSettings={editSettings} onRestore={(d) => change(() => d, true)} onBackup={backup} ask={ask} />
            )}
          </>
        )}
      </main>

      <nav>
        <div className="wrap">
          <button className={screen === 'day' ? 'on' : ''} onClick={() => go('day')}>Day</button>
          <button className={screen === 'history' ? 'on' : ''} onClick={() => go('history')}>History</button>
          <button className={screen === 'setup' ? 'on' : ''} onClick={() => go('setup')}>Setup &amp; Backup</button>
        </div>
      </nav>
      {dialog}
    </div>
    {printDates && <PrintView data={data} dates={printDates} />}
    </>
  );
}

function SyncLine({ s }: { s: SyncState }) {
  if (s.error) return <div className="sync is-bad">{s.error}</div>;
  if (s.notKept && s.pending)
    return <div className="sync is-bad">This browser can't keep a copy. Keep this page open until it says Saved, and back up.</div>;
  if (s.fallback)
    return <div className="sync is-warn">Can't reach your Claude account. Saving on this device; it sends next time you open with signal.</div>;
  if (s.where === 'device') return <div className="sync">✓ Saved on this device</div>;
  if (s.loading) return <div className="sync">Loading your log from your Claude account…</div>;
  if (s.pending && (s.stalled || (typeof navigator !== 'undefined' && navigator.onLine === false)))
    return (
      <div className="sync is-warn">
        No signal · {s.pending} change{s.pending > 1 ? 's' : ''} kept on this device, sends by itself
      </div>
    );
  if (s.pending) return <div className="sync">Saving…</div>;
  return <div className="sync">✓ Saved to your Claude account</div>;
}
