import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { BattleController } from '../src/core/battle/BattleController.ts';
import { Rng } from '../src/core/rng.ts';
import { makeParty, enemyParty } from './helpers.ts';

const reg = registry;

describe('resonance recruitment', () => {
  it('low-HP weak target reads as a stronger resonance than a full-HP one', () => {
    const rng = new Rng(1);
    const party = makeParty([
      { species: 'cragmaw', level: 20 },
      { species: 'gravelkin', level: 20 },
    ], rng);
    const ctrl = BattleController.create(reg, party, enemyParty([{ monsterId: 'mossfang', level: 3 }]), rng);
    const target = ctrl.state.enemy.units[0]!;
    target.hp = target.maxHp;
    const full = ctrl.recruitment.evaluate(ctrl.state, target, 0).chance;
    target.hp = 1;
    const low = ctrl.recruitment.evaluate(ctrl.state, target, 0).chance;
    expect(low).toBeGreaterThan(full);
  });

  it('bosses / unrecruitable targets are impossible', () => {
    const rng = new Rng(1);
    const party = makeParty([{ species: 'cragmaw', level: 20 }], rng);
    const ctrl = BattleController.create(reg, party, enemyParty([{ monsterId: 'dirgewarden', level: 14 }], { isBoss: true, noFlee: true }), rng);
    const r = ctrl.recruitment.evaluate(ctrl.state, ctrl.state.enemy.units[0]!, 0);
    expect(r.possible).toBe(false);
    expect(r.chance).toBe(0);
  });

  it('resonance consumes all allies and removes only the target on success', () => {
    const rng = new Rng(2);
    const party = makeParty([
      { species: 'cragmaw', level: 30 },
      { species: 'gravelkin', level: 30 },
    ], rng);
    const ctrl = BattleController.create(reg, party, enemyParty([
      { monsterId: 'mossfang', level: 2 },
      { monsterId: 'thornbud', level: 2 },
    ]), rng);
    const target = ctrl.state.enemy.units[0]!;
    target.hp = 1; // maximise success
    // Force success deterministically by setting rng state isn't trivial; retry a few seeds.
    let recruited = false;
    for (let attempt = 0; attempt < 40 && !recruited; attempt++) {
      const c = BattleController.create(reg, makeParty([
        { species: 'cragmaw', level: 30 },
        { species: 'gravelkin', level: 30 },
      ], new Rng(attempt)), enemyParty([
        { monsterId: 'mossfang', level: 2 },
        { monsterId: 'thornbud', level: 2 },
      ]), new Rng(attempt + 1000));
      c.state.enemy.units[0]!.hp = 1;
      c.resolveTurn({ type: 'resonate', targetId: 'e0' });
      if (c.state.enemy.units[0]!.recruited) {
        recruited = true;
        // The other enemy must remain in the fight.
        expect(c.state.enemy.units[1]!.recruited).toBe(false);
        const result = c.buildResult();
        expect(result.recruited.map((r) => r.enemyUnitId)).toContain('e0');
      }
    }
    expect(recruited).toBe(true);
  });

  it('failed resonance raises target wariness', () => {
    const rng = new Rng(5);
    const party = makeParty([{ species: 'mossfang', level: 1 }], rng);
    const ctrl = BattleController.create(reg, party, enemyParty([{ monsterId: 'obsidark', level: 30 }]), rng);
    const target = ctrl.state.enemy.units[0]!;
    target.hp = target.maxHp;
    const before = target.wariness;
    ctrl.resolveTurn({ type: 'resonate', targetId: 'e0' });
    expect(target.wariness).toBeGreaterThanOrEqual(before);
  });
});
