// Printable copy of one or more days, laid out like the company's Daily Engine Maintenance sheets.
// The claude.ai page can't open a print dialog, so the log is printed from a saved PDF.
import { FLUIDS, cellKey, computeChain, fmt2, sectionsForDay, sidesOf, usDate } from './calc';
import type { AppData } from './storage';
import type { CellCalc, DayCalc, DayLog, Issue } from './types';

export interface PdfLib {
  jsPDF: any;
  autoTable: (doc: any, options: any) => void;
}

/** jsPDF and its table plugin, loaded by <script> tags in the page. */
export function pdfLibFromWindow(): PdfLib | null {
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF?.API?.autoTable) return null;
  return { jsPDF, autoTable: (doc, options) => doc.autoTable(options) };
}

const M = 36; // page margin, points
const blank = (n: number | null | undefined) => (n == null ? '' : fmt2(n));

// The PDF's built-in font only has Western characters: spell out the common symbols, mark anything else.
const SYMBOLS: Record<string, string> = {
  'Δ': 'D', '∆': 'D', '≥': '>=', '≤': '<=', '→': '->', '←': '<-', '✓': 'OK', '✔': 'OK', '×': 'x', '°': '°', '±': '+/-', '½': '1/2', '¼': '1/4', '¾': '3/4',
  '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...',
};
export const pdfText = (t: string) =>
  [...t].map((ch) => SYMBOLS[ch] ?? (ch.charCodeAt(0) <= 0xff ? ch : '?')).join('');
const resetText = (c: CellCalc) => (c.reset ? pdfText(c.reset.note) + (c.reset.to ? ` (from ${fmt2(c.reset.to)})` : '') : '');

