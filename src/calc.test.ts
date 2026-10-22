import { describe, expect, it } from 'vitest';
import seed from '../seed/log-2026-10-20.json';
import {
  DEFAULT_SECTIONS, balancesBefore, cellKey, computeChain, copyFrom, emptyDay, fillHours, fmt2, parseNum,
  sectionKeys, setReset, setToday, shiftDate, usedFromEnding,
} from './calc';
import { normalizeSettings } from './storage';
import type { DayLog, Settings } from './types';

const settings: Settings = normalizeSettings(seed.settings as Partial<Settings>);
const oct20 = seed.day as unknown as DayLog;
const day = (date: string, patch: Partial<DayLog> = {}): DayLog => ({ ...emptyDay(date, settings), ...patch });
const K = (s: string, r: string, side: 'port' | 'stbd' | 'one') => cellKey(s, r, side);

describe('the printed 10/20 log', () => {
  const [calc] = computeChain([oct20], settings);

  it('every line has a port and starboard (or single) counter: 56 in all', () => {
    expect(sectionKeys(DEFAULT_SECTIONS)).toHaveLength(56);
    expect(Object.keys(seed.printed.totals)).toHaveLength(56);
  });

  it('Prev + Today reproduces every printed Total', () => {
    for (const [key, total] of Object.entries(seed.printed.totals)) expect([key, calc.cells[key].total]).toEqual([key, total]);
  });

  it('fuel, lube and water end where the printout ends', () => {
    expect(calc.fluids.fuel).toMatchObject({ begin: 76334, used: 978, end: 75356 });
    expect(calc.fluids.lube.end).toBe(1107);
    expect(calc.fluids.water.end).toBe(10500);
  });

  it("the next day's Prev is 10/20's Total", () => {
    const bal = balancesBefore([oct20], settings, '2026-10-21');
    expect(bal.counters[K('main', 'totalHours', 'port')]).toBe(82707);
    expect(bal.counters[K('gen', 'lubeAdded', 'stbd')]).toBe(2);
    expect(bal.counters[K('aux', 'serviceFilter', 'one')]).toBe(220);
    expect(bal.fluids).toEqual({ fuel: 75356, lube: 1107, water: 10500 });
  });
});

describe('the day-to-day chain', () => {
  const d21 = setToday(day('2026-10-21'), K('main', 'totalHours', 'port'), 24);

  it('Total = Prev + Today, and a blank Today carries Prev forward', () => {
    const c = computeChain([oct20, d21], settings)[1];
    expect(c.cells[K('main', 'totalHours', 'port')]).toMatchObject({ prev: 82707, today: 24, total: 82731 });
    expect(c.cells[K('main', 'totalHours', 'stbd')]).toMatchObject({ prev: 83580, today: 0, total: 83580 });
  });

  it('a skipped day just links to the last saved day', () => {
    const c = computeChain([oct20, day('2026-10-23')], settings)[1];
    expect(c.cells[K('main', 'turbo', 'stbd')].prev).toBe(14907);
  });

  it('editing an earlier day changes every later day', () => {
    const later = setToday(day('2026-10-22'), K('main', 'fuelFilter', 'port'), 24);
    const before = computeChain([oct20, d21, later], settings)[2].cells[K('main', 'fuelFilter', 'port')].total;
    const edited21 = setToday(d21, K('main', 'fuelFilter', 'port'), 10);
    const after = computeChain([oct20, edited21, later], settings)[2].cells[K('main', 'fuelFilter', 'port')].total;
    expect(after - before).toBe(10);
  });

  it('a reset starts the count again and the next day carries on from it', () => {
    let d = setReset(day('2026-10-21'), K('main', 'fuelFilter', 'port'), { to: 0, note: 'Changed fuel filters' });
    d = setToday(d, K('main', 'fuelFilter', 'port'), 6);
    const d22 = setToday(day('2026-10-22'), K('main', 'fuelFilter', 'port'), 24);
    const [, c21, c22] = computeChain([oct20, d, d22], settings);
    expect(c21.cells[K('main', 'fuelFilter', 'port')]).toMatchObject({ prev: 0, today: 6, total: 6, reset: { note: 'Changed fuel filters' } });
    expect(c22.cells[K('main', 'fuelFilter', 'port')]).toMatchObject({ prev: 6, total: 30 });
    expect(c21.cells[K('main', 'fuelFilter', 'stbd')].total).toBe(84); // other side untouched
  });

  it('removing a reset puts Prev back to yesterday', () => {
    const d = setReset(setReset(day('2026-10-21'), K('gen', 'airFilter', 'stbd'), { to: 0, note: 'x' }), K('gen', 'airFilter', 'stbd'), undefined);
    expect(computeChain([oct20, d], settings)[1].cells[K('gen', 'airFilter', 'stbd')].prev).toBe(55);
  });

  it('fluids: Ending = Beginning - Used + Purchased - Transferred off, chained', () => {
    const d = day('2026-10-21', {
      fluids: {
        fuel: { used: 1000, purchased: 15000, transferred: 500 },
        lube: { used: 5, purchased: null, transferred: null },
        water: { used: 400, purchased: 2000, transferred: null },
      },
    });
    const c = computeChain([oct20, d], settings)[1].fluids;
    expect(c.fuel).toEqual({ begin: 75356, used: 1000, purchased: 15000, transferred: 500, end: 88856 });
    expect(c.lube.end).toBe(1102);
    expect(c.water.end).toBe(12100);
  });

  it('typing the sounded Ending works out Used', () => {
    expect(usedFromEnding(75356, 0, 0, 74400)).toBe(956);
    expect(usedFromEnding(75356, 7500, 0, 81900)).toBe(956);
  });

  it('decimals add up cleanly (0.1 + 0.2 = 0.30)', () => {
    let d = setToday(day('2026-10-21'), K('gen', 'lubeAdded', 'stbd'), 0.1);
    let c = computeChain([oct20, d], settings)[1];
    d = setToday(day('2026-10-22'), K('gen', 'lubeAdded', 'stbd'), 0.2);
    c = computeChain([oct20, setToday(day('2026-10-21'), K('gen', 'lubeAdded', 'stbd'), 0.1), d], settings)[2];
    expect(c.cells[K('gen', 'lubeAdded', 'stbd')].total).toBe(2.3);
    expect(fmt2(0.1 + 0.2)).toBe('0.30');
  });
});

