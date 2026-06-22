import type { MonsterDefinition, StatBlock, StatKey } from '../types.ts';
import { STAT_KEYS } from '../types.ts';

/**
 * Single source of truth for the experience curve and stat growth.
 * No other module should hardcode level/exp/growth math.
 */
export const MAX_LEVEL = 50;

/** EXP required to advance FROM `level` to `level + 1`. */
export function expToNext(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(6 * level * level + 10 * level + 12);
}

/** Total cumulative EXP required to BE at `level` (level 1 => 0). */
export function totalExpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += expToNext(l);
  return total;
}

/**
 * Computes a monster's stat block at a given level.
 * stat = round( base * (1 + growth*(level-1)) ) + fusionBonus
 * fusionBonus is a flat additive carried by the instance (capped elsewhere).
 */
export function statsAtLevel(
  def: MonsterDefinition,
  level: number,
  fusionBonus: Partial<StatBlock> = {},
): StatBlock {
  const out = {} as StatBlock;
  for (const key of STAT_KEYS) {
    const base = def.baseStats[key];
    const growth = def.growth[key];
    const scaled = base * (1 + growth * (level - 1));
    out[key] = Math.max(1, Math.round(scaled) + (fusionBonus[key] ?? 0));
  }
  return out;
}

/** Skills a species knows at a given level (innate + learnset up to level). */
export function skillsAtLevel(def: MonsterDefinition, level: number): string[] {
  const set = new Set<string>(def.innateSkills);
  for (const ls of def.learnset) {
    if (ls.level <= level) set.add(ls.skillId);
  }
  return [...set];
}

/** Skills newly learned exactly when reaching `level` (for level-up reports). */
export function skillsLearnedAtLevel(def: MonsterDefinition, level: number): string[] {
  return def.learnset.filter((ls) => ls.level === level).map((ls) => ls.skillId);
}

export interface LevelUpStep {
  newLevel: number;
  statGains: Partial<Record<StatKey, number>>;
  learnedSkills: string[];
}

/**
 * Applies EXP to a monster's current level/exp and returns the new level/exp
 * plus a per-level breakdown. Pure function — does not mutate inputs.
 */
export function applyExp(
  def: MonsterDefinition,
  currentLevel: number,
  currentExp: number,
  gainedExp: number,
  fusionBonus: Partial<StatBlock> = {},
): { level: number; exp: number; steps: LevelUpStep[] } {
  let level = currentLevel;
  let exp = currentExp + Math.max(0, Math.round(gainedExp));
  const steps: LevelUpStep[] = [];

  while (level < MAX_LEVEL && exp >= expToNext(level)) {
    exp -= expToNext(level);
    const before = statsAtLevel(def, level, fusionBonus);
    level += 1;
    const after = statsAtLevel(def, level, fusionBonus);
    const statGains: Partial<Record<StatKey, number>> = {};
    for (const key of STAT_KEYS) statGains[key] = after[key] - before[key];
    steps.push({
      newLevel: level,
      statGains,
      learnedSkills: skillsLearnedAtLevel(def, level),
    });
  }

  if (level >= MAX_LEVEL) exp = 0;
  return { level, exp, steps };
}

/** EXP awarded for defeating a monster of a given level. */
export function expFromDefeat(enemyLevel: number): number {
  return Math.round(8 + enemyLevel * enemyLevel * 1.5);
}
