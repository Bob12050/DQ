import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { validateData } from '../src/core/registry/validation.ts';
import { MONSTERS } from '../src/core/data/monsters.ts';
import { SKILLS } from '../src/core/data/skills.ts';
import { TRAITS } from '../src/core/data/traits.ts';
import { ITEMS } from '../src/core/data/items.ts';

describe('master data validation', () => {
  it('passes referential & range validation with no errors', () => {
    const result = validateData(registry);
    if (!result.ok) console.error(result.errors);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('meets minimum content counts', () => {
    expect(Object.keys(MONSTERS).length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(SKILLS).length).toBeGreaterThanOrEqual(18);
    expect(Object.keys(TRAITS).length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(ITEMS).length).toBeGreaterThanOrEqual(6);
    expect(registry.fusionRecipes.length).toBeGreaterThanOrEqual(6);
  });

  it('detects an injected bad reference', () => {
    const broken = Object.create(registry);
    broken.monsters = { ...registry.monsters, bad: { ...registry.monster('mossfang'), id: 'bad', innateSkills: ['nope'] } };
    const result = validateData(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('nope'))).toBe(true);
  });
});