export function buildPdf(lib: PdfLib, data: AppData, dates: string[]): ArrayBuffer {
  const { settings } = data;
  const calcs = new Map<string, DayCalc>(computeChain(data.entries, settings).map((c) => [c.date, c]));
  const days = data.entries.filter((e) => dates.includes(e.date));
  const doc = new lib.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const grid = {
    theme: 'grid',
    rowPageBreak: 'avoid',
    margin: { left: M, right: M, top: M, bottom: M + 14 },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: 20, lineColor: 90, lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: 225, textColor: 20, fontStyle: 'bold', halign: 'center' },
  };
  const pageDate: string[] = []; // which day each page belongs to, for the footer

  const heading = (day: DayLog) => {
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('DAILY ENGINE MAINTENANCE', W / 2, M + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(settings.boatName || '', W / 2, M + 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(usDate(day.date), W / 2, M + 35, { align: 'center' });
    return M + 50;
  };
  const room = (y: number, need: number, day: DayLog) => {
    if (y + need <= H - M - 14) return y;
    doc.addPage();
    return heading(day);
  };
  const title = (text: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(text, M, y);
    return y + 5;
  };
  const end = () => (doc as any).lastAutoTable.finalY as number;
  // How tall a table will be: draw it once on a scratch page and measure.
  const measure = (options: any) => {
    const scratch = new lib.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    lib.autoTable(scratch, { ...options, startY: M });
    return (scratch as any).lastAutoTable.finalY - M;
  };

  days.forEach((day, i) => {
    if (i > 0) doc.addPage();
    const firstPage = doc.getNumberOfPages();
    const calc = calcs.get(day.date)!;
    let y = heading(day);

    y = title(`Chief Engineer: ${pdfText(day.chief || '')}`, y + 4);
    lib.autoTable(doc, {
      ...grid,
      startY: y + 2,
      head: [['', 'Beginning Balance', 'Used', 'Purchased', 'Transferred', 'Ending Balance']],
      body: FLUIDS.map(({ id, label }) => {
        const c = calc.fluids[id];
        const f = day.fluids?.[id];
        return [label, fmt2(c.begin), f?.ending != null ? fmt2(c.used) : blank(f?.used), blank(f?.purchased), blank(f?.transferred), fmt2(c.end)];
      }),
      columnStyles: { 0: { fontStyle: 'bold', halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
    lib.autoTable(doc, {
      ...grid,
      startY: end() + 10,
      tableWidth: 520,
      body: [
        ['Draft (Bow)', blank(day.draftBow), 'Load', blank(day.loads), 'From', pdfText(day.from || '')],
        ['Draft (Stern)', blank(day.draftStern), 'Empty', blank(day.empties), 'To', pdfText(day.to || '')],
      ],
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 }, 1: { halign: 'right', cellWidth: 70 }, 2: { fontStyle: 'bold', cellWidth: 60 },
        3: { halign: 'right', cellWidth: 60 }, 4: { fontStyle: 'bold', cellWidth: 50 },
      },
    });
    y = end() + 22;

    for (const sec of sectionsForDay(settings.sections, day)) {
      const sides = sidesOf(sec);
      const row = (rowId: string) =>
        sides.flatMap((side) => {
          const c = calc.cells[cellKey(sec.id, rowId, side)] ?? { prev: 0, today: 0, total: 0 };
          return [resetText(c), fmt2(c.prev), fmt2(c.today), fmt2(c.total)];
        });
      const head = sec.sided
        ? [
            [{ content: 'Label', rowSpan: 2 }, { content: 'Port', colSpan: 4 }, { content: 'Starboard', colSpan: 4 }],
            ['Reset Comments', 'Prev', 'Today', 'Total', 'Reset Comments', 'Prev', 'Today', 'Total'],
          ]
        : [['Label', 'Reset Comments', 'Prev', 'Today', 'Total']];
      const numCols: Record<number, any> = {};
      sides.forEach((_, s) => [2, 3, 4].forEach((k) => (numCols[s * 4 + k] = { halign: 'right' })));
      const table = {
        ...grid,
        head,
        body: sec.rows.map((r) => [pdfText(r.label), ...row(r.id)]),
        columnStyles: { 0: { cellWidth: sec.sided ? 150 : 250 }, ...numCols },
      };
      // A sheet that won't fit goes to the next page whole (with the heading), instead of splitting.
      y = title(pdfText(sec.title), room(y, 22 + measure(table), day));
      lib.autoTable(doc, { ...table, startY: y + 2 });
      y = end() + 20;
    }

    const comments = {
      ...grid,
      rowPageBreak: 'auto', // one big cell: let long comments run onto the next page
      body: [[pdfText(day.comments || '') || ' ']],
      styles: { ...grid.styles, fontSize: 10, cellPadding: 6, minCellHeight: 40 },
    };
    const issues: Issue[] = day.issues?.length ? day.issues : [{ category: '', comment: '', resolved: '', notified: '' }];
    const issueTable = {
      ...grid,
      head: [['Category', 'Comment', 'Resolved?', 'Port Engineer Notified']],
      body: issues.map((x) => [pdfText(x.category), pdfText(x.comment), x.resolved, x.notified]),
      styles: { ...grid.styles, minCellHeight: 22 },
      columnStyles: { 0: { cellWidth: 120 }, 2: { cellWidth: 80, halign: 'center' }, 3: { cellWidth: 110, halign: 'center' } },
    };
    y = title('Comments:', room(y, 22 + Math.min(measure(comments), 200) + 14 + Math.min(measure(issueTable), 120), day));
    lib.autoTable(doc, { ...comments, startY: y + 2 });
    lib.autoTable(doc, { ...issueTable, startY: end() + 14 });
    for (let p = firstPage; p <= doc.getNumberOfPages(); p++) pageDate[p] = day.date;
  });

  // Footer: boat, date, page x of y within that day's log.
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    const date = pageDate[p];
    const pages = pageDate.filter((d) => d === date).length;
    const n = pageDate.slice(0, p + 1).filter((d) => d === date).length;
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`${settings.boatName || ''}  ·  ${date ? usDate(date) : ''}`, M, H - M + 6);
    doc.text(`Page ${n} of ${pages}`, W - M, H - M + 6, { align: 'right' });
  }
  return doc.output('arraybuffer');
}
