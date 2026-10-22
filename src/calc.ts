// All the log's arithmetic lives here (no screens, no storage) so it can be tested.
// Each counter: Total = Prev + Today, and tomorrow's Prev = today's Total (unless reset).
// Each fluid: Ending = Beginning - Used + Purchased - Transferred, and tomorrow's Beginning = today's Ending.
import type { Balances, Cell, DayCalc, DayLog, FluidId, SectionDef, Settings, Side } from './types';

export const FLUIDS: { id: FluidId; label: string }[] = [
  { id: 'fuel', label: 'Fuel' },
  { id: 'lube', label: 'Lube' },
  { id: 'water', label: 'Potable Water' },
];

const h = (id: string, label: string) => ({ id, label, kind: 'hours' as const });
const added = (id: string, label: string) => ({ id, label, kind: 'added' as const });

/** The sheets and lines of the company's Daily Engine Maintenance log. */
export const DEFAULT_SECTIONS: SectionDef[] = [
  {
    id: 'main', title: 'Main Engines', sided: true,
    rows: [
      h('totalHours', 'Total Engine Hours'),
      h('majorOH', 'Hours Since Last Major O/H'),
      h('topEndOH', 'Hours Since Last Top End O/H'),
      h('turbo', 'Hours Since Last Turbo Change'),
      h('lubeFilter', 'Lube Oil Filter Hours'),
      h('fuelFilter', 'Fuel Filter Hours'),
      h('racor', 'Racor Filter Hours'),
      h('airFilter', 'Air Filter Hours (Since Last Changed)'),
      h('tuneUp', 'Hours Since Last Tune Up'),
      h('lubeChange', 'Hours Since Last Lube Oil Change'),
      added('lubeAdded', 'Lube Oil Added (Since Last Oil Sample)'),
    ],
  },
  {
    id: 'gear', title: 'Gear Boxes', sided: true,
    rows: [
      h('gearOH', 'Hours on Gear (Since O/H)'),
      h('strainer', 'Hours on Filter/Strainer'),
      h('pilotGreased', 'PILOT BRNG (Hours Since Last Greased)'),
      h('pilotChanged', 'PILOT BRNG (Hours Since Last Changed)'),
      h('lubeChange', 'Hours Since Last Lube Oil Change'),
      added('lubeAdded', 'Lube Oil Added (Since Last Oil Sample)'),
    ],
  },
  {
    id: 'gen', title: 'Generator Engines', sided: true,
    rows: [
      h('majorOH', 'Hours Since Last Major O/H'),
      h('tuneUp', 'Hours Since Last Tune Up'),
      h('lubeFilter', 'Hours on Lube Oil Filters'),
      h('fuelFilter', 'Hours On Fuel Oil Filters'),
      h('airFilter', 'Air Filter Hours'),
      added('lubeAdded', 'Lube Oil Added (Since Last Oil Sample)'),
    ],
  },
  {
    id: 'hot', title: 'Hot Ends', sided: true,
    rows: [h('majorOH', 'Hours Since Last Major O/H'), h('endBell', 'End Bell Brng Hours (Since Changed)')],
  },
  {
    id: 'aux', title: 'Auxiliary Equipment', sided: false,
    rows: [
      h('polisherSvc', 'F/O Centrifuge/Polisher Hours (Since Last Serviced)'),
      h('polisher', 'F/O Centrifuge/Polisher Hours'),
      h('serviceFilter', 'F/O Service Filter Hours (Since Last Changed)'),
      h('comp1', 'Air Compressor 1'),
      h('comp2', 'Air Compressor 2'),
      h('comp3', 'Air Compressor 3'),
    ],
  },
];

export const DEFAULT_SETTINGS: Settings = {
  boatName: '',
  chief: '',
  sections: DEFAULT_SECTIONS,
  start: { counters: {}, fluids: { fuel: 0, lube: 0, water: 0 } },
  lastBackup: null,
};

export const SIDE_LABEL: Record<Side, string> = { port: 'Port', stbd: 'Starboard', one: '' };
export const sidesOf = (s: SectionDef): Side[] => (s.sided ? ['port', 'stbd'] : ['one']);
export const cellKey = (sectionId: string, rowId: string, side: Side) => `${sectionId}.${rowId}.${side}`;

export function sectionKeys(sections: SectionDef[]): string[] {
  return sections.flatMap((s) => s.rows.flatMap((r) => sidesOf(s).map((side) => cellKey(s.id, r.id, side))));
}

