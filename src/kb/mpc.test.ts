import { describe, expect, it } from 'vitest';
import { buildCorpus, docType, isCard, procedureFolder } from './corpus';
import { folderName, procedureFolders, proceduresFor } from './fleet';
import { parseInline, parseMarkdown } from './markdown';
import { buildIndex, search } from './search';

const card = `---\ntitle: Reduction Gear Maintenance\nmpc_code: MPC-E-312-QT\nfrequency: Quarterly\n---\n# Reduction Gear Maintenance\n\n## Step 2 — Quarterly\n\n### 3. Inspect Mounting Bolts\nStrike each bolt — a loose bolt can be identified by an unusual sound or lack of hammer bounce-back\n\n![Figure 1](images/fig-1.jpg)\n`;
const boat = (slug: string, fm: string) => ({ path: `boats/${slug}/boat.md`, text: `---\nboat: M/V ${slug}\n${fm}\n---\n` });
const c = buildCorpus([
  { path: 'procedures/general/mpc-e-312-qt-reduction-gear-maintenance.md', text: card },
  { path: 'procedures/cat-3612/valve-lash.md', text: '---\ntitle: Valve lash check\n---\n# Valve lash check\n' },
  { path: 'procedures/README.md', text: '# Procedures' },
  boat('kay', 'engine_model: CAT 3612'),
  boat('ray', 'engine_model: CAT 3612'),
  boat('chad', 'engine_model: EMD 20-710G7C-T3'),
]);

describe('procedures in folders', () => {
  it('are procedures filed by folder; the README is not one', () => {
    expect(docType('procedures/general/mpc-e-312-qt-reduction-gear-maintenance.md')).toBe('procedure');
    expect(docType('procedures/README.md')).toBeNull();
    expect(procedureFolder('procedures/cat-3612/valve-lash.md')).toBe('cat-3612');
    expect(isCard(c.docs.find((d) => d.path.includes('mpc-e-312'))!)).toBe(true);
    expect(isCard(c.docs.find((d) => d.path.includes('valve-lash'))!)).toBe(false);
  });

  it('folders: General equipment first, then one per engine model in the fleet (empty ones too)', () => {
    const fs = procedureFolders(c.boats, c.docs);
    expect(fs.map((f) => [f.slug, f.name, f.docs.length, f.boats.length])).toEqual([
      ['general', 'General equipment', 1, 3],
      ['cat-3612', 'CAT 3612', 1, 2],
      ['emd-20-710g7c-t3', 'EMD 20-710G7C-T3', 0, 1],
    ]);
    expect(folderName(c.boats, 'cat-3612')).toBe('CAT 3612');
  });

  it('a boat gets the General procedures and those for its engine', () => {
    const fs = procedureFolders(c.boats, c.docs);
    const titles = (slug: string) => proceduresFor(c.boats.find((b) => b.slug === slug)!, fs).map((d) => d.title);
    expect(titles('kay')).toEqual(['Reduction Gear Maintenance', 'Valve lash check']);
    expect(titles('chad')).toEqual(['Reduction Gear Maintenance']);
  });

  it('are found by their MPC code and by what a step says', () => {
    const idx = buildIndex(c);
    expect(search(idx, 'MPC-E-312-QT')[0].doc.title).toBe('Reduction Gear Maintenance');
    expect(search(idx, 'loose bolt bounce')[0].snippet).toMatch(/hammer bounce-back/);
  });

  it('a picture line is a figure with its caption; pictures never come from another site', () => {
    expect(parseInline('![Figure 1](images/fig-1.jpg)')).toEqual([{ t: 'img', src: 'images/fig-1.jpg', alt: 'Figure 1' }]);
    expect(parseMarkdown('![](images/a.jpg)')[0]).toEqual({ t: 'p', c: [{ t: 'img', src: 'images/a.jpg', alt: '' }] });
    expect(parseInline('see [the manual](https://example.com/x.pdf)')[1]).toMatchObject({ t: 'link' });
  });
});
