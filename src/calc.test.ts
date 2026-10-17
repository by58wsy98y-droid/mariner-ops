import { describe, expect, it } from 'vitest';
import { computeChain, parseSounding, previousBalances, tankLayout, tankTotal, truckAlert, DEFAULT_SETTINGS } from './calc';
import type { DayEntry, TankReading } from './types';

const tanks = (...g: number[]): TankReading[] =>
  g.map((gallons, i) => ({ tankId: `T${i}`, label: `#${i}`, side: 'PORT', sounding: '', gallons }));

const day = (date: string, gallons: number[], o: Partial<DayEntry> = {}): DayEntry => ({
  date, tanks: tanks(...gallons), fuelReceived: 0, lubeReceived: 0, lubeUsed: 0, waterReceived: 0, waterUsed: 0, ...o,
});

describe('parseSounding', () => {
  it.each([
    ["9'4", 112], ["9' 4\"", 112], ['9\'4"', 112], ["9'", 108], ['118', 118], ["0'11", 11], ['9’4', 112],
  ])('%s -> %d in', (s, n) => expect(parseSounding(s)).toBe(n));
  it('blank / junk -> null', () => {
    expect(parseSounding('')).toBeNull();
    expect(parseSounding('abc')).toBeNull();
  });
});

describe('tank layout', () => {
  it('default is #2-#5 each side plus one DT', () => {
    const t = tankLayout(DEFAULT_SETTINGS);
    expect(t).toHaveLength(9);
    expect(t.filter((x) => x.side === 'PORT' && !x.isDayTank).map((x) => x.label)).toEqual(['#2', '#3', '#4', '#5']);
    expect(t.filter((x) => x.isDayTank)).toHaveLength(1);
  });
  it('day tanks: none / per side', () => {
    expect(tankLayout({ ...DEFAULT_SETTINGS, dayTanks: 'none' })).toHaveLength(8);
    expect(tankLayout({ ...DEFAULT_SETTINGS, dayTanks: 'perSide' }).filter((x) => x.isDayTank)).toHaveLength(2);
  });
});

describe('fuel / lube / water chain (matches spreadsheet formulas)', () => {
  const start = { fuel: 80000, lube: 500, water: 2000 };

  it('TOTAL is the sum of all gallons cells, blanks count 0', () => {
    expect(tankTotal([...tanks(100, 200), { tankId: 'x', label: 'x', side: 'STBD', sounding: '', gallons: null }])).toBe(300);
  });

  it('day 1 uses starting balances; fuel used = prev + received - on hand', () => {
    const [d1] = computeChain([day('2026-10-01', [40000, 38000])], start);
    expect(d1.fuel).toEqual({ previous: 80000, received: 0, total: 80000, onHand: 78000, used: 2000 });
  });

  it('lube and water: on hand = prev + received - used', () => {
    const [d1] = computeChain([day('2026-10-01', [0], { lubeReceived: 55, lubeUsed: 5, waterReceived: 1000, waterUsed: 300 })], start);
    expect(d1.lube).toEqual({ previous: 500, received: 55, total: 555, onHand: 550, used: 5 });
    expect(d1.water).toEqual({ previous: 2000, received: 1000, total: 3000, onHand: 2700, used: 300 });
  });

  it('each day links to the previous day, in date order, across months', () => {
    const entries = [
      day('2026-11-01', [76000], { fuelReceived: 7500 }),
      day('2026-10-31', [78000], { lubeUsed: 10, waterUsed: 100 }),
    ];
    const [a, b] = computeChain(entries, start);
    expect(a.date).toBe('2026-10-31');
    expect(b.fuel).toEqual({ previous: 78000, received: 7500, total: 85500, onHand: 76000, used: 9500 });
    expect(b.lube.previous).toBe(490);
    expect(b.water.previous).toBe(1900);
  });

  it('editing an earlier day changes every later day', () => {
    const e = [day('2026-10-01', [78000]), day('2026-10-02', [76000]), day('2026-10-03', [74000])];
    expect(computeChain(e, start)[2].fuel.previous).toBe(76000);
    e[0] = day('2026-10-01', [79000], { lubeUsed: 20 });
    const c = computeChain(e, start);
    expect(c[1].fuel.used).toBe(3000);
    expect(c[2].lube.previous).toBe(480);
  });

  it('forgotten fuel received shows as negative used', () => {
    const [d] = computeChain([day('2026-10-01', [87000])], start);
    expect(d.fuel.used).toBe(-7000);
  });

  it('previousBalances picks the last entry before the date', () => {
    const e = [day('2026-10-01', [78000]), day('2026-10-05', [70000])];
    expect(previousBalances(e, start, '2026-10-03').fuel).toBe(78000);
    expect(previousBalances(e, start, '2026-10-01').fuel).toBe(80000);
    expect(previousBalances(e, start, '2026-10-09').fuel).toBe(70000);
  });
});

describe('truck alerts (capacity 91,500, 7,500/truck, levels 1 & 2)', () => {
  const a = (onHand: number) => truckAlert(onHand, 91500, 7500, [1, 2]);
  it('no alert above 84,000', () => expect(a(84001)).toBeNull());
  it('1 truck at exactly 84,000', () => expect(a(84000)).toMatchObject({ trucks: 1, gallons: 7500, threshold: 84000, roomToFull: 7500 }));
  it('1 truck between thresholds', () => expect(a(80000)?.trucks).toBe(1));
  it('2 trucks at exactly 76,500', () => expect(a(76500)).toMatchObject({ trucks: 2, gallons: 15000, threshold: 76500 }));
  it('highest level wins well below', () => expect(a(50000)).toMatchObject({ trucks: 2, roomToFull: 41500 }));
  it('custom levels and truck size', () => expect(truckAlert(60000, 91500, 8000, [1, 2, 3])).toMatchObject({ trucks: 3, gallons: 24000 }));
});
