// The fleet: each boat's spec-sheet fields (in its boat.md) and the boats grouped by the equipment they run,
// so a manual or a known problem for one model can be found from every boat that has it.
import { fmList, fmText, type FmValue } from './frontmatter';
import type { Boat, Doc } from './corpus';

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

/** Does the boat have this kind of equipment listed (model or as printed)? */
export const hasKind = (b: Boat, kind: Kind) => !!(modelOf(b, kind) || spec(b, KINDS.find((x) => x.kind === kind)!.printed));

/** Maintenance cards for a boat: those whose `equipment:` names a kind of equipment the boat has. */
export function cardsFor(b: Boat, docs: Doc[]): Doc[] {
  return docs
    .filter((d) => d.type === 'maintenance' && fmList(d.fm.equipment).some((k) => isKind(k) && hasKind(b, k)))
    .sort((x, y) => fmText(x.fm.mpc_code).localeCompare(fmText(y.fm.mpc_code)) || x.title.localeCompare(y.title));
}
