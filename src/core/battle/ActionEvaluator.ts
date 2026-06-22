import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { BattleState } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import type { BattleCommand } from './types.ts';
import type { DamageCalculator } from './DamageCalculator.ts';
import type { SkillDefinition, StatusEffectId, TacticsId } from '../types.ts';
import { TACTICS } from '../data/tactics.ts';

/**
 * Cross-turn reservation context so multiple AI units don't, e.g., all heal the
 * same ally or stack the same ailment. Populated as commands are decided.
 */
export interface AiContext {
  /** Healing already promised to a target this turn (by unit id). */
  reservedHeal: Map<string, number>;
  /** Ailments already promised this turn: "targetId:status". */
  reservedAilments: Set<string>;
  /** Kill blows already promised this turn (by target id). */
  reservedKills: Set<string>;
}

export function newAiContext(): AiContext {
  return { reservedHeal: new Map(), reservedAilments: new Set(), reservedKills: new Set() };
}

interface Candidate {
  command: BattleCommand;
  score: number;
}

/**
 * Shared scoring used by both enemy AI and player "tactics" automation.
 * Never selects a skill the unit cannot afford. Never fully random.
 */
export class ActionEvaluator {
  constructor(
    private reg: DataRegistry,
    private dmg: DamageCalculator,
  ) {}

