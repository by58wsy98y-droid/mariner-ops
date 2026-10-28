// Fuel log arithmetic, matching the boat's workbook (docs/Steven_Crowley_Fuel_Log.xlsx, Daily Log):
//   gallons per tank = tank table at the sounding, half inches interpolated, rounded to the gallon
//   total fuel = port + starboard;  used = yesterday's total + received - today's total
//   room to full = capacity - total;  trucks that fit = whole truck loads in the room
//   lube total = port + starboard L/O; lube used = yesterday's lube total + received - today's
//   water used = yesterday's water + received - today's water
import { parseFrontmatter, fmText } from './frontmatter';
import { splitRow } from './markdown';

export type Table = Map<number, number>; // inches -> gallons, in order of inches

export function parseTankCsv(text: string): Table {
  const rows: [number, number][] = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    const [i, g] = line.split(',').map((s) => s.trim());
    if (i !== '' && g !== undefined && g !== '' && !isNaN(+i) && !isNaN(+g)) rows.push([+i, +g]);
  }
  return new Map(rows.sort((a, b) => a[0] - b[0]));
}

export const tableMax = (t: Table) => Math.max(...t.keys());

/** Gallons at a sounding, worked out between the table lines. null = outside the table (or not a number). */
export function lookup(t: Table, inches: number): number | null {
  if (!Number.isFinite(inches) || !t.size) return null;
  let below: [number, number] | null = null;
  for (const [i, g] of t) {
    if (i === inches) return Math.round(g);
    if (i < inches) { below = [i, g]; continue; }
    if (!below) return null; // under the first line
    return Math.round(below[1] + ((inches - below[0]) / (i - below[0])) * (g - below[1]));
  }
  // Past the last line: within its last inch the workbook uses that line, beyond is off the table.
  return below && inches < Math.floor(below[0]) + 1 ? Math.round(below[1]) : null;
}

/** Tanks on a boat, from fuel/tank-tables/tank-<id>.csv. "tank-2.csv" serves #2 port and starboard; "tank-2p.csv" only port. */
export interface Tank { key: string; label: string; side: 'P' | 'S'; table: Table }

export function tanksFrom(files: Map<string, string>, boat: string): Tank[] {
  const prefix = `boats/${boat}/fuel/tank-tables/`;
  const found: { id: string; side?: 'P' | 'S'; table: Table }[] = [];
  for (const [path, text] of files) {
    if (!path.startsWith(prefix)) continue;
    const m = /^tank-(.+?)([ps])?\.csv$/i.exec(path.slice(prefix.length));
    if (m) found.push({ id: m[1], side: m[2] ? (m[2].toUpperCase() as 'P' | 'S') : undefined, table: parseTankCsv(text) });
  }
  const order = (id: string) => (isNaN(+id) ? 1e6 : +id);
  const tanks: Tank[] = [];
  for (const side of ['P', 'S'] as const)
    for (const f of found.filter((x) => !x.side || x.side === side).sort((a, b) => order(a.id) - order(b.id) || a.id.localeCompare(b.id)))
      if (!(f.side === undefined && found.some((x) => x.id === f.id && x.side === side)))
        tanks.push({ key: `${side}${f.id}`, label: `#${f.id}`, side, table: f.table });
  return tanks;
}

export interface FuelEntry {
  date: string; // YYYY-MM-DD
  inches: Record<string, number | null>; // by tank key, e.g. P2
  received: number | null;
  lubeP: number | null;
  lubeS: number | null;
  lubeReceived: number | null;
  water: number | null;
  waterReceived: number | null;
  notes: string;
}

export interface Prev { date: string; fuel: number | null; lube: number | null; water: number | null }

export interface FuelCalc {
  gallons: Record<string, number | null>;
  bad: string[]; // tank keys whose sounding is past the table
  port: number | null;
  stbd: number | null;
  total: number | null;
  used: number | null;
  room: number | null;
  trucks: number | null;
  lubeTotal: number | null;
  lubeUsed: number | null;
  waterUsed: number | null;
}

const sum = (xs: (number | null)[]) => (xs.some((x) => x != null) ? xs.reduce<number>((a, x) => a + (x ?? 0), 0) : null);

export function computeFuel(e: FuelEntry, tanks: Tank[], prev: Prev | null, capacity: number, truck: number): FuelCalc {
  const gallons: Record<string, number | null> = {};
  const bad: string[] = [];
  for (const t of tanks) {
    const x = e.inches[t.key];
    if (x == null) { gallons[t.key] = null; continue; }
    const g = lookup(t.table, x);
    if (g == null) bad.push(t.key);
    gallons[t.key] = g;
  }
  const port = sum(tanks.filter((t) => t.side === 'P').map((t) => gallons[t.key]));
  const stbd = sum(tanks.filter((t) => t.side === 'S').map((t) => gallons[t.key]));
  const total = sum([port, stbd]);
  const room = total != null && capacity > 0 ? capacity - total : null; // no capacity set: no room, no alerts
  const trucks = room != null && truck > 0 ? Math.max(0, Math.floor(room / truck)) : null;
  const lubeTotal = sum([e.lubeP, e.lubeS]);
  const u = usedFrom(prev, { fuel: total, received: e.received, lube: lubeTotal, lubeReceived: e.lubeReceived, water: e.water, waterReceived: e.waterReceived });
  return { gallons, bad, port, stbd, total, room, trucks, lubeTotal, ...u };
}

