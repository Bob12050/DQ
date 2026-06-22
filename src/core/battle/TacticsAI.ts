import type { BattleState } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import type { BattleCommand } from './types.ts';
import type { ActionEvaluator, AiContext } from './ActionEvaluator.ts';
import { TACTICS } from '../data/tactics.ts';

/**
 * Picks commands for player units whose tactics is NOT manual. Reuses the same
 * evaluator as the enemy AI but tags commands as 'tactics'.
 */
export class TacticsAI {
  constructor(private evaluator: ActionEvaluator) {}

  isManual(unit: BattleUnit): boolean {
    return TACTICS[unit.tactics].manual;
  }

  chooseCommand(state: BattleState, unit: BattleUnit, ctx: AiContext): BattleCommand {
    const cmd = this.evaluator.decide(state, unit, unit.tactics, ctx);
    cmd.commandSource = 'tactics';
    return cmd;
  }
}
