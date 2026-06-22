import type { BattleCommand, BattleUnit } from '../types/Battle';
import { getSkill } from '../data/skills';
import type { Rng } from './DamageCalculator';

/**
 * Simple but non-trivial enemy AI. Targets the lowest-HP living opponent and
 * occasionally uses an offensive skill. Designed as an extension point for
 * smarter behaviour (element-aware targeting, healing, etc.).
 */
export class EnemyAI {
  constructor(private rng: Rng = Math.random) {}

  choose(actor: BattleUnit, opposing: BattleUnit[]): BattleCommand {
    const targets = opposing.filter((u) => u.alive);
    if (targets.length === 0) return { type: 'defend' };

    // Pick the most-wounded opponent (lowest current HP).
    let target = targets[0]!;
    for (const t of targets) {
      if (t.monster.hp < target.monster.hp) target = t;
    }

    // Offensive skills the actor knows.
    const attackSkills = actor.monster.skills
      .map((id) => getSkill(id))
      .filter((s) => s.kind === 'attack' || s.kind === 'debuff');

    if (attackSkills.length > 0 && this.rng() < 0.5) {
      const skill = attackSkills[Math.floor(this.rng() * attackSkills.length)]!;
      return { type: 'skill', skillId: skill.id, targetIndex: target.index };
    }
    return { type: 'attack', targetIndex: target.index };
  }
}