  decide(
    state: BattleState,
    actor: BattleUnit,
    tacticsId: TacticsId,
    ctx: AiContext,
  ): BattleCommand {
    const weights = TACTICS[tacticsId].weights;
    const candidates: Candidate[] = [];

    const allies = state.teamOf(actor).livingUnits();
    const enemies = state.enemyTeamOf(actor).livingUnits();

    // Always consider a plain attack (free).
    if (enemies.length > 0) {
      candidates.push(this.scoreAttack(state, actor, enemies, weights, ctx));
    }

    for (const skillId of actor.skills) {
      const skill = this.reg.skill(skillId);
      if (skill.mpCost > actor.mp) continue; // never pick unaffordable skills
      const cand = this.scoreSkill(state, actor, skill, allies, enemies, weights, ctx);
      if (cand) candidates.push(cand);
    }

    // Guard fallback.
    candidates.push({
      command: { actorId: actor.id, actionType: 'guard', targetIds: [actor.id], commandSource: 'enemyAI' },
      score: 1.5 * weights.guard * (actor.hp / actor.maxHp < 0.35 ? 2 : 1),
    });

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0]!.command;
    this.reserve(best, ctx);
    return best;
  }

  private mpPenalty(skill: SkillDefinition, actor: BattleUnit, mpThrift: number): number {
    if (skill.mpCost === 0) return 1;
    // Higher thrift => steeper penalty as MP gets scarce.
    const mpRatio = actor.mp / Math.max(1, actor.maxMp);
    return 1 - (skill.mpCost / Math.max(1, actor.maxMp)) * mpThrift * (1.2 - mpRatio);
  }

  private scoreAttack(
    _state: BattleState,
    actor: BattleUnit,
    enemies: BattleUnit[],
    weights: { damage: number },
    ctx: AiContext,
  ): Candidate {
    const strike = this.reg.skill('strike');
    let bestTarget = enemies[0]!;
    let bestDmg = -1;
    for (const e of enemies) {
      const d = this.dmg.estimateDamage(strike, actor, e);
      const killable = d >= e.hp && !ctx.reservedKills.has(e.id);
      const v = d + (killable ? d * 0.8 : 0) + (1 - e.hp / e.maxHp) * 5;
      if (v > bestDmg) {
        bestDmg = v;
        bestTarget = e;
      }
    }
    return {
      command: { actorId: actor.id, actionType: 'attack', targetIds: [bestTarget.id], commandSource: 'enemyAI' },
      score: (bestDmg + 1) * weights.damage,
    };
  }

  private scoreSkill(
    state: BattleState,
    actor: BattleUnit,
    skill: SkillDefinition,
    allies: BattleUnit[],
    enemies: BattleUnit[],
    weights: { damage: number; heal: number; support: number; guard: number; mpThrift: number },
    ctx: AiContext,
  ): Candidate | null {
    const mpMult = this.mpPenalty(skill, actor, weights.mpThrift);
    const base = skill.aiWeight;

    switch (skill.effectKind) {
      case 'physical':
      case 'magical': {
        if (enemies.length === 0) return null;
        if (skill.target === 'enemyAll' || skill.target === 'enemyRandomMulti') {
          let total = 0;
          for (const e of enemies) total += this.dmg.estimateDamage(skill, actor, e);
          const score = (total * 0.9 + base) * weights.damage * mpMult;
          return {
            command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: enemies.map((e) => e.id), commandSource: 'enemyAI' },
            score,
          };
        }
        let bestTarget = enemies[0]!;
        let bestDmg = -1;
        for (const e of enemies) {
          const d = this.dmg.estimateDamage(skill, actor, e);
          const killable = d >= e.hp && !ctx.reservedKills.has(e.id);
          const v = d + (killable ? d : 0) + (1 - e.hp / e.maxHp) * 6;
          if (v > bestDmg) {
            bestDmg = v;
            bestTarget = e;
          }
        }
        return {
          command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: [bestTarget.id], commandSource: 'enemyAI' },
          score: (bestDmg + base) * weights.damage * mpMult,
        };
      }
      case 'heal': {
        const all = skill.target === 'allyAll';
        const wounded = allies.filter((a) => {
          const reserved = ctx.reservedHeal.get(a.id) ?? 0;
          return a.hp + reserved < a.maxHp * 0.95;
        });
        if (wounded.length === 0) return null; // don't heal full units
        if (all) {
          const missing = wounded.reduce((s, a) => s + (a.maxHp - a.hp), 0);
          if (missing < actor.maxHp * 0.3) return null;
          return {
            command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: allies.map((a) => a.id), commandSource: 'enemyAI' },
            score: (missing * 0.4 + base) * weights.heal * mpMult,
          };
        }
        wounded.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        const target = wounded[0]!;
        const urgency = 1 - target.hp / target.maxHp;
        return {
          command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: [target.id], commandSource: 'enemyAI' },
          score: (urgency * 60 + base) * weights.heal * mpMult,
        };
      }
      case 'revive': {
        const dead = allies.length ? state.teamOf(actor).units.filter((u) => !u.isAlive && !u.recruited) : [];
        if (dead.length === 0) return null;
        return {
          command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: [dead[0]!.id], commandSource: 'enemyAI' },
          score: (50 + base) * weights.heal * mpMult,
        };
      }
      case 'buff': {
        const target = skill.target === 'allyAll' ? allies : [actor];
        // Avoid re-buffing.
        if (skill.statChange) {
          const key = Object.keys(skill.statChange.stats)[0] as StatusEffectId | undefined;
          if (key && actor.modifiers.some((m) => Object.prototype.hasOwnProperty.call(m.stats, key))) {
            return null;
          }
        }
        return {
          command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: target.map((t) => t.id), commandSource: 'enemyAI' },
          score: (base + 4) * weights.support * mpMult,
        };
      }
      case 'debuff':
      case 'ailment': {
        if (enemies.length === 0) return null;
        const status = skill.inflicts?.status;
        if (skill.target === 'enemyAll') {
          return {
            command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: enemies.map((e) => e.id), commandSource: 'enemyAI' },
            score: (base + 5) * weights.support * mpMult,
          };
        }
        // Single: avoid targets already carrying/reserved that ailment.
        const fresh = enemies.filter((e) => {
          if (status && (e.hasStatus(status) || ctx.reservedAilments.has(`${e.id}:${status}`))) return false;
          return true;
        });
        const pool = fresh.length ? fresh : enemies;
        pool.sort((a, b) => b.hp - a.hp); // hex the strongest
        const target = pool[0]!;
        return {
          command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: [target.id], commandSource: 'enemyAI' },
          score: (base + (fresh.length ? 6 : 0)) * weights.support * mpMult,
        };
      }
      case 'cleanse': {
        const target = allies.find((a) => a.statuses.some((s) => this.reg.statusEffect(s.id).kind === 'ailment'));
        if (!target) return null;
        return {
          command: { actorId: actor.id, actionType: 'skill', skillId: skill.id, targetIds: [target.id], commandSource: 'enemyAI' },
          score: (base + 8) * weights.support * mpMult,
        };
      }
      case 'guard':
        return {
          command: { actorId: actor.id, actionType: 'guard', targetIds: [actor.id], commandSource: 'enemyAI' },
          score: 2 * weights.guard * (actor.hp / actor.maxHp < 0.35 ? 2 : 1),
        };
    }
  }

  private reserve(cmd: BattleCommand, ctx: AiContext): void {
    if (!cmd.skillId) return;
    const skill = this.reg.skill(cmd.skillId);
    if (skill.effectKind === 'heal') {
      const each = skill.power; // rough
      for (const id of cmd.targetIds) ctx.reservedHeal.set(id, (ctx.reservedHeal.get(id) ?? 0) + each);
    }
    if (skill.inflicts) {
      for (const id of cmd.targetIds) ctx.reservedAilments.add(`${id}:${skill.inflicts.status}`);
    }
  }
}
