import { describe, expect, it } from 'vitest';
import { merge3 } from './merge';

const base = ['# Title', '', 'line one', 'line two', 'line three', '', '| a | b |', '|---|---|', '| 1 | 2 |'].join('\n');

describe('merging an edit with changes made elsewhere', () => {
  it('no change elsewhere: the edit stands', () => {
    const local = base.replace('line two', 'line TWO');
    expect(merge3(base, local, base)).toBe(local);
  });
  it('changes in different places are both kept', () => {
    const local = base.replace('line one', 'line ONE (phone)');
    const remote = base + '\n| 3 | 4 |';
    expect(merge3(base, local, remote)).toBe(remote.replace('line one', 'line ONE (phone)'));
  });
  it('a deletion here and an added row there are both kept', () => {
    const local = base.replace('line three\n', '');
    const remote = base + '\n| 3 | 4 |';
    const m = merge3(base, local, remote);
    expect(m).not.toContain('line three');
    expect(m).toContain('| 3 | 4 |');
  });
  it('both changed the same line: this device wins', () => {
    const local = base.replace('line two', 'phone version');
    const remote = base.replace('line two', 'laptop version');
    const m = merge3(base, local, remote);
    expect(m).toContain('phone version');
    expect(m).not.toContain('laptop version');
  });
  it('both added rows at the end: both kept, this device first', () => {
    const local = base + '\n| p | p |';
    const remote = base + '\n| l | l |';
    expect(merge3(base, local, remote).endsWith('| p | p |')).toBe(true);
  });
});
