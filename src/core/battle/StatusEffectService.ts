import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { BattleState } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import type { StatusEffectId } from '../types.ts';
import type { Rng } from '../rng.ts';
import { TRAITS } from '../data/traits.ts';
import { POISON_HP_FRACTION } from '../data/statusEffects.ts';

/** Applies, resists and ticks status effects and timed stat modifiers. */
export class StatusEffectService {
  constructor(private reg: DataRegistry) {}

  /** Net chance to inflict, after attacker boosts and defender resistances. */
  inflictChance(
    attacker: BattleUnit | null,
    defender: BattleUnit,
    status: StatusEffectId,
    baseChance: number,
  ): number {
    let chance = baseChance;
    if (attacker) {
      for (const t of attacker.traits) {
        const eff = TRAITS[t].effect;
        if (eff.kind === 'ailmentBoost') chance += eff.bonus;
      }
    }
    const speciesResist = defender.def.ailmentResist[status] ?? 0;
    chance *= 1 - speciesResist;
    for (const t of defender.traits) {
      const eff = TRAITS[t].effect;
      if (eff.kind === 'ailmentResist') chance *= 1 - eff.reduction;
    }
    return Math.max(0, Math.min(1, chance));
  }

  tryInflict(
    state: BattleState,
    attacker: BattleUnit | null,
    defender: BattleUnit,
    status: StatusEffectId,
    baseChance: number,
    rng: Rng,
    duration?: number,
  ): boolean {
    if (!defender.isAlive) return false;
    const chance = this.inflictChance(attacker, defender, status, baseChance);
    if (!rng.chance(chance)) return false;
    this.apply(defender, status, duration);
    const def = this.reg.statusEffect(status);
    state.pushLog({
      text: `${defender.name}は${def.name}になった！`,
      kind: 'status',
      targetId: defender.id,
    });
    return true;
  }

  apply(unit: BattleUnit, status: StatusEffectId, duration?: number): void {
    const def = this.reg.statusEffect(status);
    const existing = unit.statuses.find((s) => s.id === status);
    const dur = duration ?? def.defaultDuration;
    if (existing) existing.remaining = Math.max(existing.remaining, dur);
    else unit.statuses.push({ id: status, remaining: dur });
  }

  cure(unit: BattleUnit, statuses: StatusEffectId[]): StatusEffectId[] {
    const removed: StatusEffectId[] = [];
    unit.statuses = unit.statuses.filter((s) => {
      if (statuses.includes(s.id)) {
        removed.push(s.id);
        return false;
      }
      return true;
    });
    return removed;
  }

  /** Chance a sleeping unit wakes when struck. */
  maybeWakeOnHit(unit: BattleUnit, rng: Rng): void {
    if (unit.hasStatus('sleep') && rng.chance(0.5)) {
      this.cure(unit, ['sleep']);
    }
  }

  /** End-of-turn: poison damage, then decrement durations. Returns faint events. */
  tickEndOfTurn(state: BattleState, unit: BattleUnit, rng: Rng): void {
    if (!unit.isAlive) return;

    if (unit.hasStatus('poison')) {
      const dmg = Math.max(1, Math.round(unit.maxHp * POISON_HP_FRACTION));
      unit.hp = Math.max(0, unit.hp - dmg);
      state.pushLog({
        text: `${unit.name}は蝕みで${dmg}のダメージ！`,
        kind: 'damage',
        targetId: unit.id,
        amount: dmg,
      });
    }

    // Decrement status durations.
    unit.statuses = unit.statuses.filter((s) => {
      s.remaining -= 1;
      return s.remaining > 0;
    });
    // Decrement timed modifiers.
    unit.modifiers = unit.modifiers.filter((m) => {
      m.remaining -= 1;
      return m.remaining > 0;
    });
    rng; // reserved for future randomised end-of-turn effects
  }
}
