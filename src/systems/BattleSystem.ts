import type { Monster } from '../types/Monster';
import type {
  BattleCommand,
  BattleEvent,
  BattleHit,
  BattleOutcome,
  BattleUnit,
  RoundResult,
  ScoutedMonster,
  Side,
} from '../types/Battle';
import type { Rarity } from '../types/Monster';
import { getSkill } from '../data/skills';
import { DamageCalculator, type Rng } from './DamageCalculator';
import { TurnOrderSystem } from './TurnOrderSystem';
import { EnemyAI } from './EnemyAI';

/** Deep-ish copy so battle never mutates the persisted monster. */
function cloneMonster(m: Monster): Monster {
  return { ...m, skills: [...m.skills] };
}

/**
 * Pure (Phaser-independent) 4v4 turn-based battle engine.
 *
 * Usage:
 *   const battle = new BattleSystem(allyMonsters, enemyMonsters);
 *   const result = battle.resolveRound(allyCommands); // map of allyIndex -> command
 *   // render result.events, repeat until result.outcome !== 'ongoing'
 */
export class BattleSystem {
  readonly allies: BattleUnit[];
  readonly enemies: BattleUnit[];
  /** Enemies recruited via the scout command this battle. */
  readonly scouted: ScoutedMonster[] = [];
  private dmg: DamageCalculator;
  private order: TurnOrderSystem;
  private ai: EnemyAI;
  private rngFn: Rng;

  constructor(allyMonsters: Monster[], enemyMonsters: Monster[], rng: Rng = Math.random) {
    this.allies = allyMonsters.slice(0, 4).map((m, i) => this.makeUnit(m, 'ally', i));
    this.enemies = enemyMonsters.slice(0, 4).map((m, i) => this.makeUnit(m, 'enemy', i));
    this.dmg = new DamageCalculator(rng);
    this.order = new TurnOrderSystem(rng);
    this.ai = new EnemyAI(rng);
    this.rngFn = rng;
  }

  private makeUnit(m: Monster, side: Side, index: number): BattleUnit {
    const monster = cloneMonster(m);
    return { monster, side, index, alive: monster.hp > 0, defending: false, scouted: false };
  }

  outcome(): BattleOutcome {
    if (this.enemies.every((u) => !u.alive)) return 'win';
    if (this.allies.every((u) => !u.alive)) return 'lose';
    return 'ongoing';
  }

  private own(side: Side): BattleUnit[] {
    return side === 'ally' ? this.allies : this.enemies;
  }
  private opposing(side: Side): BattleUnit[] {
    return side === 'ally' ? this.enemies : this.allies;
  }

  /**
   * Resolves a full round given the player's commands for each living ally.
   * Enemy commands are produced by the AI. Returns ordered events + outcome.
   */
  resolveRound(allyCommands: Map<number, BattleCommand>): RoundResult {
    const events: BattleEvent[] = [];

    // Reset per-round defend flags.
    for (const u of [...this.allies, ...this.enemies]) u.defending = false;

    // Enemy AI commands.
    const enemyCommands = new Map<number, BattleCommand>();
    for (const e of this.enemies) {
      if (e.alive) enemyCommands.set(e.index, this.ai.choose(e, this.allies));
    }

    // Apply defend flags up-front (defend lasts the whole round).
    for (const [i, c] of allyCommands) if (c.type === 'defend') this.setDefending(this.allies, i);
    for (const [i, c] of enemyCommands) if (c.type === 'defend') this.setDefending(this.enemies, i);

    // Single action queue ordered by speed across both teams.
    const actors = this.order.order([...this.allies, ...this.enemies]);

    for (const actor of actors) {
      if (!actor.alive) continue; // fell earlier this round
      const cmd =
        actor.side === 'ally' ? allyCommands.get(actor.index) : enemyCommands.get(actor.index);
      if (!cmd) continue;

      if (cmd.type === 'defend') {
        events.push({ actorSide: actor.side, actorIndex: actor.index, text: `${actor.monster.name}は身を守っている`, hits: [] });
        continue;
      }

      if (cmd.type === 'scout') {
        events.push(this.resolveScout(actor, cmd));
      } else {
        events.push(this.resolveAction(actor, cmd));
      }

      const oc = this.outcome();
      if (oc !== 'ongoing') return { events, outcome: oc };
    }

    return { events, outcome: this.outcome() };
  }

  private setDefending(team: BattleUnit[], index: number): void {
    const u = team[index];
    if (u && u.alive) u.defending = true;
  }

