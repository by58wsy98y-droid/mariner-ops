export type Side = 'port' | 'stbd' | 'one'; // 'one' = single-column sections (Auxiliary Equipment)
export type FluidId = 'fuel' | 'lube' | 'water';

/** One line on an equipment sheet, e.g. "Fuel Filter Hours". */
export interface RowDef {
  id: string;
  label: string;
  /** 'hours' lines are filled by "ran __ hrs"; 'added' lines (lube oil added) are typed by hand. */
  kind: 'hours' | 'added';
}

/** One equipment sheet, e.g. Main Engines. */
export interface SectionDef {
  id: string;
  title: string;
  sided: boolean; // Port + Starboard columns, or a single column
  rows: RowDef[];
}

/** Prev values carried into a day: one per counter ("main.fuelFilter.port"), plus fluid balances. */
export interface Balances {
  counters: Record<string, number>;
  fluids: Record<FluidId, number>;
}

export interface Settings {
  boatName: string;
  chief: string; // default Chief Engineer for new days
  sections: SectionDef[];
  start: Balances; // Prev values for the very first day
  lastBackup: string | null; // ISO timestamp
}

export interface Cell {
  today: number | null;
  /** Counter reset this day (filter changed, overhaul...): Prev starts from `to` instead of yesterday's total. */
  reset?: { to: number; note: string };
}

export interface FluidDay {
  used: number | null;
  purchased: number | null;
  transferred: number | null; // transferred off the boat
}

export interface Issue {
  category: string;
  comment: string;
  resolved: '' | 'Yes' | 'No';
  notified: '' | 'Yes' | 'No'; // Port Engineer Notified
}

export interface DayLog {
  date: string; // YYYY-MM-DD, one log per day
  chief: string;
  fluids: Record<FluidId, FluidDay>;
  draftBow: number | null;
  draftStern: number | null;
  loads: number | null;
  empties: number | null;
  from: string;
  to: string;
  cells: Record<string, Cell>; // by counter key
  comments: string;
  issues: Issue[];
}

export interface CellCalc {
  prev: number;
  today: number;
  total: number;
  reset?: Cell['reset'];
}

export interface FluidCalc {
  begin: number;
  used: number;
  purchased: number;
  transferred: number;
  end: number;
}

export interface DayCalc {
  date: string;
  cells: Record<string, CellCalc>;
  fluids: Record<FluidId, FluidCalc>;
}
