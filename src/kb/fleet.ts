// The fleet: each boat's spec-sheet fields (in its boat.md) and the boats grouped by the equipment they run,
// so a manual or a known problem for one model can be found from every boat that has it.
import { fmList, fmText, type FmValue } from './frontmatter';
import { procedureFolder, type Boat, type Doc } from './corpus';

export type Kind = 'engine' | 'generator' | 'gear';

/** Equipment the fleet is grouped by: the model field (for grouping) and the field as printed on the sheet. */
export const KINDS: { kind: Kind; label: string; field: string; printed: string }[] = [
  { kind: 'engine', label: 'Main engines', field: 'engine_model', printed: 'engines' },
  { kind: 'generator', label: 'Generators', field: 'generator_model', printed: 'generators' },
  { kind: 'gear', label: 'Gears', field: 'gear_make', printed: 'gear' },
];
export const isKind = (k: string | undefined): k is Kind => KINDS.some((x) => x.kind === k);

/** Spec-sheet field names, in the order of the company sheet. */
export const SPEC_LABEL: Record<string, string> = {
  former_names: 'Former names', propulsion: 'Propulsion', official_number: 'Official number', horsepower: 'Horsepower', size: 'Size (length x breadth, ft)',
  built: 'Built (year)', repowered: 'Repowered (year)', builder: 'Builder', home_port: 'Home port',
  engines: 'Main engines', engine_model: 'Main engine model', generators: 'Generators', generator_model: 'Generator model',
  gear: 'Gear ratio', gear_make: 'Gear maker', wheels: 'Wheels', kort_nozzles: 'Kort nozzles',
  gross_tons: 'Gross tons', net_tons: 'Net tons', fuel_capacity: 'Fuel capacity (gal)', lube_capacity: 'Lube capacity (gal)',
  height: 'Height', eye_level: 'Eye level', hull_depth: 'Hull depth', electronics: 'Electronics',
};

const val = (fm: Record<string, FmValue>, k: string) => fmText(fm[k]).trim();
export const spec = (b: Boat, k: string) => val(b.doc.fm, k);

/** The model a boat runs for one kind of equipment ("" if not filled in). */
export const modelOf = (b: Boat, kind: Kind) => spec(b, KINDS.find((x) => x.kind === kind)!.field);

/** Boats by model for one kind of equipment, most boats first. Boats without the field are left out. */
export function groups(boats: Boat[], kind: Kind): { model: string; boats: Boat[] }[] {
  const by = new Map<string, Boat[]>();
  for (const b of boats) {
    const m = modelOf(b, kind);
    if (m) by.set(m, [...(by.get(m) ?? []), b]);
  }
  return [...by].map(([model, bs]) => ({ model, boats: sortBoats(bs) })).sort((a, b) => b.boats.length - a.boats.length || a.model.localeCompare(b.model));
}

const bare = (name: string) => name.replace(/^(m\/?v\.?)\s+/i, '');
export const sortBoats = (boats: Boat[]) => [...boats].sort((a, b) => bare(a.name).localeCompare(bare(b.name)));

/** Matches a boat by name, former name or official number. */
export function boatMatches(b: Boat, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  return [b.name, spec(b, 'former_names'), spec(b, 'official_number')].some((x) => x.toLowerCase().includes(t));
}

export const fleetHref = (kind: Kind, model: string) => `#/fleet/${kind}/${encodeURIComponent(model)}`;

/**
 * Procedure folders, A–Z with General equipment first and Generators last:
 *   general/ · cat/3612/ · cummins/qsk60/ · emd/{645,710}/{12cyl,16cyl,20cyl}/ · gearboxes/<maker>/
 *   · z-drives/<maker>/ · generators/<make>/<model>/
 * Engines and generators go by make, then model ("Cummins QSM11" -> cummins/qsm11; "EMD 710 16cyl" ->
 * emd/710/16cyl). A Z drive boat's drive maker goes under Z drives rather than Gearboxes. A folder higher
 * up covers every boat below it.
 */
export interface Folder { slug: string; name: string; boats: Boat[]; docs: Doc[]; children?: Folder[]; tight?: boolean }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const unknownName = (f: string) => f.split('/').pop()!.replace(/-/g, ' ').toUpperCase();
const EMD = /^EMD\s+(645|710)\s+(12|16|20)\s*cyl$/i;
/** "John Deere 6081" -> make "John Deere", model "6081" (a one-word name is a make on its own). */
const makeModel = (m: string) => { const i = m.trim().lastIndexOf(' '); return i > 0 ? [m.slice(0, i).trim(), m.slice(i + 1)] : [m.trim(), '']; };
const byMake = (m: string) => { const [make, model] = makeModel(m); return model ? [{ slug: slug(make), name: make, tight: true }, { slug: slug(model), name: model }] : [{ slug: slug(make), name: make }]; };
export const isZDrive = (b: Boat) => /z[\s-]*drive/i.test(spec(b, 'propulsion'));

