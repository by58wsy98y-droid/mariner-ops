import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import seed from '../seed/sample-log.json';
import { buildPdf } from './pdf';
import { normalizeSettings } from './storage';
import type { DayLog, Settings } from './types';

const data = {
  settings: normalizeSettings(seed.settings as Partial<Settings>),
  entries: [seed.day as unknown as DayLog, { ...(seed.day as unknown as DayLog), date: '2026-10-21' }],
};

describe('printable PDF', () => {
  it('makes a PDF with the sheets, numbers and comments of the chosen days', () => {
    const bytes = buildPdf({ jsPDF, autoTable }, data, ['2026-10-20', '2026-10-21']);
    const text = new TextDecoder('latin1').decode(new Uint8Array(bytes));
    expect(text.startsWith('%PDF')).toBe(true);
    for (const s of ['DAILY ENGINE MAINTENANCE', 'Sample Boat', '10/20/2026', '10/21/2026', 'Chief Engineer: Sample Chief',
      'Main Engines', 'Gear Boxes', 'Generator Engines', 'Hot Ends', 'Auxiliary Equipment', '82,707.00', '114,408.00',
      '45,100.00', '75,356.00', 'port a', 'SAMPLE LINE SIX', 'Port Engineer Notified'])
      expect(text, s).toContain(s);
    // the 21st starts from the 20th's totals
    expect(text).toContain('82,731.00');
  });
});
