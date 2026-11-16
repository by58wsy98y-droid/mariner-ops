import { describe, expect, it } from 'vitest';
import { buildCorpus, docType } from './corpus';
import { cardsFor } from './fleet';
import { parseInline, parseMarkdown } from './markdown';
import { buildIndex, search } from './search';

const card = `---\ntitle: Reduction Gear Maintenance\nmpc_code: MPC-E-312-QT\nfrequency: Quarterly\nequipment: gear\n---\n# Reduction Gear Maintenance\n\n## Step 2 — Quarterly\n\n### 3. Inspect Mounting Bolts\nStrike each bolt — a loose bolt can be identified by an unusual sound or lack of hammer bounce-back\n\n![Figure 1](images/fig-1.jpg)\n`;
const boat = (slug: string, fm: string) => ({ path: `boats/${slug}/boat.md`, text: `---\nboat: M/V ${slug}\n${fm}\n---\n` });
const c = buildCorpus([
  { path: 'maintenance/mpc-e-312-qt-reduction-gear-maintenance.md', text: card },
  { path: 'maintenance/README.md', text: '# Maintenance procedure cards' },
  boat('with-gear', 'gear: 4.75:1 Reintjes\ngear_make: Reintjes'),
  boat('no-gear', 'engine_model: EMD 12-710'),
]);

describe('maintenance procedure cards', () => {
  it('are their own kind of page (the folder README is not one)', () => {
    expect(docType('maintenance/mpc-e-312-qt-reduction-gear-maintenance.md')).toBe('maintenance');
    expect(docType('maintenance/README.md')).toBeNull();
  });

  it('show on the boats that have the equipment they are for', () => {
    expect(cardsFor(c.boats.find((b) => b.slug === 'with-gear')!, c.docs).map((d) => d.fm.mpc_code)).toEqual(['MPC-E-312-QT']);
    expect(cardsFor(c.boats.find((b) => b.slug === 'no-gear')!, c.docs)).toEqual([]);
  });

  it('are found by their MPC code and by what a step says', () => {
    const idx = buildIndex(c);
    expect(search(idx, 'MPC-E-312-QT')[0].doc.type).toBe('maintenance');
    expect(search(idx, 'loose bolt bounce')[0].snippet).toMatch(/hammer bounce-back/);
  });

  it('a picture line is a figure with its caption; pictures never come from another site', () => {
    expect(parseInline('![Figure 1](images/fig-1.jpg)')).toEqual([{ t: 'img', src: 'images/fig-1.jpg', alt: 'Figure 1' }]);
    const p = parseMarkdown('![](images/a.jpg)')[0];
    expect(p).toEqual({ t: 'p', c: [{ t: 'img', src: 'images/a.jpg', alt: '' }] });
    expect(parseInline('see [the manual](https://example.com/x.pdf)')[1]).toMatchObject({ t: 'link' }); // links are unchanged
  });
});
