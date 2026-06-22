import type { BattleUnit } from '../types/Battle';
import type { Rng } from './DamageCalculator';

/**
 * Determines action order for a round. All living units (both sides) are
 * ordered by speed descending; ties broken randomly (seedable for tests).
 */
export class TurnOrderSystem {
  constructor(private rng: Rng = Math.random) {}

  order(units: BattleUnit[]): BattleUnit[] {
    return units
      .filter((u) => u.alive)
      .map((u) => ({ u, tie: this.rng() }))
      .sort((a, b) => {
        const sd = b.u.monster.speed - a.u.monster.speed;
        if (sd !== 0) return sd;
        return b.tie - a.tie;
      })
      .map((x) => x.u);
  }
}
