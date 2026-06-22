import type { Element, Monster } from '../types/Monster';
import type { Skill } from '../types/Skill';

/** Random source in [0,1). Injectable for deterministic tests. */
export type Rng = () => number;

/** Element advantage chart: KEY beats VALUE (1.5x). Reverse is 0.75x. */
const BEATS: Record<Element, Element | null> = {
  fire: 'grass',
  grass: 'water',
  water: 'fire',
  light: 'dark',
  dark: 'light',
  neutral: null,
};

export type Effectiveness = 'weak' | 'resist' | 'normal';

/**
 * Pure damage/heal math. No Phaser dependency. The element chart and formulas
 * are the documented battle spec (see README).
 */
export class DamageCalculator {
  constructor(private rng: Rng = Math.random) {}

  /** Element multiplier of an attack of `attackEl` against `defendEl`. */
  elementMultiplier(attackEl: Element, defendEl: Element): number {
    if (attackEl === 'neutral' || defendEl === 'neutral') return 1;
    if (BEATS[attackEl] === defendEl) return 1.5; // target is weak
    if (BEATS[defendEl] === attackEl) return 0.75; // attacker is resisted
    return 1;
  }

  static effectivenessOf(mult: number): Effectiveness {
    if (mult > 1) return 'weak';
    if (mult < 1) return 'resist';
    return 'normal';
  }

  private variance(): number {
    // 0.85 .. 1.15
    return 0.85 + this.rng() * 0.3;
  }

  /** Normal attack damage: uses attacker.attack vs defender.defense. */
  attackDamage(attacker: Monster, defender: Monster, defending: boolean): { amount: number; mult: number } {
    const mult = this.elementMultiplier(attacker.element, defender.element);
    let base = attacker.attack - defender.defense / 2;
    base = base * this.variance() * mult;
    if (defending) base *= 0.5;
    return { amount: Math.max(1, Math.round(base)), mult };
  }

  /** Skill damage: uses skill power + attacker.magic vs defender.defense. */
  skillDamage(attacker: Monster, defender: Monster, skill: Skill, defending: boolean): { amount: number; mult: number } {
    const mult = this.elementMultiplier(skill.element, defender.element);
    let base = skill.skillPower + attacker.magic - defender.defense / 2;
    base = base * this.variance() * mult;
    if (defending) base *= 0.5;
    return { amount: Math.max(1, Math.round(base)), mult };
  }

  /** Heal amount from a heal skill. */
  healAmount(healer: Monster, skill: Skill): number {
    return Math.max(1, Math.round(skill.skillPower + healer.magic * 0.6));
  }
}
