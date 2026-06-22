import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { BattleUnit } from './BattleUnit.ts';
import type { SkillDefinition } from '../types.ts';
import type { Rng } from '../rng.ts';
import { ATTACK_AFFINITY } from '../data/elements.ts';
import { TRAITS } from '../data/traits.ts';

export interface DamageResult {
  damage: number;
  critical: boolean;
  affinity: number; // final element multiplier used (for UI labels)
}

const BASE_CRIT = 0.06;
const CRIT_MULT = 1.5;
const GUARD_MULT = 0.5;

/**
 * Damage & healing math. See DESIGN.md for the documented formulas.
 *
 * Physical/Magical core:
 *   core = power * atk / (def * 0.5 + 5)
 *   final = core * affinity * traitDmgUp * defenderResist * guard * crit * rand
 *   (final is floored at 1 for any damaging hit, so damage is never <= 0)
 */
export class DamageCalculator {
  constructor(private reg: DataRegistry) {}

  /** Element multiplier combining attack affinity, defender resist and trait mods. */
  elementMultiplier(skill: SkillDefinition, attacker: BattleUnit, defender: BattleUnit): number {
    let mult = ATTACK_AFFINITY[skill.element][defender.def.element] ?? 1;

    // Defender's own resistances (data-driven, can be <1, >1, or 0).
    const resist = defender.def.elementResist[skill.element];
    if (resist !== undefined) mult *= resist;

    // Attacker trait: element damage up.
    for (const t of attacker.traits) {
      const eff = TRAITS[t].effect;
      if (eff.kind === 'elementDamageUp' && eff.element === skill.element) mult *= eff.multiplier;
    }
    // Defender trait: element resist.
    for (const t of defender.traits) {
      const eff = TRAITS[t].effect;
      if (eff.kind === 'elementResist' && eff.element === skill.element) mult *= eff.multiplier;
    }
    return mult;
  }

  computeDamage(
    skill: SkillDefinition,
    attacker: BattleUnit,
    defender: BattleUnit,
    rng: Rng,
    powerOverride?: number,
  ): DamageResult {
    const physical = skill.effectKind === 'physical';
    const atk = physical
      ? attacker.effectiveStat(this.reg, 'attack')
      : attacker.effectiveStat(this.reg, 'magic');
    const def = defender.effectiveStat(this.reg, 'defense');

    const power = powerOverride ?? skill.power;
    let core = (power * atk) / (def * 0.5 + 5);

    const affinity = this.elementMultiplier(skill, attacker, defender);
    if (affinity <= 0) {
      return { damage: 0, critical: false, affinity };
    }
    core *= affinity;

    if (defender.guarding) core *= GUARD_MULT;

    const critical = rng.chance(BASE_CRIT);
    if (critical) core *= CRIT_MULT;

    core *= rng.float(0.9, 1.1);

    const damage = Math.max(1, Math.round(core));
    return { damage, critical, affinity };
  }

  /** Deterministic expected damage (no crit/rand) for AI scoring. */
  estimateDamage(skill: SkillDefinition, attacker: BattleUnit, defender: BattleUnit): number {
    const physical = skill.effectKind === 'physical';
    const atk = physical
      ? attacker.effectiveStat(this.reg, 'attack')
      : attacker.effectiveStat(this.reg, 'magic');
    const def = defender.effectiveStat(this.reg, 'defense');
    const affinity = this.elementMultiplier(skill, attacker, defender);
    if (affinity <= 0) return 0;
    let core = ((skill.power * atk) / (def * 0.5 + 5)) * affinity;
    if (defender.guarding) core *= GUARD_MULT;
    return Math.max(1, Math.round(core));
  }

  /** Heal amount from a heal skill: power * (1 + magic/20). */
  computeHeal(skill: SkillDefinition, healer: BattleUnit): number {
    const magic = healer.effectiveStat(this.reg, 'magic');
    return Math.max(1, Math.round(skill.power * (1 + magic / 20)));
  }
}
