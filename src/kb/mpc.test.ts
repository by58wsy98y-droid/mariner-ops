import { describe, expect, it } from 'vitest';
import { buildCorpus, docType, isCard, procedureFolder } from './corpus';
import { allDocs, findFolder, folderName, folderPath, procedureFolders, proceduresFor } from './fleet';
import { parseInline, parseMarkdown } from './markdown';
import { buildIndex, search } from './search';

const card = `---\ntitle: Reduction Gear Maintenance\nmpc_code: MPC-E-312-QT\nfrequency: Quarterly\n---\n# Reduction Gear Maintenance\n\n## Step 2 — Quarterly\n\n### 3. Inspect Mounting Bolts\nStrike each bolt — a loose bolt can be identified by an unusual sound or lack of hammer bounce-back\n\n![Figure 1](images/fig-1.jpg)\n`;
const boat = (slug: string, fm: string) => ({ path: `boats/${slug}/boat.md`, text: `---\nboat: M/V ${slug}\n${fm}\n---\n` });
const c = buildCorpus([
  { path: 'procedures/general/mpc-e-312-qt-reduction-gear-maintenance.md', text: card },
  { path: 'procedures/cat/3612/valve-lash.md', text: '---\ntitle: Valve lash check\n---\n# Valve lash check\n' },
  { path: 'procedures/generators/cat/3306/oil-change.md', text: '---\ntitle: Generator oil change\n---\n# Generator oil change\n' },
  { path: 'procedures/README.md', text: '# Procedures' },
  boat('kay', 'engine_model: CAT 3612\ngenerator_model: CAT 3306'),
  boat('ray', 'engine_model: CAT 3612\ngenerator_model: CAT 3306'),
  boat('chad', 'engine_model: EMD 710 20cyl\ngenerator_model: John Deere 6090'),
  boat('legends', 'engine_model: EMD 710 16cyl'),
  { path: 'procedures/emd/710/injector-check.md', text: '---\ntitle: 710 injector check\n---\n# 710 injector check\n' },
]);

