import type { BattleState } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import type { TargetRule } from '../types.ts';
import type { Rng } from '../rng.ts';

/**
 * Centralizes all target-rule logic so skills/items never grow per-id if-chains.
 * Used both for UI selection (valid candidates) and resolution-time targeting.
 */
export class TargetResolver {
  /** Whether the rule needs the player to pick a specific target in the UI. */
  static needsManualPick(rule: TargetRule): boolean {
    return rule === 'allyOne' || rule === 'enemyOne' || rule === 'allyDeadOne';
  }

  /** Valid candidate units a player may choose for a single-target rule. */
  static candidates(state: BattleState, actor: BattleUnit, rule: TargetRule): BattleUnit[] {
    const allies = state.teamOf(actor).units;
    const enemies = state.enemyTeamOf(actor).units;
    switch (rule) {
      case 'allyOne':
      case 'allyAll':
      case 'allyRandom':
        return allies.filter((u) => u.isAlive);
      case 'allyOthers':
        return allies.filter((u) => u.isAlive && u.id !== actor.id);
      case 'enemyOne':
      case 'enemyAll':
      case 'enemyRandomMulti':
        return enemies.filter((u) => u.isAlive);
      case 'allyDeadOne':
        return allies.filter((u) => !u.isAlive && !u.recruited);
      case 'self':
        return [actor];
      case 'everyone':
        return [...allies, ...enemies].filter((u) => u.isAlive);
    }
  }

  /**
   * Resolves the concrete targets for an action at resolution time, given the
   * originally-chosen ids. Handles fallen targets per the spec rules.
   * Returns [] when the action should fail (no valid target).
   */
  static resolve(
    state: BattleState,
    actor: BattleUnit,
    rule: TargetRule,
    chosenIds: string[],
    rng: Rng,
  ): BattleUnit[] {
    const allies = state.teamOf(actor).units;
    const enemies = state.enemyTeamOf(actor).units;
    const livingAllies = allies.filter((u) => u.isAlive);
    const livingEnemies = enemies.filter((u) => u.isAlive);

    switch (rule) {
      case 'self':
        return actor.isAlive ? [actor] : [];
      case 'allyAll':
        return livingAllies;
      case 'enemyAll':
        return livingEnemies;
      case 'everyone':
        return [...livingAllies, ...livingEnemies];
      case 'allyOthers':
        return livingAllies.filter((u) => u.id !== actor.id);
      case 'allyRandom':
        return livingAllies.length ? [rng.pick(livingAllies)] : [];
      case 'enemyOne': {
        const chosen = enemies.find((u) => u.id === chosenIds[0]);
        if (chosen && chosen.isAlive) return [chosen];
        // Re-select another living enemy if the chosen one already fell.
        return livingEnemies.length ? [rng.pick(livingEnemies)] : [];
      }
      case 'allyOne': {
        const chosen = allies.find((u) => u.id === chosenIds[0]);
        if (chosen && chosen.isAlive) return [chosen];
        return livingAllies.length ? [rng.pick(livingAllies)] : [];
      }
      case 'allyDeadOne': {
        // Revive: only valid if the chosen target is actually fallen.
        const chosen = allies.find((u) => u.id === chosenIds[0]);
        if (chosen && !chosen.isAlive && !chosen.recruited) return [chosen];
        return []; // fails if no longer dead
      }
      case 'enemyRandomMulti':
        // Hits are expanded by the resolver per-hit; return the living pool.
        return livingEnemies;
    }
  }
}
