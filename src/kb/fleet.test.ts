import { describe, expect, it } from 'vitest';
import { buildCorpus } from './corpus';
import { boatMatches, fleetHref, groups, modelOf, sortBoats } from './fleet';
import { buildIndex, search } from './search';

const boat = (slug: string, fm: string) => ({ path: `boats/${slug}/boat.md`, text: `---\n${fm}\n---\n# x\n` });
const c = buildCorpus([
  boat('ray-a-eckstein', 'boat: M/V Ray A. Eckstein\nofficial_number: 1097861\nengines: P-CAT 3612-LH / S-CAT 3612-RH\nengine_model: CAT 3612\ngenerator_model: CAT 3306\ngear_make: Reintjes'),
  boat('marquette-veteran', 'boat: M/V Marquette Veteran\nformer_names: John Paul Eckstein\nofficial_number: 1052078\nengine_model: CAT 3612\ngenerator_model: CAT 3306\ngear_make: Reintjes'),
  boat('chad-pregracke', 'boat: M/V Chad Pregracke\nofficial_number: 1272284\nengine_model: EMD 20-710G7C-T3\ngenerator_model: John Deere 6090\ngear_make: Reintjes'),
  boat('new-boat', 'boat: M/V New Boat'),
]);

describe('fleet', () => {
  it('groups boats by the equipment they run, most boats first; boats without it are left out', () => {
    expect(groups(c.boats, 'engine').map((g) => [g.model, g.boats.map((b) => b.slug)])).toEqual([
      ['CAT 3612', ['marquette-veteran', 'ray-a-eckstein']],
      ['EMD 20-710G7C-T3', ['chad-pregracke']],
    ]);
    expect(groups(c.boats, 'gear')).toHaveLength(1);
    expect(modelOf(c.boats.find((b) => b.slug === 'new-boat')!, 'engine')).toBe('');
  });

  it('sorts by name without the M/V, and finds a boat by former name or official number', () => {
    expect(sortBoats(c.boats).map((b) => b.slug)).toEqual(['chad-pregracke', 'marquette-veteran', 'new-boat', 'ray-a-eckstein']);
    const veteran = c.boats.find((b) => b.slug === 'marquette-veteran')!;
    expect(boatMatches(veteran, 'john paul')).toBe(true);
    expect(boatMatches(veteran, '1052078')).toBe(true);
    expect(boatMatches(veteran, 'pregracke')).toBe(false);
  });

  it('search finds boats by engine model, former name and official number', () => {
    const idx = buildIndex(c);
    const hits = (q: string) => search(idx, q).map((h) => h.doc.boat);
    expect(hits('CAT 3612').sort()).toEqual(['marquette-veteran', 'ray-a-eckstein']);
    expect(hits('John Paul')).toEqual(['marquette-veteran']);
    expect(hits('1272284')).toEqual(['chad-pregracke']);
  });

  it("one boat's issue is found by a search from anywhere, with the line that matched", () => {
    const withIssue = buildCorpus([
      ...[...c.files].map(([path, text]) => ({ path, text })),
      { path: 'boats/chad-pregracke/issues/2026-11-10-port-main-ramping.md', text: '---\nboat: M/V Chad Pregracke\ntitle: Port main ramping at idle\nstatus: RESOLVED\n---\n# Port main ramping at idle\n\n## Resolution\nFork terminal on the ECM ground was loose.\n' },
    ]);
    const [hit] = search(buildIndex(withIssue), 'ramping ground');
    expect(hit.doc.boat).toBe('chad-pregracke');
    expect(hit.snippet).toBe('Fork terminal on the ECM ground was loose.');
  });

  it('a model with spaces and brackets survives the link', () => {
    expect(decodeURIComponent(fleetHref('generator', 'Cummins 6CTA8.3D (M)').split('/').pop()!)).toBe('Cummins 6CTA8.3D (M)');
  });
});
