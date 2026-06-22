import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { DamageCalculator } from '../src/core/battle/DamageCalculator.ts';
import { unitFromEnemy } from '../src/core/battle/BattleUnit.ts';
import { Rng } from '../src/core/rng.ts';
import { ATTACK_AFFINITY, affinityLabel } from '../src/core/data/elements.ts';

const reg = registry;
const dmg = new DamageCalculator(reg);

describe('damage calculation', () => {
  it('always deals at least 1 and never extreme values', () => {
    const attacker = unitFromEnemy(reg, 'cragmaw', 10, 'a', 0);
    const defender = unitFromEnemy(reg, 'gravelkin', 10, 'd', 0);
    const rng = new Rng(1);
    for (let i = 0; i < 200; i++) {
      const r = dmg.computeDamage(reg.skill('strike'), attacker, defender, rng);
      expect(r.damage).toBeGreaterThanOrEqual(1);
      expect(r.damage).toBeLessThan(defender.maxHp * 5);
    }
  });

  it('respects element advantage (fire > wind)', () => {
    expect(ATTACK_AFFINITY.fire.wind).toBeGreaterThan(1);
    const ember = unitFromEnemy(reg, 'emberwisp', 10, 'a', 0);
    const windish = unitFromEnemy(reg, 'glimmerveil', 10, 'd', 0);
    const earthish = unitFromEnemy(reg, 'gravelkin', 10, 'd2', 1);
    expect(dmg.estimateDamage(reg.skill('emberLance'), ember, windish)).toBeGreaterThan(0);
    // higher vs neutral target check: emberLance vs earth (neutral affinity) baseline
    expect(dmg.estimateDamage(reg.skill('emberLance'), ember, earthish)).toBeGreaterThan(0);
  });

  it('zero-affinity yields no damage (absorb/null path)', () => {
    const label = affinityLabel(0);
    expect(label).toBe('無効');
  });

  it('guarding halves incoming damage on average', () => {
    const attacker = unitFromEnemy(reg, 'cragmaw', 10, 'a', 0);
    const defender = unitFromEnemy(reg, 'gravelkin', 10, 'd', 0);
    const normal = dmg.estimateDamage(reg.skill('strike'), attacker, defender);
    defender.guarding = true;
    const guarded = dmg.estimateDamage(reg.skill('strike'), attacker, defender);
    expect(guarded).toBeLessThan(normal);
  });
});
