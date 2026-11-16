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
  built: 'Built (year)', builder: 'Builder', home_port: 'Home port',
  engines: 'Main engines', engine_model: 'Main engine model', generators: 'Generators', generator_model: 'Generator model',
  gear: 'Gear ratio', gear_make: 'Gear maker', wheels: 'Wheels',
  gross_tons: 'Gross tons', net_tons: 'Net tons', fuel_capacity: 'Fuel capacity (gal)', lube_capacity: 'Lube capacity (gal)',
  height: 'Height', eye_level: 'Eye level', hull_depth: 'Hull depth',
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

/** Procedure folders: General equipment, then one per main engine model in the fleet, then any others. */
export interface Folder { slug: string; name: string; boats: Boat[]; docs: Doc[] }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export function procedureFolders(boats: Boat[], docs: Doc[]): Folder[] {
  const procs = docs.filter((d) => d.type === 'procedure');
  const inFolder = (f: string) => procs.filter((d) => procedureFolder(d.path) === f).sort((a, b) => fmText(a.fm.mpc_code).localeCompare(fmText(b.fm.mpc_code)) || a.title.localeCompare(b.title));
  const folders: Folder[] = [{ slug: 'general', name: 'General equipment', boats, docs: inFolder('general') }];
  for (const g of groups(boats, 'engine')) folders.push({ slug: slug(g.model), name: g.model, boats: g.boats, docs: inFolder(slug(g.model)) });
  for (const f of new Set(procs.map((d) => procedureFolder(d.path))))
    if (!folders.some((x) => x.slug === f)) folders.push({ slug: f, name: f.replace(/-/g, ' ').toUpperCase(), boats: [], docs: inFolder(f) });
  return folders;
}

/** Procedures for a boat: the General ones and those for its main engine. */
export function proceduresFor(b: Boat, folders: Folder[]): Doc[] {
  return folders.filter((f) => f.slug === 'general' || f.boats.includes(b)).flatMap((f) => f.docs);
}

/** "general" -> "General equipment", "cat-3612" -> "CAT 3612" (the engine model it was named from). */
export const folderName = (boats: Boat[], f: string) => procedureFolders(boats, []).find((x) => x.slug === f)?.name ?? f.replace(/-/g, ' ').toUpperCase();
