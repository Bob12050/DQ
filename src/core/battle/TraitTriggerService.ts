import type { BattleState } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import { TRAITS } from '../data/traits.ts';

/** Resolves passive trait effects at the appropriate battle hooks. */
export class TraitTriggerService {
  /** Apply battle-start stat-up traits as long-duration modifiers. */
  onBattleStart(state: BattleState): void {
    for (const unit of state.allUnits()) {
      for (const t of unit.traits) {
        const eff = TRAITS[t].effect;
        if (eff.kind === 'battleStartStatUp') {
          unit.modifiers.push({
            id: `trait_${t}`,
            stats: { [eff.stat]: eff.multiplier },
            remaining: eff.duration,
          });
        }
      }
    }
  }

  /** End-of-turn HP/MP regen traits. */
  onEndOfTurn(state: BattleState, unit: BattleUnit): void {
    if (!unit.isAlive) return;
    for (const t of unit.traits) {
      const eff = TRAITS[t].effect;
      if (eff.kind === 'regenHp' && unit.hp < unit.maxHp) {
        const amt = Math.max(1, Math.round(unit.maxHp * eff.fraction));
        unit.hp = Math.min(unit.maxHp, unit.hp + amt);
        state.pushLog({ text: `${unit.name}は${amt}回復した。`, kind: 'heal', targetId: unit.id, amount: amt });
      }
      if (eff.kind === 'regenMp' && unit.mp < unit.maxMp) {
        unit.mp = Math.min(unit.maxMp, unit.mp + eff.amount);
      }
    }
  }

  /** Buff allies when a unit faints (lastEcho). */
  onFaint(state: BattleState, fallen: BattleUnit): void {
    for (const t of fallen.traits) {
      const eff = TRAITS[t].effect;
      if (eff.kind === 'onFaintBuffAllies') {
        for (const ally of state.teamOf(fallen).units) {
          if (ally.isAlive && ally.id !== fallen.id) {
            ally.modifiers.push({
              id: `faintbuff_${fallen.id}`,
              stats: { [eff.stat]: eff.multiplier },
              remaining: eff.duration,
            });
          }
        }
        state.pushLog({ text: `${fallen.name}の残響が仲間を奮い立たせた！`, kind: 'status' });
      }
    }
  }

  /** Returns the unit that should take a physical hit (cover trait), if any. */
  resolveCover(state: BattleState, intended: BattleUnit): BattleUnit {
    if (intended.hp / intended.maxHp > 0.3) return intended;
    for (const ally of state.teamOf(intended).units) {
      if (ally.id === intended.id || !ally.isAlive) continue;
      for (const t of ally.traits) {
        const eff = TRAITS[t].effect;
        if (eff.kind === 'cover' && intended.hp / intended.maxHp <= eff.threshold) {
          return ally;
        }
      }
    }
    return intended;
  }
}
