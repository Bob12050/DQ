import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { BattleState, BattleTeam } from '../src/core/battle/BattleState.ts';
import { unitFromEnemy } from '../src/core/battle/BattleUnit.ts';
import { DamageCalculator } from '../src/core/battle/DamageCalculator.ts';
import { StatusEffectService } from '../src/core/battle/StatusEffectService.ts';
import { TraitTriggerService } from '../src/core/battle/TraitTriggerService.ts';
import { ActionResolver } from '../src/core/battle/ActionResolver.ts';
import { ActionQueueBuilder } from '../src/core/battle/ActionQueueBuilder.ts';
import { Rng } from '../src/core/rng.ts';
import type { BattleAction, BattleCommand } from '../src/core/battle/types.ts';

const reg = registry;

function setup(playerSpecs: [string, number][], enemySpecs: [string, number][], seed = 1) {
  const player = playerSpecs.map(([s, l], i) => unitFromEnemy(reg, s, l, `p${i}`, i));
  for (const u of player) (u as { side: string }).side = 'player';
  const enemy = enemySpecs.map(([s, l], i) => unitFromEnemy(reg, s, l, `e${i}`, i));
  const state = new BattleState(new BattleTeam('player', player), new BattleTeam('enemy', enemy), new Rng(seed), false, false);
  const dmg = new DamageCalculator(reg);
  const resolver = new ActionResolver(reg, dmg, new StatusEffectService(reg), new TraitTriggerService());
  const builder = new ActionQueueBuilder(reg);
  const action = (cmd: BattleCommand): BattleAction => builder.build(state, [cmd], state.rng)[0]!;
  return { state, resolver, action };
}

describe('action resolution', () => {
  it('AoE damage hits every living enemy', () => {
    const { state, resolver, action } = setup([['cragmaw', 30]], [
      ['mossfang', 5], ['mossfang', 5], ['mossfang', 5], ['mossfang', 5],
    ]);
    const beforeHp = state.enemy.units.map((u) => u.hp);
    resolver.resolve(state, action({ actorId: 'p0', actionType: 'skill', skillId: 'quakeStomp', targetIds: state.enemy.units.map((u) => u.id), commandSource: 'manual' }), state.rng);
    state.enemy.units.forEach((u, i) => expect(u.hp).toBeLessThan(beforeHp[i]!));
  });

  it('all-ally heal restores every living ally', () => {
    const { state, resolver, action } = setup([['bloomsage', 20], ['mossfang', 20], ['mossfang', 20]], [['mossfang', 5]]);
    for (const u of state.player.units) u.hp = 5;
    resolver.resolve(state, action({ actorId: 'p0', actionType: 'skill', skillId: 'chorusMend', targetIds: state.player.units.map((u) => u.id), commandSource: 'manual' }), state.rng);
    for (const u of state.player.units) expect(u.hp).toBeGreaterThan(5);
  });

  it('multi-hit stops once all targets fall', () => {
    const { state, resolver, action } = setup([['verdantcolossus', 40]], [['mossfang', 1]]);
    resolver.resolve(state, action({ actorId: 'p0', actionType: 'skill', skillId: 'flurryFang', targetIds: ['e0'], commandSource: 'manual' }), state.rng);
    expect(state.enemy.units[0]!.isAlive).toBe(false);
    // The single enemy can only be defeated once; no crash from extra hits.
    expect(state.enemy.isWiped()).toBe(true);
  });

  it('single-target attack re-selects when the chosen target is already dead', () => {
    // Try several seeds so an unlucky accuracy miss doesn't flake the test.
    let damagedLiving = false;
    for (let seed = 1; seed <= 10 && !damagedLiving; seed++) {
      const { state, resolver, action } = setup([['cragmaw', 20]], [['mossfang', 5], ['mossfang', 5]], seed);
      state.enemy.units[0]!.hp = 0; // chosen target already fallen
      const a = action({ actorId: 'p0', actionType: 'attack', targetIds: ['e0'], commandSource: 'manual' });
      resolver.resolve(state, a, state.rng);
      // Dead target must never be hit; only the living one can take damage.
      expect(state.enemy.units[0]!.hp).toBe(0);
      if (state.enemy.units[1]!.hp < state.enemy.units[1]!.maxHp) damagedLiving = true;
    }
    expect(damagedLiving).toBe(true);
  });

  it('revive only works on a fallen ally', () => {
    const { state, resolver, action } = setup([['bloomsage', 25], ['mossfang', 10]], [['mossfang', 5]]);
    const ally = state.player.units[1]!;
    ally.hp = 0;
    resolver.resolve(state, action({ actorId: 'p0', actionType: 'skill', skillId: 'reawaken', targetIds: [ally.id], commandSource: 'manual' }), state.rng);
    expect(ally.isAlive).toBe(true);
    expect(ally.hp).toBeGreaterThan(0);
  });
});