/** The day's numbers the "used" figures come from. */
export interface DayTotals { fuel: number | null; received: number | null; lube: number | null; lubeReceived: number | null; water: number | null; waterReceived: number | null }

/** Used = yesterday + received - today, for fuel, lube and water. */
export function usedFrom(prev: Prev | null, d: DayTotals): { used: number | null; lubeUsed: number | null; waterUsed: number | null } {
  return {
    used: d.fuel != null && prev?.fuel != null ? prev.fuel + (d.received ?? 0) - d.fuel : null,
    lubeUsed: d.lube != null && prev?.lube != null ? prev.lube + (d.lubeReceived ?? 0) - d.lube : null,
    waterUsed: d.water != null && prev?.water != null ? prev.water + (d.waterReceived ?? 0) - d.water : null,
  };
}

/** Truck-load alert: loads come as 1 or 2 trucks, nothing in between. */
export function truckAlert(room: number | null, truck: number): string | null {
  if (room == null || truck <= 0) return null;
  if (room >= 2 * truck) return `Room for 2 trucks (${(2 * truck).toLocaleString('en-US')} gal)`;
  if (room >= truck) return `Room for 1 truck (${truck.toLocaleString('en-US')} gal)`;
  return null;
}

/** Capacity and truck size for a boat: boat.md fields fuel_capacity_gal / truck_load_gal, else the first number in fuel_capacity_full. */
export function fuelSettings(boatText: string): { capacity: number; truck: number } {
  const { fm } = parseFrontmatter(boatText);
  const num = (s: string) => { const m = /(\d[\d,]*(?:\.\d+)?)/.exec(s); return m ? +m[1].replace(/,/g, '') : NaN; };
  const cap = num(fmText(fm.fuel_capacity_gal)) || num(fmText(fm.fuel_capacity_full)) || 0;
  const truck = num(fmText(fm.truck_load_gal)) || 7500;
  return { capacity: cap, truck };
}

// ---------- the log files: fuel/log-YYYY-MM.md (summary table) and fuel/log-YYYY-MM.csv (every number) ----------

export const CSV_COLS = [
  'date', 'tank_inches', 'tank_gallons', 'port_total', 'stbd_total', 'total_fuel', 'fuel_received', 'fuel_used',
  'room_to_full', 'trucks_fit', 'alert', 'lube_port', 'lube_stbd', 'lube_received', 'lube_total', 'lube_used',
  'water', 'water_received', 'water_used', 'notes',
];

const n = (s: string | undefined) => { const m = /-?\d[\d,]*(?:\.\d+)?/.exec(s ?? ''); return m ? +m[0].replace(/,/g, '') : null; };
const csvCell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

const fmtGal = (x: number | null) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));

/** Days already logged for a boat (both file kinds), oldest first. */
export interface LoggedDay {
  date: string; fuel: number | null; lube: number | null; water: number | null; received: number | null; used: number | null; notes: string;
  waterReceived?: number | null; // month-table days: from "(+6,000 rec'd)" in the water cell
  detail?: Record<string, string>; // CSV days: every column
}

const recd = (waterCell: string | undefined) => { const m = /\+\s*([\d,]+)\s*rec/i.exec(waterCell ?? ''); return m ? +m[1].replace(/,/g, '') : null; };