  private resolveAction(actor: BattleUnit, cmd: BattleCommand): BattleEvent {
    if (cmd.type === 'attack') {
      const target = this.pickTarget(this.opposing(actor.side), cmd.targetIndex);
      const hits: BattleHit[] = [];
      if (target) hits.push(this.applyAttack(actor, target));
      return { actorSide: actor.side, actorIndex: actor.index, text: `${actor.monster.name}の攻撃！`, hits };
    }

    // Skill.
    const skill = getSkill(cmd.skillId!);
    const hits: BattleHit[] = [];

    if (skill.kind === 'heal') {
      const targets = this.resolveHealTargets(actor, skill.targetType, cmd.targetIndex);
      for (const t of targets) hits.push(this.applyHeal(actor, t, skill));
      return { actorSide: actor.side, actorIndex: actor.index, text: `${actor.monster.name}は${skill.name}！`, hits };
    }

    // Offensive skill.
    const targets = this.resolveEnemyTargets(actor, skill.targetType, cmd.targetIndex);
    for (const t of targets) hits.push(this.applySkill(actor, t, skill));
    return { actorSide: actor.side, actorIndex: actor.index, text: `${actor.monster.name}は${skill.name}！`, hits };
  }

  /** Base scout success rate by rarity (before HP scaling). */
  private static SCOUT_BASE: Record<Rarity, number> = {
    common: 0.55,
    rare: 0.35,
    epic: 0.2,
    legendary: 0.1,
  };

  /** Scout chance: lower target HP greatly increases success. */
  scoutChance(target: BattleUnit): number {
    const base = BattleSystem.SCOUT_BASE[target.monster.rarity];
    const ratio = target.monster.maxHp > 0 ? target.monster.hp / target.monster.maxHp : 1;
    const chance = base * (1.4 - ratio * 0.9); // full HP ~0.5x, near-dead ~1.4x
    return Math.max(0.05, Math.min(0.95, chance));
  }

  private resolveScout(actor: BattleUnit, cmd: BattleCommand): BattleEvent {
    const target = this.pickTarget(this.opposing(actor.side), cmd.targetIndex);
    if (!target) {
      return { actorSide: actor.side, actorIndex: actor.index, text: `${actor.monster.name}はスカウトしようとしたが相手がいない`, hits: [] };
    }
    const chance = this.scoutChance(target);
    if (this.rngFn() < chance) {
      target.alive = false;
      target.scouted = true;
      this.scouted.push({ templateId: target.monster.templateId, level: target.monster.level });
      return {
        actorSide: actor.side,
        actorIndex: actor.index,
        text: `${actor.monster.name}のスカウト成功！ ${target.monster.name} が仲間になった！`,
        hits: [],
      };
    }
    return { actorSide: actor.side, actorIndex: actor.index, text: `${actor.monster.name}は${target.monster.name}のスカウトに失敗した…`, hits: [] };
  }

  private pickTarget(team: BattleUnit[], idx?: number): BattleUnit | undefined {
    if (idx !== undefined && team[idx]?.alive) return team[idx];
    return team.find((u) => u.alive);
  }

  private resolveEnemyTargets(actor: BattleUnit, targetType: string, idx?: number): BattleUnit[] {
    const opp = this.opposing(actor.side);
    if (targetType === 'allEnemies') return opp.filter((u) => u.alive);
    const t = this.pickTarget(opp, idx);
    return t ? [t] : [];
  }

  private resolveHealTargets(actor: BattleUnit, targetType: string, idx?: number): BattleUnit[] {
    const own = this.own(actor.side);
    if (targetType === 'allAllies') return own.filter((u) => u.alive);
    if (targetType === 'self') return [actor];
    const t = this.pickTarget(own, idx) ?? actor;
    return [t];
  }

  private applyAttack(actor: BattleUnit, target: BattleUnit): BattleHit {
    const { amount, mult } = this.dmg.attackDamage(actor.monster, target.monster, target.defending);
    return this.applyDamage(target, amount, mult);
  }

  private applySkill(actor: BattleUnit, target: BattleUnit, skill: ReturnType<typeof getSkill>): BattleHit {
    const { amount, mult } = this.dmg.skillDamage(actor.monster, target.monster, skill, target.defending);
    return this.applyDamage(target, amount, mult);
  }

  private applyDamage(target: BattleUnit, amount: number, mult: number): BattleHit {
    const before = target.monster.hp;
    target.monster.hp = Math.max(0, before - amount);
    if (target.monster.hp <= 0) target.alive = false;
    return {
      side: target.side,
      index: target.index,
      hpBefore: before,
      hpAfter: target.monster.hp,
      amount,
      kind: 'damage',
      effectiveness: DamageCalculator.effectivenessOf(mult),
      dead: !target.alive,
    };
  }

  private applyHeal(actor: BattleUnit, target: BattleUnit, skill: ReturnType<typeof getSkill>): BattleHit {
    const before = target.monster.hp;
    const heal = this.dmg.healAmount(actor.monster, skill);
    target.monster.hp = Math.min(target.monster.maxHp, before + heal);
    return {
      side: target.side,
      index: target.index,
      hpBefore: before,
      hpAfter: target.monster.hp,
      amount: target.monster.hp - before,
      kind: 'heal',
      effectiveness: 'normal',
      dead: false,
    };
  }
}
