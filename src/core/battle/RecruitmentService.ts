import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { BattleState } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import { RANK_ORDER } from '../types.ts';

export interface RecruitChance {
  /** Exact probability 0..1 (only shown in dev mode). */
  chance: number;
  /** Coarse player-facing label. */
  label: string;
  /** Whether the target can be recruited at all. */
  possible: boolean;
  contributions: { unitId: string; value: number }[];
}

const RANK_PENALTY: Record<string, number> = {
  common: 0,
  uncommon: 0.03,
  rare: 0.08,
  epic: 0.14,
  boss: 1,
};

/**
 * Computes whole-party "resonance" recruitment chance against one enemy.
 * Internal math is exact; UI shows only a coarse band. See DESIGN.md.
 */
export class RecruitmentService {
  constructor(private reg: DataRegistry, private areaBonus = 0) {}

  contribution(unit: BattleUnit): number {
    if (!unit.isAlive) return 0;
    const levelFactor = unit.level * 0.6;
    const attackFactor = unit.effectiveStat(this.reg, 'attack') * 0.15;
    const magicFactor = unit.effectiveStat(this.reg, 'magic') * 0.15;
    const hpRatio = unit.hp / unit.maxHp;
    const conditionFactor = hpRatio * 6 - (unit.statuses.some((s) => this.reg.statusEffect(s.id).kind === 'ailment') ? 3 : 0);
    const affinityFactor = 2;
    return Math.max(0, levelFactor + attackFactor + magicFactor + affinityFactor + conditionFactor);
  }

  evaluate(state: BattleState, target: BattleUnit, itemBonus: number): RecruitChance {
    const contributions = state.player.units.map((u) => ({ unitId: u.id, value: this.contribution(u) }));
    const teamPower = contributions.reduce((s, c) => s + c.value, 0);

    if (!target.def.recruitable) {
      return { chance: 0, label: '反応がない', possible: false, contributions };
    }

    const targetHpRatio = target.hp / target.maxHp;
    const targetResist = target.level * 2.5 + (RANK_ORDER.indexOf(target.def.rank) + 1) * 8 + target.maxHp * 0.05;
    const contributionScore = (teamPower / (teamPower + targetResist)) * 0.4;

    let chance = target.def.baseRecruitRate;
    chance += (1 - targetHpRatio) * 0.45;
    chance += contributionScore;
    chance += itemBonus + this.areaBonus;
    chance -= RANK_PENALTY[target.def.rank] ?? 0;
    chance -= target.wariness * 0.15;

    chance = Math.max(0, Math.min(0.95, chance));
    return { chance, label: this.label(chance), possible: true, contributions };
  }

  private label(chance: number): string {
    if (chance < 0.1) return '反応がない';
    if (chance < 0.25) return 'かすかに反応している';
    if (chance < 0.45) return '共鳴が生まれている';
    if (chance < 0.7) return '強く共鳴している';
    return '非常に強く共鳴している';
  }
}