/** Where the month table is in a fuel/log-YYYY-MM.md file, and which column is which. */
function mdTable(text: string) {
  const lines = text.split('\n');
  const h = lines.findIndex((l) => /^\|\s*Date\s*\|/i.test(l));
  if (h < 0) return null;
  let end = h + 2;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const head = splitRow(lines[h]).map((s) => s.toLowerCase());
  const col = (re: RegExp) => head.findIndex((x) => re.test(x));
  const [date, fuel, received, used, lube, water, notes] = [/^date/, /total fuel|fuel/, /received/, /used/, /lube/, /water/, /notes/].map(col);
  return { lines, h, end, cols: { date, fuel, received, used, lube, water, notes } };
}
const rowKey = (l: string) => { const m = /^\|\s*(\d{1,2})\/(\d{1,2})/.exec(l); return m ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}` : ''; };

export function loggedDays(files: Map<string, string>, boat: string): LoggedDay[] {
  const days = new Map<string, LoggedDay>();
  const dir = `boats/${boat}/fuel/`;
  for (const [path, text] of files) {
    const m = /^log-(\d{4})-(\d{2})\.(md|csv)$/.exec(path.startsWith(dir) ? path.slice(dir.length) : '');
    if (!m) continue;
    if (m[3] === 'md') {
      const t = mdTable(parseFrontmatter(text).body);
      if (!t) continue;
      const k = t.cols;
      for (const l of t.lines.slice(t.h + 2, t.end)) {
        const c = splitRow(l);
        const md = /^(\d{1,2})\/(\d{1,2})/.exec(c[k.date] ?? '');
        if (!md) continue;
        const date = `${m[1]}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
        if (!days.has(date))
          days.set(date, { date, fuel: n(c[k.fuel]), lube: n(c[k.lube]), water: n(c[k.water]), received: n(c[k.received]), used: n(c[k.used]), notes: c[k.notes] ?? '', waterReceived: recd(c[k.water]) });
      }
    } else {
      const rows = parseCsv(text);
      const head = rows[0] ?? [];
      for (const r of rows.slice(1)) {
        const rec = Object.fromEntries(head.map((k, i) => [k, r[i] ?? '']));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) continue;
        days.set(rec.date, { // the CSV has every number, so it wins over the summary table
          date: rec.date, fuel: n(rec.total_fuel), lube: n(rec.lube_total), water: n(rec.water), received: n(rec.fuel_received),
          used: n(rec.fuel_used), notes: rec.notes, detail: rec,
        });
      }
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Yesterday's numbers for the chain: the latest logged day before this date (any month). */
export function previousDay(days: LoggedDay[], date: string): Prev | null {
  const before = days.filter((d) => d.date < date);
  const last = before[before.length - 1];
  return last ? { date: last.date, fuel: last.fuel, lube: last.lube, water: last.water } : null;
}

const mmdd = (date: string) => `${date.slice(5, 7)}/${date.slice(8, 10)}`;
const cellText = (s: string) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

