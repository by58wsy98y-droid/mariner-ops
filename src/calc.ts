// All bookkeeping math lives here (no UI, no storage) so it can be tested and extended.
import type {
  Balances, DayEntry, DayResult, DayTankMode, FuelReport, Settings, StockReport, TankDef, TankReading, TruckAlert,
} from './types';

export const DEFAULT_SETTINGS: Settings = {
  boatName: '',
  capacity: 91500,
  portLabels: ['#2', '#3', '#4', '#5'],
  stbdLabels: ['#2', '#3', '#4', '#5'],
  dayTanks: 'one',
  truckSize: 7500,
  alertTrucks: [1, 2],
  start: null,
  lastBackup: null,
};

/** Build the tank list from settings: PORT mains, STBD mains, then day tank(s). */
export function tankLayout(s: Pick<Settings, 'portLabels' | 'stbdLabels' | 'dayTanks'>): TankDef[] {
  const tanks: TankDef[] = [
    ...s.portLabels.map((label, i) => ({ id: `P${i + 1}`, side: 'PORT' as const, label, isDayTank: false })),
    ...s.stbdLabels.map((label, i) => ({ id: `S${i + 1}`, side: 'STBD' as const, label, isDayTank: false })),
  ];
  const dt = dayTankDefs(s.dayTanks);
  return [...tanks, ...dt];
}

function dayTankDefs(mode: DayTankMode): TankDef[] {
  if (mode === 'one') return [{ id: 'DT', side: 'PORT', label: 'DT', isDayTank: true }];
  if (mode === 'perSide')
    return [
      { id: 'DTP', side: 'PORT', label: 'DT', isDayTank: true },
      { id: 'DTS', side: 'STBD', label: 'DT', isDayTank: true },
    ];
  return [];
}

/**
 * Parse a sounding into inches. Accepts 9'4  9' 4"  9'4"  9'  and plain inches 118.
 * Returns null for blank or unreadable input.
 */
export function parseSounding(text: string): number | null {
  const t = text.trim().replace(/[’‘`]/g, "'").replace(/[”“]|''/g, '"');
  if (!t) return null;
  const plain = /^(\d+(?:\.\d+)?)\s*"?$/.exec(t);
  if (plain) return Number(plain[1]);
  const ftIn = /^(\d+)\s*'\s*(?:(\d+(?:\.\d+)?)\s*"?)?$/.exec(t);
  if (ftIn) return Number(ftIn[1]) * 12 + (ftIn[2] ? Number(ftIn[2]) : 0);
  return null;
}

/** Spreadsheet TOTAL: sum of every gallons cell on both sides. Blank counts as 0. */
export function tankTotal(tanks: TankReading[]): number {
  return tanks.reduce((sum, t) => sum + (t.gallons ?? 0), 0);
}

/** FUEL REPORT: on hand comes from the tanks; used = total - on hand. */
export function fuelReport(previous: number, received: number, onHand: number): FuelReport {
  const total = previous + received;
  return { previous, received, total, onHand, used: total - onHand };
}

/** LUBE OIL / WATER: used is typed; on hand = total - used. */
export function stockReport(previous: number, received: number, used: number): StockReport {
  const total = previous + received;
  return { previous, received, total, onHand: total - used, used };
}

export function computeDay(entry: DayEntry, prev: Balances): DayResult {
  return {
    date: entry.date,
    fuel: fuelReport(prev.fuel, entry.fuelReceived, tankTotal(entry.tanks)),
    lube: stockReport(prev.lube, entry.lubeReceived, entry.lubeUsed),
    water: stockReport(prev.water, entry.waterReceived, entry.waterUsed),
  };
}

/**
 * Run the whole chain in date order. Each day's PREVIOUS = the day before's ON HAND;
 * the first entry starts from the starting balances. Crosses month boundaries freely.
 */
export function computeChain(entries: DayEntry[], start: Balances): DayResult[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const out: DayResult[] = [];
  let prev = start;
  for (const e of sorted) {
    const r = computeDay(e, prev);
    out.push(r);
    prev = { fuel: r.fuel.onHand, lube: r.lube.onHand, water: r.water.onHand };
  }
  return out;
}

/** Balances carried into `date`: ON HAND of the latest entry before that date, else start. */
export function previousBalances(entries: DayEntry[], start: Balances, date: string): Balances {
  const before = entries.filter((e) => e.date < date);
  const chain = computeChain(before, start);
  const last = chain[chain.length - 1];
  return last ? { fuel: last.fuel.onHand, lube: last.lube.onHand, water: last.water.onHand } : start;
}

/**
 * Highest truck-load alert that applies: on hand <= capacity - trucks * truckSize.
 * Returns null when no load would fit.
 */
export function truckAlert(onHand: number, capacity: number, truckSize: number, levels: number[]): TruckAlert | null {
  const roomToFull = capacity - onHand;
  const fits = levels
    .filter((n) => n > 0 && truckSize > 0)
    .filter((n) => onHand <= capacity - n * truckSize)
    .sort((a, b) => b - a);
  if (!fits.length) return null;
  const trucks = fits[0];
  const gallons = trucks * truckSize;
  return { trucks, gallons, threshold: capacity - gallons, onHand, roomToFull };
}

/** Whole gallons with thousands separators. */
export function fmtGal(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return Math.round(n).toLocaleString('en-US');
}

/** Read a typed gallons number; tolerates commas. Blank -> null. */
export function parseGal(text: string): number | null {
  const t = text.replace(/,/g, '').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}
