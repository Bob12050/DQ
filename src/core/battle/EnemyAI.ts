import type { BattleState } from './BattleState.ts';
import type { BattleCommand } from './types.ts';
import type { ActionEvaluator, AiContext } from './ActionEvaluator.ts';

/**
 * Chooses commands for every living, actionable enemy unit using the shared
 * evaluator. Boss units simply carry a tuned tactics id in their party data.
 */
export class EnemyAI {
  constructor(private evaluator: ActionEvaluator) {}

  chooseCommands(state: BattleState, ctx: AiContext): BattleCommand[] {
    const commands: BattleCommand[] = [];
    for (const unit of state.enemy.units) {
      if (!unit.canAct) continue;
      const cmd = this.evaluator.decide(state, unit, unit.tactics, ctx);
      cmd.commandSource = 'enemyAI';
      commands.push(cmd);
    }
    return commands;
  }
}
