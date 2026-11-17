// The fleet: each boat's spec-sheet fields (in its boat.md) and the boats grouped by the equipment they run,
// so a manual or a known problem for one model can be found from every boat that has it.
import { fmText, type FmValue } from './frontmatter';
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
  former_names: 'Former names', official_number: 'Official number', horsepower: 'Horsepower', size: 'Size (length x breadth, ft)',
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
 * Procedure folders: General equipment, one per main engine model in the fleet, then Generators with one
 * folder per generator model inside (procedures/generators/cat-3306/), then any other folder found.
 */
export interface Folder { slug: string; name: string; boats: Boat[]; docs: Doc[]; children?: Folder[] }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const unknownName = (f: string) => f.split('/').pop()!.replace(/-/g, ' ').toUpperCase();

export function procedureFolders(boats: Boat[], docs: Doc[]): Folder[] {
  const procs = docs.filter((d) => d.type === 'procedure');
  const inFolder = (f: string) => procs.filter((d) => procedureFolder(d.path) === f).sort((a, b) => fmText(a.fm.mpc_code).localeCompare(fmText(b.fm.mpc_code)) || a.title.localeCompare(b.title));
  const make = (f: string, name: string, bs: Boat[]): Folder => ({ slug: f, name, boats: bs, docs: inFolder(f) });
  const folders: Folder[] = [make('general', 'General equipment', boats)];
  for (const g of groups(boats, 'engine')) folders.push(make(slug(g.model), g.model, g.boats));
  const gens = groups(boats, 'generator').map((g) => make(`generators/${slug(g.model)}`, g.model, g.boats));
  for (const f of new Set(procs.map((d) => procedureFolder(d.path)).filter((f) => f.startsWith('generators/'))))
    if (!gens.some((x) => x.slug === f)) gens.push(make(f, unknownName(f), []));
  folders.push({ slug: 'generators', name: 'Generators', boats: [...new Set(gens.flatMap((g) => g.boats))], docs: inFolder('generators'), children: gens });
  for (const f of new Set(procs.map((d) => procedureFolder(d.path))))
    if (!findFolder(folders, f)) folders.push(make(f, unknownName(f), []));
  return folders;
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

/** Everything filed in a folder and the folders inside it. */
export const allDocs = (f: Folder): Doc[] => [...f.docs, ...(f.children ?? []).flatMap(allDocs)];

/** Procedures for a boat: the General ones, and those for its main engine and its generators. */
export function proceduresFor(b: Boat, folders: Folder[]): Doc[] {
  const mine = (fs: Folder[]): Doc[] => fs.flatMap((f) => [...(f.slug === 'general' || (!f.children && f.boats.includes(b)) ? f.docs : []), ...mine(f.children ?? [])]);
  return mine(folders);
}

/** "general" -> "General equipment", "cat-3612" -> "CAT 3612", "generators/cat-3306" -> "CAT 3306". */
export const folderName = (boats: Boat[], f: string) => findFolder(procedureFolders(boats, []), f)?.name ?? unknownName(f);