describe('procedures in folders', () => {
  it('are procedures filed by folder; the README is not one', () => {
    expect(docType('procedures/general/mpc-e-312-qt-reduction-gear-maintenance.md')).toBe('procedure');
    expect(docType('procedures/README.md')).toBeNull();
    expect(procedureFolder('procedures/cat/3612/valve-lash.md')).toBe('cat/3612');
    expect(procedureFolder('procedures/generators/cat/3306/oil-change.md')).toBe('generators/cat/3306');
    expect(isCard(c.docs.find((d) => d.path.includes('mpc-e-312'))!)).toBe(true);
    expect(isCard(c.docs.find((d) => d.path.includes('valve-lash'))!)).toBe(false);
  });

  it('folders: General first, engines A–Z (EMD → 645/710 → 12/16/20cyl), Generators last', () => {
    const fs = procedureFolders(c.boats, c.docs);
    expect(fs.map((f) => [f.slug, f.name, allDocs(f).length, f.boats.length])).toEqual([
      ['general', 'General equipment', 1, 4],
      ['cat', 'CAT', 1, 2],
      ['emd', 'EMD', 1, 2],
      ['generators', 'Generators', 1, 3],
    ]);
    const kids = (f: string) => findFolder(fs, f)!.children!.map((x) => [x.slug, x.name, x.boats.length]);
    expect(kids('emd')).toEqual([['emd/645', '645', 0], ['emd/710', '710', 2]]);
    expect(kids('emd/645')).toEqual([['emd/645/12cyl', '12cyl', 0], ['emd/645/16cyl', '16cyl', 0], ['emd/645/20cyl', '20cyl', 0]]);
    expect(kids('emd/710')).toEqual([['emd/710/12cyl', '12cyl', 0], ['emd/710/16cyl', '16cyl', 1], ['emd/710/20cyl', '20cyl', 1]]);
    expect(kids('generators')).toEqual([['generators/cat', 'CAT', 2], ['generators/john-deere', 'John Deere', 1]]);
    expect(kids('generators/cat')).toEqual([['generators/cat/3306', '3306', 2]]);
    expect(folderName(c.boats, 'emd/710/16cyl')).toBe('16cyl');
    expect(folderName(c.boats, 'cat/3612')).toBe('3612');
    expect(findFolder(fs, 'cat')!.children!.map((x) => [x.slug, x.name, x.boats.length])).toEqual([['cat/3612', '3612', 2]]);
    expect(folderPath(c.boats, 'cat/3612')).toBe('CAT 3612');
    expect(folderName(c.boats, 'generators/cat/3306')).toBe('3306');
  });

  it('a boat gets the procedures of every folder it is in: General, its engine (and the folders above it), its generator', () => {
    const fs = procedureFolders(c.boats, c.docs);
    const titles = (slug: string) => proceduresFor(c.boats.find((b) => b.slug === slug)!, fs).map((d) => d.title);
    expect(titles('kay')).toEqual(['Reduction Gear Maintenance', 'Valve lash check', 'Generator oil change']);
    expect(titles('chad')).toEqual(['Reduction Gear Maintenance', '710 injector check']); // filed in emd/710: every 710
    expect(titles('legends')).toEqual(['Reduction Gear Maintenance', '710 injector check']);
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

  it('a card for "EMD 645 & 710" filed in 710 is listed in the 645 folder too (once per boat, once in counts)', () => {
    const c2 = buildCorpus([
      { path: 'procedures/emd/710/16cyl/airbox.md', text: '---\ntitle: Airbox 16\nmpc_code: MPC-E-233-1-CM-M-216\nalso_in: emd/645/16cyl\n---\n# Airbox 16\n' },
      boat('legends', 'engine_model: EMD 710 16cyl'),
      boat('old', 'engine_model: EMD 645 16cyl'),
    ]);
    const fs = procedureFolders(c2.boats, c2.docs);
    expect(findFolder(fs, 'emd/710/16cyl')!.docs.map((d) => d.title)).toEqual(['Airbox 16']);
    expect(findFolder(fs, 'emd/645/16cyl')!.docs.map((d) => d.title)).toEqual(['Airbox 16']);
    expect(allDocs(findFolder(fs, 'emd')!)).toHaveLength(1);
    for (const b of c2.boats) expect(proceduresFor(b, fs).map((d) => d.title)).toEqual(['Airbox 16']);
    expect(folderPath(c2.boats, 'emd/710/16cyl')).toBe('EMD 710 16cyl');
    expect(folderPath(c2.boats, 'generators/cat/3306')).toBe('Generators · CAT 3306');
  });

  it('pictures on one line sit side by side; one picture is a figure', () => {
    const [p] = parseMarkdown('![Figure 1](images/a.jpg) ![Figure 2](images/b.jpg)');
    expect(p.t === 'p' && p.c.filter((x) => x.t === 'img')).toHaveLength(2);
  });

  it('a line ending in "\\" keeps its line break; other lines run together', () => {
    const [p] = parseMarkdown('CLUTCH AIR SUPPLY:\\\nSupply Pressure (Nominal): 140 +/-5 psig\\\nLow Pressure Alarm Setpoint: 125 psig\nstill the same line');
    expect(p).toEqual({ t: 'p', c: [{ t: 'text', v: 'CLUTCH AIR SUPPLY:\nSupply Pressure (Nominal): 140 +/-5 psig\nLow Pressure Alarm Setpoint: 125 psig still the same line' }] });
  });

  it('Gearboxes → one folder per gear maker, between EMD and Generators', () => {
    const c3 = buildCorpus([
      { path: 'procedures/gearboxes/falk/air-panel.md', text: '---\ntitle: Falk air panel\nmpc_code: MPC-E-014-PRN\n---\n# Falk air panel\n' },
      boat('a', 'engine_model: EMD 710 16cyl\ngear_make: Falk\ngenerator_model: CAT 3306'),
      boat('b', 'engine_model: CAT 3612\ngear_make: Reintjes'),
    ]);
    const fs = procedureFolders(c3.boats, c3.docs);
    expect(fs.map((f) => f.slug)).toEqual(['general', 'cat', 'emd', 'gearboxes', 'generators']);
    expect(findFolder(fs, 'gearboxes')!.children!.map((f) => [f.name, f.boats.length, f.docs.length])).toEqual([['Falk', 1, 1], ['Reintjes', 1, 0]]);
    expect(proceduresFor(c3.boats.find((b) => b.slug === 'a')!, fs).map((d) => d.title)).toEqual(['Falk air panel']);
    expect(proceduresFor(c3.boats.find((b) => b.slug === 'b')!, fs)).toEqual([]);
  });

  it('Z drive boats: engines by make (Cummins → QSK60), drives under Z drives not Gearboxes, generators by make', () => {
    const c4 = buildCorpus([
      boat('cindy', 'propulsion: Z drive\nengine_model: Cummins QSK60\ngear_make: Steerprop\ngenerator_model: Cummins QSM11'),
      boat('myra', 'engine_model: CAT 3612\ngear_make: Falk\ngenerator_model: Cummins 6CTA8.3D'),
    ]);
    const fs = procedureFolders(c4.boats, c4.docs);
    expect(fs.map((f) => f.slug)).toEqual(['general', 'cat', 'cummins', 'gearboxes', 'z-drives', 'generators']);
    expect(findFolder(fs, 'cummins/qsk60')!.boats.map((b) => b.slug)).toEqual(['cindy']);
    expect(findFolder(fs, 'z-drives/steerprop')!.boats.map((b) => b.slug)).toEqual(['cindy']);
    expect(findFolder(fs, 'gearboxes/steerprop')).toBeUndefined();
    expect(findFolder(fs, 'generators/cummins')!.children!.map((f) => f.name)).toEqual(['6CTA8.3D', 'QSM11']);
    expect(folderPath(c4.boats, 'z-drives/steerprop')).toBe('Z drives · Steerprop');
    expect(folderPath(c4.boats, 'cummins/qsk60')).toBe('Cummins QSK60');
  });
});

