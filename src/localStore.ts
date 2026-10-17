// Phone (PWA) build: the whole log is kept in this browser's storage on the device.
import { emptyData, normalize, readLocal, writeLocal, type AppData, type Store, type SyncState } from './storage';

const KEY = 'towboat-fuel-log:v1';
const OK: SyncState = { where: 'device', loading: false, pending: 0, fallback: false };

export function localStore(): Store {
  let initial = emptyData();
  try {
    const saved = readLocal<AppData>(KEY);
    if (saved) initial = normalize(saved);
  } catch {
    /* damaged copy: start empty, restore from backup */
  }
  let report: (s: SyncState) => void = () => {};
  const write = (next: AppData) =>
    report(writeLocal(KEY, next) ? OK : { ...OK, error: "Couldn't save on this device (storage full or blocked). Back up now." });

  return {
    initial,
    ready: true,
    start(_onData, onStatus) {
      report = onStatus;
      onStatus(OK);
      return () => {};
    },
    persist: (_prev, next) => write(next),
    replaceAll: (_prev, next) => write(next),
    async saveFile(filename, text) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return 'saved';
    },
  };
}
