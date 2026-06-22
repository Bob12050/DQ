import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { BattleState, BattleTeam } from '../src/core/battle/BattleState.ts';
import { unitFromEnemy } from '../src/core/battle/BattleUnit.ts';
import { DamageCalculator } from '../src/core/battle/DamageCalculator.ts';
import { ActionEvaluator, newAiContext } from '../src/core/battle/ActionEvaluator.ts';
import { Rng } from '../src/core/rng.ts';

const reg = registry;

function world(seed = 1) {
  const p0 = unitFromEnemy(reg, 'bloomsage', 20, 'p0', 0);
  (p0 as { side: string }).side = 'player';
  const p1 = unitFromEnemy(reg, 'mossfang', 20, 'p1', 1);
  (p1 as { side: string }).side = 'player';
  const e0 = unitFromEnemy(reg, 'cragmaw', 15, 'e0', 0);
  const state = new BattleState(new BattleTeam('player', [p0, p1]), new BattleTeam('enemy', [e0]), new Rng(seed), false, false);
  const evaluator = new ActionEvaluator(reg, new DamageCalculator(reg));
  return { state, evaluator, p0, p1, e0 };
}

describe('AI behaviour', () => {
  it('never selects a skill the unit cannot afford', () => {
    const { state, evaluator, p0 } = world();
    p0.mp = 0; // can't cast anything
    const cmd = evaluator.decide(state, p0, 'evenTide', newAiContext());
    if (cmd.skillId) {
      expect(reg.skill(cmd.skillId).mpCost).toBe(0);
    } else {
      expect(['attack', 'guard']).toContain(cmd.actionType);
    }
  });

  it('does not heal an already full-HP ally', () => {
    const { state, evaluator, p0, p1 } = world();
    p0.hp = p0.maxHp;
    p1.hp = p1.maxHp;
    const cmd = evaluator.decide(state, p0, 'tendThePack', newAiContext());
    // With all allies full, healer should not pick a heal skill.
    if (cmd.skillId) {
      expect(reg.skill(cmd.skillId).effectKind).not.toBe('heal');
    }
  });

  it('prefers to heal a badly wounded ally', () => {
    const { state, evaluator, p0, p1 } = world();
    p0.hp = p0.maxHp;
    p1.hp = 1; // almost dead
    const cmd = evaluator.decide(state, p0, 'tendThePack', newAiContext());
    expect(cmd.skillId).toBeTruthy();
    expect(reg.skill(cmd.skillId!).effectKind).toBe('heal');
    expect(cmd.targetIds).toContain('p1');
  });

  it('reservation prevents two healers both topping up the same ally', () => {
    const { state, evaluator, p0, p1 } = world();
    p1.hp = Math.round(p1.maxHp * 0.7);
    p0.hp = p0.maxHp;
    const ctx = newAiContext();
    const first = evaluator.decide(state, p0, 'tendThePack', ctx);
    // After the first heal is reserved, p1 is considered topped up.
    expect(first.targetIds).toContain('p1');
    expect(ctx.reservedHeal.has('p1')).toBe(true);
  });
});
