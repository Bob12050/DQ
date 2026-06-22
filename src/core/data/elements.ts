import type { Element } from '../types.ts';

/**
 * Element affinity multipliers: ATTACK_AFFINITY[attacker][defender].
 * 1.0 = neutral, >1 = strong vs defender, <1 = resisted.
 * These are the *attack-side* base multipliers; a defender's own
 * `elementResist` is applied on top of this in DamageCalculator.
 *
 * Original cycle: fire>wind>earth>water>fire ; light<->shadow oppose.
 */
const A = 1.25; // advantage
const D = 0.8; // disadvantage
const N = 1.0;

export const ATTACK_AFFINITY: Record<Element, Record<Element, number>> = {
  neutral: { neutral: N, fire: N, water: N, wind: N, earth: N, light: N, shadow: N },
  fire: { neutral: N, fire: D, water: D, wind: A, earth: N, light: N, shadow: N },
  water: { neutral: N, fire: A, water: D, wind: N, earth: N, light: N, shadow: N },
  wind: { neutral: N, fire: N, water: N, wind: D, earth: A, light: N, shadow: N },
  earth: { neutral: N, fire: N, water: A, wind: D, earth: D, light: N, shadow: N },
  light: { neutral: N, fire: N, water: N, wind: N, earth: N, light: D, shadow: A },
  shadow: { neutral: N, fire: N, water: N, wind: N, earth: N, light: A, shadow: D },
};

/** Coarse label for UI (never shows exact multipliers). */
export function affinityLabel(multiplier: number): string {
  if (multiplier <= 0) return '無効';
  if (multiplier < 0.85) return '耐性';
  if (multiplier < 1.1) return '通常';
  if (multiplier < 1.4) return '弱点';
  return '大弱点';
}
