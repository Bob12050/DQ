import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { BattleController } from '../src/core/battle/BattleController.ts';
import { StatusEffectService } from '../src/core/battle/StatusEffectService.ts';
import { unitFromEnemy } from '../src/core/battle/BattleUnit.ts';
import { BattleState, BattleTeam } from '../src/core/battle/BattleState.ts';
import { Rng } from '../src/core/rng.ts';
import { makeParty, enemyParty } from './helpers.ts';
import type { BattleCommand } from '../src/core/battle/types.ts';

const reg = registry;

function soloState(): { state: BattleState; svc: StatusEffectService } {
  const a = unitFromEnemy(reg, 'mossfang', 5, 'p0', 0);
  const b = unitFromEnemy(reg, 'thornbud', 5, 'e0', 0);
  const state = new BattleState(new BattleTeam('player', [a]), new BattleTeam('enemy', [b]), new Rng(1), false, false);
  return { state, svc: new StatusEffectService(reg) };
}

describe('status effects', () => {
  it('poison ticks down its duration each end-of-turn', () => {
    const { state, svc } = soloState();
    const unit = state.unit('e0');
    svc.apply(unit, 'poison', 3);
    expect(unit.hasStatus('poison')).toBe(true);
    for (let i = 0; i < 3; i++) svc.tickEndOfTurn(state, unit, state.rng);
    expect(unit.hasStatus('poison')).toBe(false);
  });

  it('sleep/stun prevent action', () => {
    const { state, svc } = soloState();
    const unit = state.unit('e0');
    svc.apply(unit, 'sleep', 2);
    expect(unit.canAct).toBe(false);
  });

  it('poison can defeat a unit and trigger defeat outcome', () => {
    const rng = new Rng(11);
    // Weak player poisoned to death by a thornbud venom over time, no attacks.
    const party = makeParty([{ species: 'emberwisp', level: 1 }], rng);
    const ctrl = BattleController.create(reg, party, enemyParty([{ monsterId: 'gravelkin', level: 20 }]), rng);
    const p0 = ctrl.state.unit('p0');
    // Force lethal poison directly and tick via a guard turn.
    new StatusEffectService(reg).apply(p0, 'poison', 9);
    p0.hp = 5;
    const guard: BattleCommand = { actorId: 'p0', actionType: 'guard', targetIds: ['p0'], commandSource: 'manual' };
    let safety = 0;
    while (!ctrl.isOver && safety < 20) {
      ctrl.resolveTurn({ type: 'commands', commands: [guard] });
      safety++;
    }
    expect(ctrl.state.outcome).toBe('defeat');
  });
});
