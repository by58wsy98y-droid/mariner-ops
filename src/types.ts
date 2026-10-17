export type Side = 'PORT' | 'STBD';
export type DayTankMode = 'none' | 'one' | 'perSide';

/** One tank in the boat's layout. `id` is stable so old entries keep matching after labels change. */
export interface TankDef {
  id: string;
  side: Side;
  label: string;
  isDayTank: boolean;
}

export interface Balances {
  fuel: number;
  lube: number;
  water: number;
}

export interface Settings {
  boatName: string;
  capacity: number; // gallons when full
  portLabels: string[]; // one per main tank, PORT side
  stbdLabels: string[]; // one per main tank, STBD side
  dayTanks: DayTankMode;
  truckSize: number; // gallons per truck load
  alertTrucks: number[]; // alert levels, in number of trucks
  start: Balances | null; // on hand before the first-ever entry; null = not set yet
  lastBackup: string | null; // ISO timestamp
}

export interface TankReading {
  tankId: string;
  label: string; // label at time of entry
  side: Side;
  sounding: string; // as typed, e.g. 9'4
  gallons: number | null;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD, one entry per date
  tanks: TankReading[];
  fuelReceived: number;
  lubeReceived: number;
  lubeUsed: number;
  waterReceived: number;
  waterUsed: number;
}

export interface FuelReport {
  previous: number;
  received: number;
  total: number;
  onHand: number;
  used: number;
}
// Lube oil and water have the same five rows.
export type StockReport = FuelReport;

export interface DayResult {
  date: string;
  fuel: FuelReport;
  lube: StockReport;
  water: StockReport;
}

export interface TruckAlert {
  trucks: number;
  gallons: number; // trucks * truckSize
  threshold: number; // capacity - gallons
  onHand: number;
  roomToFull: number;
}
