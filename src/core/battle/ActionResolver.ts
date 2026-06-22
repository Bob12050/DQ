import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { BattleState } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import type { BattleAction } from './types.ts';
import type { DamageCalculator } from './DamageCalculator.ts';
import type { StatusEffectService } from './StatusEffectService.ts';
import type { TraitTriggerService } from './TraitTriggerService.ts';
import type { Rng } from '../rng.ts';
import type { SkillDefinition, TargetRule } from '../types.ts';
import { TargetResolver } from './TargetResolver.ts';
import { TRAITS } from '../data/traits.ts';

/** Resolves a single BattleAction, mutating battle state and writing the log. */
export class ActionResolver {
  constructor(
    private reg: DataRegistry,
    private dmg: DamageCalculator,
    private status: StatusEffectService,
    private traits: TraitTriggerService,
  ) {}

  resolve(state: BattleState, action: BattleAction, rng: Rng): void {
    const actor = state.unit(action.actorId);
    if (!actor.isAlive) return; // fell before acting -> skip

    if (!actor.canAct) {
      // Asleep / stunned: announce and forfeit the action (no MP spent).
      const blocking = actor.statuses.find((s) => this.reg.statusEffect(s.id).preventsAction);
      if (blocking) {
        state.pushLog({
          text: `${actor.name}は${this.reg.statusEffect(blocking.id).name}で動けない！`,
          kind: 'status',
          actorId: actor.id,
        });
      }
      return;
    }

    switch (action.actionType) {
      case 'guard':
        actor.guarding = true;
        state.pushLog({ text: `${actor.name}は身構えた。`, kind: 'info', actorId: actor.id });
        return;
      case 'wait':
        state.pushLog({ text: `${actor.name}は様子を見ている。`, kind: 'info', actorId: actor.id });
        return;
      case 'item':
        this.resolveItem(state, actor, action, rng);
        return;
      case 'attack':
        this.resolveSkill(state, actor, this.reg.skill('strike'), action, rng);
        return;
      case 'skill': {
        const skill = this.reg.skill(action.skillId!);
        if (skill.mpCost > actor.mp) {
          // Can't afford now -> fall back to a basic attack (no MP spent).
          this.resolveSkill(state, actor, this.reg.skill('strike'), action, rng);
          return;
        }
        this.resolveSkill(state, actor, skill, action, rng);
        return;
      }
      default:
        return; // resonate/flee handled by BattleController
    }
  }

  private resolveSkill(
    state: BattleState,
    actor: BattleUnit,
    skill: SkillDefinition,
    action: BattleAction,
    rng: Rng,
  ): void {
    const rule = (action.originalTargetRule as TargetRule | undefined) ?? skill.target;
    const targets = TargetResolver.resolve(state, actor, rule, action.targetIds, rng);
    if (targets.length === 0) {
      state.pushLog({ text: `${actor.name}の${skill.name}は対象がいない！`, kind: 'info', actorId: actor.id });
      return;
    }

    // MP consumed only now that the skill actually fires.
    actor.mp = Math.max(0, actor.mp - skill.mpCost);
    state.pushLog({ text: `${actor.name}の${skill.name}！`, kind: 'info', actorId: actor.id });

    if (rule === 'enemyRandomMulti') {
      this.resolveMultiHit(state, actor, skill, rng);
      return;
    }

    for (const target of targets) {
      this.applyToTarget(state, actor, skill, target, rng);
      if (state.enemy.isWiped() && actor.side === 'player') break; // stop wasting hits
    }
  }

  private resolveMultiHit(state: BattleState, actor: BattleUnit, skill: SkillDefinition, rng: Rng): void {
    const hits = skill.hits ?? 1;
    for (let i = 0; i < hits; i++) {
      const pool = state.enemyTeamOf(actor).livingUnits();
      if (pool.length === 0) break; // all targets fell -> stop
      const target = rng.pick(pool);
      this.applyToTarget(state, actor, skill, target, rng);
    }
  }

