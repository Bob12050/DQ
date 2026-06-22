import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { BattleState } from './BattleState.ts';
import type { BattleAction, BattleCommand } from './types.ts';
import type { Rng } from '../rng.ts';

/**
 * Merges all player + enemy commands into a single ordered queue.
 * Order: priority desc, then effective speed desc, then random tiebreaker.
 *
 * effectiveSpeed = agility(after modifiers) * randomRange(0.9..1.1)
 * (status/trait modifiers are already folded into effectiveStat).
 */
export class ActionQueueBuilder {
  constructor(private reg: DataRegistry) {}

  build(state: BattleState, commands: BattleCommand[], rng: Rng): BattleAction[] {
    const actions: BattleAction[] = commands.map((cmd) => {
      const actor = state.unit(cmd.actorId);
      const priority = this.priorityOf(cmd);
      const agility = actor.effectiveStat(this.reg, 'agility');
      const speedSnapshot = agility * rng.float(0.9, 1.1);
      return {
        actorId: cmd.actorId,
        actionType: cmd.actionType,
        skillId: cmd.skillId,
        itemId: cmd.itemId,
        targetIds: [...cmd.targetIds],
        priority,
        speedSnapshot,
        randomTieBreaker: rng.next(),
        commandSource: cmd.commandSource,
        originalTargetRule: this.targetRuleOf(cmd),
      };
    });

    actions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.speedSnapshot !== a.speedSnapshot) return b.speedSnapshot - a.speedSnapshot;
      return b.randomTieBreaker - a.randomTieBreaker;
    });
    return actions;
  }

  private priorityOf(cmd: BattleCommand): number {
    if (cmd.actionType === 'guard') return 10;
    if (cmd.actionType === 'item') return 6;
    if (cmd.actionType === 'skill' && cmd.skillId) return this.reg.skill(cmd.skillId).priority;
    if (cmd.actionType === 'wait') return -10;
    return 0;
  }

  private targetRuleOf(cmd: BattleCommand): string {
    if (cmd.actionType === 'skill' && cmd.skillId) return this.reg.skill(cmd.skillId).target;
    if (cmd.actionType === 'attack') return 'enemyOne';
    if (cmd.actionType === 'item' && cmd.itemId) return this.reg.item(cmd.itemId).target;
    return 'self';
  }
}