/** Money-style rounding to hundredths so 0.1 + 0.2 shows as 0.30. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function emptyDay(date: string, settings: Settings): DayLog {
  return {
    date,
    chief: settings.chief,
    fluids: {
      fuel: { used: null, purchased: null, transferred: null },
      lube: { used: null, purchased: null, transferred: null },
      water: { used: null, purchased: null, transferred: null },
    },
    draftBow: null, draftStern: null, loads: null, empties: null, from: '', to: '',
    cells: {}, comments: '', issues: [],
  };
}

export function computeDay(day: DayLog, before: Balances, keys: string[]): DayCalc {
  const cells: DayCalc['cells'] = {};
  for (const key of new Set([...keys, ...Object.keys(day.cells)])) {
    const cell: Cell | undefined = day.cells[key];
    const prev = cell?.reset ? cell.reset.to : before.counters[key] ?? 0;
    const today = cell?.today ?? 0;
    cells[key] = { prev, today, total: round2(prev + today), ...(cell?.reset ? { reset: cell.reset } : {}) };
  }
  const fluids = {} as DayCalc['fluids'];
  for (const { id } of FLUIDS) {
    const f = day.fluids?.[id];
    const begin = before.fluids[id] ?? 0;
    const used = f?.used ?? 0, purchased = f?.purchased ?? 0, transferred = f?.transferred ?? 0;
    fluids[id] = { begin, used, purchased, transferred, end: round2(begin - used + purchased - transferred) };
  }
  return { date: day.date, cells, fluids };
}

/** The balances a day hands to the next one. */
export function after(calc: DayCalc, before: Balances): Balances {
  const counters = { ...before.counters };
  for (const [key, c] of Object.entries(calc.cells)) counters[key] = c.total;
  return {
    counters,
    fluids: { fuel: calc.fluids.fuel.end, lube: calc.fluids.lube.end, water: calc.fluids.water.end },
  };
}

/** Every saved day in date order, each starting from the day before (the first from the starting values). */
export function computeChain(entries: DayLog[], settings: Settings): DayCalc[] {
  const keys = sectionKeys(settings.sections);
  const out: DayCalc[] = [];
  let bal = settings.start;
  for (const day of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    const calc = computeDay(day, bal, keys);
    out.push(calc);
    bal = after(calc, bal);
  }
  return out;
}

/** Prev values for `date`: the Totals of the latest saved day before it, or the starting values. */
export function balancesBefore(entries: DayLog[], settings: Settings, date: string): Balances {
  let bal = settings.start;
  for (const calc of computeChain(entries.filter((e) => e.date < date), settings)) bal = after(calc, bal);
  return bal;
}

/** Typing the Ending balance (from soundings) works out Used. */
export const usedFromEnding = (begin: number, purchased: number, transferred: number, end: number) =>
  round2(begin + purchased - transferred - end);

export function setToday(day: DayLog, key: string, today: number | null): DayLog {
  return { ...day, cells: { ...day.cells, [key]: { ...day.cells[key], today } } };
}

export function setReset(day: DayLog, key: string, reset: Cell['reset'] | undefined): DayLog {
  const today = day.cells[key]?.today ?? null;
  return { ...day, cells: { ...day.cells, [key]: reset ? { today, reset } : { today } } };
}

/** "Port ran 24 hrs": put the hours on every hours line of that side (lube oil added lines are left alone). */
export function fillHours(day: DayLog, section: SectionDef, side: Side, hours: number): DayLog {
  let d = day;
  for (const r of section.rows) if (r.kind === 'hours') d = setToday(d, cellKey(section.id, r.id, side), hours);
  return d;
}

/** Start a new day from the last one: same hours run, chief, draft & tow, and the issues still open. */
export function copyFrom(prev: DayLog, date: string, settings: Settings): DayLog {
  const day = emptyDay(date, settings);
  const hoursKeys = new Set(
    settings.sections.flatMap((s) =>
      s.rows.filter((r) => r.kind === 'hours').flatMap((r) => sidesOf(s).map((side) => cellKey(s.id, r.id, side)))
    )
  );
  const cells: DayLog['cells'] = {};
  for (const [key, c] of Object.entries(prev.cells)) if (hoursKeys.has(key) && c.today != null) cells[key] = { today: c.today };
  return {
    ...day,
    chief: prev.chief || settings.chief,
    draftBow: prev.draftBow, draftStern: prev.draftStern, loads: prev.loads, empties: prev.empties,
    from: prev.from, to: prev.to,
    cells,
    issues: prev.issues.filter((i) => i.resolved !== 'Yes').map((i) => ({ ...i })),
  };
}

/** 82683 -> "82,683.00", the way the company log prints numbers. */
export function fmt2(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A typed value shown back in its box: 24, 1,107, 2.5 */
export function fmtIn(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Read a typed number. '' -> null; unreadable (like "-" mid-typing) -> undefined. Commas allowed. */
export function parseNum(text: string): number | null | undefined {
  const t = text.replace(/,/g, '').trim();
  if (!t) return null;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return undefined;
  return round2(Number(t));
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
export const todayISO = () => toISO(new Date());
export const shiftDate = (s: string, days: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
/** 2026-10-20 -> 10/20/2026 */
export const usDate = (s: string) => `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}`;
export const niceDate = (s: string) =>
  fromISO(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