  private applyToTarget(
    state: BattleState,
    actor: BattleUnit,
    skill: SkillDefinition,
    intended: BattleUnit,
    rng: Rng,
  ): void {
    switch (skill.effectKind) {
      case 'physical':
      case 'magical': {
        // Cover trait may redirect physical hits.
        const target = skill.effectKind === 'physical' ? this.traits.resolveCover(state, intended) : intended;
        if (!rng.chance(skill.accuracy)) {
          state.pushLog({ text: `${target.name}は攻撃をかわした！`, kind: 'info', targetId: target.id });
          return;
        }
        const res = this.dmg.computeDamage(skill, actor, target, rng);
        this.dealDamage(state, actor, target, res.damage, res.critical, rng);
        if (skill.inflicts && target.isAlive) {
          this.status.tryInflict(state, actor, target, skill.inflicts.status, skill.inflicts.chance, rng, skill.inflicts.duration);
        }
        return;
      }
      case 'heal': {
        if (!intended.isAlive) return;
        const amt = this.dmg.computeHeal(skill, actor);
        intended.hp = Math.min(intended.maxHp, intended.hp + amt);
        state.pushLog({ text: `${intended.name}は${amt}回復した。`, kind: 'heal', targetId: intended.id, amount: amt });
        return;
      }
      case 'revive': {
        if (intended.isAlive) return;
        const amt = Math.max(1, Math.round(intended.maxHp * skill.power));
        intended.hp = amt;
        state.pushLog({ text: `${intended.name}が再び立ち上がった！`, kind: 'heal', targetId: intended.id, amount: amt });
        return;
      }
      case 'buff':
      case 'debuff': {
        if (skill.effectKind === 'debuff' && !rng.chance(skill.accuracy)) {
          state.pushLog({ text: `${intended.name}には効かなかった。`, kind: 'info', targetId: intended.id });
          return;
        }
        if (skill.statChange) {
          intended.modifiers.push({
            id: `skill_${skill.id}`,
            stats: { ...skill.statChange.stats },
            remaining: skill.statChange.duration,
          });
          const dir = skill.effectKind === 'buff' ? '上がった' : '下がった';
          state.pushLog({ text: `${intended.name}の能力が${dir}。`, kind: 'status', targetId: intended.id });
        }
        return;
      }
      case 'ailment': {
        if (!intended.isAlive) return;
        if (!rng.chance(skill.accuracy)) {
          state.pushLog({ text: `${intended.name}には効かなかった。`, kind: 'info', targetId: intended.id });
          return;
        }
        if (skill.inflicts) {
          this.status.tryInflict(state, actor, intended, skill.inflicts.status, skill.inflicts.chance, rng, skill.inflicts.duration);
        }
        return;
      }
      case 'cleanse': {
        const removed = this.status.cure(
          intended,
          intended.statuses.filter((s) => this.reg.statusEffect(s.id).kind === 'ailment').map((s) => s.id),
        );
        if (removed.length) state.pushLog({ text: `${intended.name}の状態異常が治った。`, kind: 'status', targetId: intended.id });
        return;
      }
      case 'guard':
        actor.guarding = true;
        return;
    }
  }

  /** Applies damage, handles wake-on-hit, faint events and counters. */
  private dealDamage(
    state: BattleState,
    attacker: BattleUnit,
    target: BattleUnit,
    amount: number,
    critical: boolean,
    rng: Rng,
  ): void {
    target.hp = Math.max(0, target.hp - amount);
    state.pushLog({
      text: `${target.name}に${amount}のダメージ！${critical ? ' 会心の一撃！' : ''}`,
      kind: 'damage',
      targetId: target.id,
      amount,
      critical,
    });
    this.status.maybeWakeOnHit(target, rng);

    if (!target.isAlive) {
      state.pushLog({ text: `${target.name}は倒れた。`, kind: 'faint', targetId: target.id });
      this.traits.onFaint(state, target);
      return;
    }
    // Counter trait (thornmail): living target may strike back.
    for (const t of target.traits) {
      const eff = TRAITS[t].effect;
      if (eff.kind === 'counter' && attacker.isAlive && rng.chance(eff.chance)) {
        const counterDmg = Math.max(1, Math.round(target.effectiveStat(this.reg, 'attack') * eff.multiplier));
        attacker.hp = Math.max(0, attacker.hp - counterDmg);
        state.pushLog({ text: `${target.name}の反撃！ ${attacker.name}に${counterDmg}のダメージ！`, kind: 'damage', targetId: attacker.id, amount: counterDmg });
        if (!attacker.isAlive) {
          state.pushLog({ text: `${attacker.name}は倒れた。`, kind: 'faint', targetId: attacker.id });
          this.traits.onFaint(state, attacker);
        }
      }
    }
  }

  private resolveItem(state: BattleState, actor: BattleUnit, action: BattleAction, rng: Rng): void {
    const item = this.reg.item(action.itemId!);
    const rule = (action.originalTargetRule as TargetRule | undefined) ?? item.target;
    const targets = TargetResolver.resolve(state, actor, rule, action.targetIds, rng);

    state.itemsConsumed[item.id] = (state.itemsConsumed[item.id] ?? 0) + 1;
    state.pushLog({ text: `${actor.name}は${item.name}を使った。`, kind: 'info', actorId: actor.id });

    const eff = item.effect;
    if (eff.kind === 'recruitBoost') {
      state.recruitItemBonus += eff.bonus;
      return;
    }
    for (const target of targets) {
      switch (eff.kind) {
        case 'healHp':
          if (target.isAlive) {
            target.hp = Math.min(target.maxHp, target.hp + eff.amount);
            state.pushLog({ text: `${target.name}は${eff.amount}回復した。`, kind: 'heal', targetId: target.id, amount: eff.amount });
          }
          break;
        case 'healMp':
          if (target.isAlive) target.mp = Math.min(target.maxMp, target.mp + eff.amount);
          break;
        case 'cureAilment':
          this.status.cure(target, eff.statuses);
          break;
        case 'revive':
          if (!target.isAlive) {
            target.hp = Math.max(1, Math.round(target.maxHp * eff.hpFraction));
            state.pushLog({ text: `${target.name}が復活した！`, kind: 'heal', targetId: target.id });
          }
          break;
        case 'statBuff':
          target.modifiers.push({ id: `item_${item.id}`, stats: { ...eff.stats }, remaining: eff.duration });
          break;
      }
    }
  }
}