describe('quick fills', () => {
  it('"ran 24 hrs" fills hours lines on that side only, not lube oil added', () => {
    const gen = DEFAULT_SECTIONS.find((s) => s.id === 'gen')!;
    const d = fillHours(day('2026-10-21'), gen, 'port', 24);
    expect(d.cells[K('gen', 'majorOH', 'port')].today).toBe(24);
    expect(d.cells[K('gen', 'airFilter', 'port')].today).toBe(24);
    expect(d.cells[K('gen', 'lubeAdded', 'port')]).toBeUndefined();
    expect(d.cells[K('gen', 'majorOH', 'stbd')]).toBeUndefined();
  });

  it('starting from yesterday copies hours run, chief, draft & tow and open issues, not oil added or resets', () => {
    const y: DayLog = {
      ...oct20,
      cells: { ...oct20.cells, [K('main', 'racor', 'port')]: { today: 24, reset: { to: 0, note: 'Changed racors' } } },
      issues: [
        { category: 'Steering', comment: 'Standby pump', resolved: 'No', notified: 'Yes' },
        { category: 'Lights', comment: 'Head deck', resolved: 'Yes', notified: '' },
      ],
    };
    const d = copyFrom(y, '2026-10-21', settings);
    expect(d.date).toBe('2026-10-21');
    expect(d.cells[K('main', 'totalHours', 'port')]).toEqual({ today: 24 });
    expect(d.cells[K('gen', 'majorOH', 'port')]).toEqual({ today: 0 });
    expect(d.cells[K('gen', 'lubeAdded', 'stbd')]).toBeUndefined();
    expect(d.cells[K('main', 'racor', 'port')]).toEqual({ today: 24 });
    expect(d).toMatchObject({ chief: 'Joel Muamba', draftBow: 109, loads: 2, from: 'winona', to: 'stl', comments: '' });
    expect(d.issues.map((i) => i.category)).toEqual(['Steering']);
    expect(d.fluids.fuel.used).toBeNull();
  });
});

describe('number entry and dates', () => {
  it('reads typed numbers', () => {
    expect(parseNum('24')).toBe(24);
    expect(parseNum('1,107')).toBe(1107);
    expect(parseNum('2.5')).toBe(2.5);
    expect(parseNum('.5')).toBe(0.5);
    expect(parseNum('-30')).toBe(-30);
    expect(parseNum('')).toBeNull();
    expect(parseNum('-')).toBeUndefined();
    expect(parseNum('abc')).toBeUndefined();
  });
  it('prints like the company log', () => expect(fmt2(82707)).toBe('82,707.00'));
  it('steps across month ends', () => {
    expect(shiftDate('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDate('2026-11-01', -1)).toBe('2026-10-31');
  });
});