export function procedureFolders(boats: Boat[], docs: Doc[]): Folder[] {
  const procs = docs.filter((d) => d.type === 'procedure');
  // filed in the folder, or listed in it with also_in: (a card for "EMD 645 & 710" is in both)
  const inFolder = (f: string) => procs.filter((d) => procedureFolder(d.path) === f || fmList(d.fm.also_in).includes(f))
    .sort((a, b) => fmText(a.fm.mpc_code).localeCompare(fmText(b.fm.mpc_code)) || a.title.localeCompare(b.title));
  const top: Folder[] = [];
  // the folder at this path, made (with any above it) if it isn't there yet
  const ensure = (parts: { slug: string; name: string; tight?: boolean }[]): Folder => {
    let list = top, path = '', f: Folder | undefined;
    for (const p of parts) {
      path = path ? `${path}/${p.slug}` : p.slug;
      f = list.find((x) => x.slug === path);
      if (!f) list.push((f = { slug: path, name: p.name, boats: [], docs: inFolder(path), children: [], tight: p.tight }));
      list = f.children!;
    }
    return f!;
  };
  const general = ensure([{ slug: 'general', name: 'General equipment' }]);
  general.boats = boats;
  const emd = (series: string, cyl: string) => [{ slug: 'emd', name: 'EMD', tight: true }, { slug: series, name: series, tight: true }, { slug: `${cyl}cyl`, name: `${cyl}cyl` }];
  if (boats.some((b) => /^EMD\b/i.test(modelOf(b, 'engine')))) for (const s of ['645', '710']) for (const n of ['12', '16', '20']) ensure(emd(s, n));
  for (const g of groups(boats, 'engine')) {
    const m = EMD.exec(g.model);
    ensure(m ? emd(m[1], m[2]) : byMake(g.model)).boats.push(...g.boats);
  }
  // a conventional boat's reduction gear under Gearboxes; a Z drive boat's drive under Z drives
  for (const g of groups(boats, 'gear'))
    for (const [where, name, bs] of [['gearboxes', 'Gearboxes', g.boats.filter((b) => !isZDrive(b))], ['z-drives', 'Z drives', g.boats.filter(isZDrive)]] as const)
      if (bs.length) ensure([{ slug: where, name }, { slug: slug(g.model), name: g.model }]).boats.push(...bs);
  const gens = ensure([{ slug: 'generators', name: 'Generators' }]);
  for (const g of groups(boats, 'generator')) ensure([{ slug: 'generators', name: 'Generators' }, ...byMake(g.model)]).boats.push(...g.boats);
  // folders that have files but no boats yet
  for (const f of new Set(procs.flatMap((d) => [procedureFolder(d.path), ...fmList(d.fm.also_in)])))
    if (!findFolder(top, f)) ensure(f.split('/').map((s) => ({ slug: s, name: unknownName(s) })));
  // a folder covers the boats of the folders inside it; everything A–Z
  const finish = (f: Folder) => {
    const kids = f.children ?? [];
    kids.forEach(finish);
    kids.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (kids.length) f.boats = [...new Set([...f.boats, ...kids.flatMap((k) => k.boats)])];
    else f.children = undefined;
  };
  top.forEach(finish);
  const rest = top.filter((f) => f !== general && f !== gens).sort((a, b) => a.name.localeCompare(b.name));
  return [general, ...rest, gens];
}

/** A folder by its path ("generators/cat-3306"), at any depth. */
export function findFolder(folders: Folder[], f: string): Folder | undefined {
  for (const x of folders) {
    if (x.slug === f) return x;
    const inner = x.children && findFolder(x.children, f);
    if (inner) return inner;
  }
  return undefined;
}

/** Everything filed in a folder and the folders inside it (each once). */
export const allDocs = (f: Folder): Doc[] => [...new Set([...f.docs, ...(f.children ?? []).flatMap(allDocs)])];

/** Procedures for a boat: every folder it's in (General, its engine's folders, its generator's), top down. */
export function proceduresFor(b: Boat, folders: Folder[]): Doc[] {
  const mine = (fs: Folder[]): Doc[] => fs.flatMap((f) => (f.boats.includes(b) ? [...f.docs, ...mine(f.children ?? [])] : []));
  return [...new Set(mine(folders))];
}

/** "general" -> "General equipment", "cat-3612" -> "CAT 3612", "generators/cat-3306" -> "CAT 3306". */
export const folderName = (boats: Boat[], f: string) => findFolder(procedureFolders(boats, []), f)?.name ?? unknownName(f);

/** The whole way down to a folder: "EMD 710 20cyl", "CAT 3612", "Generators · CAT 3306", "General equipment". */
export function folderPath(boats: Boat[], f: string): string {
  const all = procedureFolders(boats, []);
  const parts = f.split('/');
  let out = '';
  parts.forEach((_, i) => {
    const here = parts.slice(0, i + 1).join('/');
    const above = i ? findFolder(all, parts.slice(0, i).join('/')) : undefined;
    // a group (Gearboxes, Z drives, Generators) is followed by " · "; a make by its model with a space
    const group = i === 1 && ['gearboxes', 'z-drives', 'generators'].includes(parts[0]);
    out += (i ? (group || above?.tight === false ? ' · ' : ' ') : '') + folderName(boats, here);
  });
  return out;
}
