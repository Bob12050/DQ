import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import {
  applyExp,
  expToNext,
  statsAtLevel,
  skillsAtLevel,
  expFromDefeat,
  MAX_LEVEL,
} from '../src/core/monster/leveling.ts';

const moss = registry.monster('mossfang');

describe('leveling', () => {
  it('exp curve is monotonically increasing and finite below max', () => {
    for (let l = 1; l < MAX_LEVEL; l++) {
      expect(expToNext(l)).toBeGreaterThan(0);
      if (l > 1) expect(expToNext(l)).toBeGreaterThanOrEqual(expToNext(l - 1));
    }
    expect(expToNext(MAX_LEVEL)).toBe(Infinity);
  });

  it('stats increase with level', () => {
    const s1 = statsAtLevel(moss, 1);
    const s10 = statsAtLevel(moss, 10);
    expect(s10.hp).toBeGreaterThan(s1.hp);
    expect(s10.attack).toBeGreaterThan(s1.attack);
  });

  it('applies exp and reports level-up steps and learned skills', () => {
    const res = applyExp(moss, 1, 0, expToNext(1) + expToNext(2) + expToNext(3) + 1);
    expect(res.level).toBeGreaterThanOrEqual(4);
    const learned = res.steps.flatMap((s) => s.learnedSkills);
    expect(learned).toContain('rendingClaw'); // learned at level 4
  });

  it('never exceeds MAX_LEVEL', () => {
    const res = applyExp(moss, 1, 0, 9_999_999);
    expect(res.level).toBe(MAX_LEVEL);
    expect(res.exp).toBe(0);
  });

  it('skillsAtLevel includes innate and leveled skills', () => {
    expect(skillsAtLevel(moss, 1)).toContain('strike');
    expect(skillsAtLevel(moss, 9)).toContain('flurryFang');
  });

  it('defeat exp scales with level', () => {
    expect(expFromDefeat(10)).toBeGreaterThan(expFromDefeat(3));
  });
});