/** The month's summary table with this day added or replaced. Rows stay in date order; everything else in the file is kept. */
export function upsertFuelMd(text: string | null, boatName: string, e: FuelEntry, c: FuelCalc): string {
  const month = e.date.slice(0, 7);
  const water = waterCell(e.water, e.waterReceived, c.waterUsed);
  const row = `| ${mmdd(e.date)} | ${fmtGal(c.total)} | ${e.received ? fmtGal(e.received) : '—'} | ${fmtGal(c.used)} | ${fmtGal(c.lubeTotal)} | ${water} | ${cellText(e.notes)} |`;
  const doc = text ?? `---\nboat: ${boatName}\nmonth: ${month}\n---\n\n# Fuel log notes — ${new Date(+month.slice(0, 4), +month.slice(5, 7) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}\n\n| Date | Total fuel (gal) | Received | Used | Lube total | Water | Notes |\n|---|---|---|---|---|---|---|\n`;
  const lines = doc.split('\n');
  const h = lines.findIndex((l) => /^\|\s*Date\s*\|/i.test(l));
  if (h < 0) return doc.replace(/\n*$/, '\n\n') + '| Date | Total fuel (gal) | Received | Used | Lube total | Water | Notes |\n|---|---|---|---|---|---|---|\n' + row + '\n';
  let end = h + 2;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const body = lines.slice(h + 2, end);
  const key = (l: string) => { const m = /^\|\s*(\d{1,2})\/(\d{1,2})/.exec(l); return m ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}` : ''; };
  const at = body.findIndex((l) => key(l) === mmdd(e.date));
  if (at >= 0) body[at] = row;
  else {
    const pos = body.findIndex((l) => key(l) > mmdd(e.date));
    body.splice(pos < 0 ? body.length : pos, 0, row);
  }
  return [...lines.slice(0, h + 2), ...body, ...lines.slice(end)].join('\n');
}

export function upsertFuelCsv(text: string | null, tankKeys: string[], e: FuelEntry, c: FuelCalc, truck: number): string {
  const rows = text ? parseCsv(text) : [];
  const head = rows.length ? rows[0] : CSV_COLS;
  const rec: Record<string, unknown> = {
    date: e.date,
    tank_inches: tankKeys.map((k) => `${k}=${e.inches[k] ?? ''}`).join(' '),
    tank_gallons: tankKeys.map((k) => `${k}=${c.gallons[k] ?? ''}`).join(' '),
    port_total: c.port, stbd_total: c.stbd, total_fuel: c.total, fuel_received: e.received, fuel_used: c.used,
    room_to_full: c.room, trucks_fit: c.trucks, alert: truckAlert(c.room, truck) ?? '',
    lube_port: e.lubeP, lube_stbd: e.lubeS, lube_received: e.lubeReceived, lube_total: c.lubeTotal, lube_used: c.lubeUsed,
    water: e.water, water_received: e.waterReceived, water_used: c.waterUsed, notes: e.notes,
  };
  const line = head.map((k) => csvCell(rec[k])).join(',');
  const body = rows.slice(1).map((r) => r.map(csvCell).join(','));
  const at = rows.slice(1).findIndex((r) => r[0] === e.date);
  if (at >= 0) body[at] = line;
  else body.push(line);
  body.sort((a, b) => a.slice(0, 10).localeCompare(b.slice(0, 10)));
  return [head.join(','), ...body].join('\n') + '\n';
}

/** Read a saved CSV day back into the entry form. */
export function entryFromDetail(d: LoggedDay, date: string): FuelEntry | null {
  if (!d.detail) return null;
  const inches: Record<string, number | null> = {};
  for (const pair of (d.detail.tank_inches ?? '').split(' ')) {
    const [k, v] = pair.split('=');
    if (k) inches[k] = v === '' || v === undefined ? null : +v;
  }
  const num = (k: string) => (d.detail![k] === '' || d.detail![k] === undefined ? null : +d.detail![k]);
  return {
    date, inches, received: num('fuel_received'), lubeP: num('lube_port'), lubeS: num('lube_stbd'),
    lubeReceived: num('lube_received'), water: num('water'), waterReceived: num('water_received'), notes: d.detail.notes ?? '',
  };
}

/** The month's table without this day (the rest of the file kept). */
export function removeFuelMd(text: string, date: string): string {
  const key = `${date.slice(5, 7)}/${date.slice(8, 10)}`;
  const lines = text.split('\n');
  const h = lines.findIndex((l) => /^\|\s*Date\s*\|/i.test(l));
  if (h < 0) return text;
  let end = h + 2;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const rows = lines.slice(h + 2, end).filter((l) => {
    const m = /^\|\s*(\d{1,2})\/(\d{1,2})/.exec(l);
    return !(m && `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}` === key);
  });
  return [...lines.slice(0, h + 2), ...rows, ...lines.slice(end)].join('\n');
}

export function removeFuelCsv(text: string, date: string): string {
  const rows = parseCsv(text);
  if (!rows.length) return text;
  return [rows[0], ...rows.slice(1).filter((r) => r[0] !== date)].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

// ---------- keeping "used" right when an earlier day is added, corrected or deleted ----------

const waterCell = (water: number | null, received: number | null, used: number | null) => {
  const extras = [received ? `+${fmtGal(received)} rec'd` : '', used != null ? `${fmtGal(used)} used` : ''].filter(Boolean);
  return water == null ? '—' : fmtGal(water) + (extras.length ? ` (${extras.join(', ')})` : '');
};

/** The month table with one day's Used (and water used) worked out again against `prev`. */
export function rechainFuelMd(text: string, date: string, prev: Prev | null): string {
  const t = mdTable(text);
  if (!t) return text;
  const at = t.lines.findIndex((l, i) => i >= t.h + 2 && i < t.end && rowKey(l) === mmdd(date));
  if (at < 0) return text;
  const k = t.cols;
  const c = splitRow(t.lines[at]);
  const u = usedFrom(prev, { fuel: n(c[k.fuel]), received: n(c[k.received]), lube: null, lubeReceived: null, water: n(c[k.water]), waterReceived: recd(c[k.water]) });
  if (k.used >= 0) c[k.used] = fmtGal(u.used);
  if (k.water >= 0) c[k.water] = waterCell(n(c[k.water]), recd(c[k.water]), u.waterUsed);
  t.lines[at] = `| ${c.map((x) => x.replace(/\|/g, '\\|')).join(' | ')} |`;
  return t.lines.join('\n');
}

/** The CSV with one day's fuel, lube and water used worked out again against `prev`. */
export function rechainFuelCsv(text: string, date: string, prev: Prev | null): string {
  const rows = parseCsv(text);
  const head = rows[0] ?? [];
  const r = rows.find((x, i) => i > 0 && x[0] === date);
  if (!r) return text;
  const get = (k: string) => { const i = head.indexOf(k); return i < 0 || r[i] === '' || r[i] === undefined ? null : +r[i]; };
  const u = usedFrom(prev, {
    fuel: get('total_fuel'), received: get('fuel_received'), lube: get('lube_total'), lubeReceived: get('lube_received'), water: get('water'), waterReceived: get('water_received'),
  });
  const put = (k: string, v: number | null) => { const i = head.indexOf(k); if (i >= 0) r[i] = v == null ? '' : String(v); };
  put('fuel_used', u.used); put('lube_used', u.lubeUsed); put('water_used', u.waterUsed);
  return rows.map((x) => x.map(csvCell).join(',')).join('\n') + '\n';
}
