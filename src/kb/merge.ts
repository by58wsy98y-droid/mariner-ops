// Merging a whole-file edit with changes made elsewhere in the meantime (another device, GitHub's website).
// Line by line: what this device changed is kept, what the other side changed is kept, and where both
// changed the same lines, this device's version wins.

interface Hunk { start: number; end: number; lines: string[] } // replaces base[start, end) with lines

/** The changed regions turning `base` into `other`, in base line numbers. */
function hunks(base: string[], other: string[]): Hunk[] {
  const n = base.length, m = other.length;
  // longest common subsequence table (files here are a few hundred lines at most)
  const L: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = base[i] === other[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Hunk[] = [];
  let i = 0, j = 0, cur: Hunk | null = null;
  const close = () => { if (cur) { out.push(cur); cur = null; } };
  while (i < n || j < m) {
    if (i < n && j < m && base[i] === other[j]) { close(); i++; j++; continue; }
    if (!cur) cur = { start: i, end: i, lines: [] };
    if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { cur.lines.push(other[j]); j++; }
    else { i++; cur.end = i; }
  }
  close();
  return out;
}

export function merge3(base: string, local: string, remote: string): string {
  if (remote === base || remote === local) return local;
  if (local === base) return remote;
  const b = base.split('\n');
  const A = hunks(b, local.split('\n'));
  const B = hunks(b, remote.split('\n'));
  // Two additions at the same spot (both added a row at the end) don't clash: both are kept.
  const added = (h: Hunk) => h.start === h.end;
  const overlaps = (x: Hunk, y: Hunk) => (x.start < y.end && y.start < x.end) || (x.start === y.start && added(x) !== added(y));
  const same = (x: Hunk, y: Hunk) => x.start === y.start && x.end === y.end && x.lines.join('\n') === y.lines.join('\n');
  // Keep remote hunks that don't clash with any local one (and aren't the very same change).
  const keepB = B.filter((y) => !A.some((x) => overlaps(x, y) || same(x, y)));
  // At the same spot the other side's additions go first: they were saved earlier.
  const all = [...A.map((h) => ({ ...h, side: 0 })), ...keepB.map((h) => ({ ...h, side: 1 }))].sort((x, y) => x.start - y.start || y.side - x.side);
  const out: string[] = [];
  let pos = 0;
  for (const h of all) {
    if (h.start < pos) continue; // already covered by a clash winner
    out.push(...b.slice(pos, h.start), ...h.lines);
    pos = h.end;
  }
  out.push(...b.slice(pos));
  return out.join('\n');
}
