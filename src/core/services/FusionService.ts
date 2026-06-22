import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { MonsterDefinition, StatBlock, StatKey } from '../types.ts';
import { RANK_ORDER, STAT_KEYS } from '../types.ts';
import type { MonsterInstance, LineageEntry } from '../monster/MonsterInstance.ts';
import { createInstance } from '../monster/MonsterInstance.ts';
import { skillsAtLevel } from '../monster/leveling.ts';
import type { Rng } from '../rng.ts';

export const MAX_INHERITED_SKILLS = 2;
/** Per-stat cap on accumulated fusion bonus (prevents runaway stacking). */
export const FUSION_BONUS_CAP = 12;

export interface FusionPreview {
  resultSpeciesId: string;
  fixedRecipe: boolean;
  /** Species-fixed skills the child always keeps. */
  innateSkills: string[];
  /** Parent skills available to inherit (excludes the child's innate). */
  inheritableSkills: string[];
  maxInherit: number;
  fusionBonus: Partial<StatBlock>;
  generation: number;
  fusionCount: number;
}

/** Computes fusion results: fixed recipes first, family/rank fallback otherwise. */
export class FusionService {
  constructor(private reg: DataRegistry) {}

  /** Looks up a fixed recipe for an unordered parent pair. */
  private findRecipe(aId: string, bId: string): string | null {
    for (const r of this.reg.fusionRecipes) {
      const [p, q] = r.parents;
      if ((p === aId && q === bId) || (p === bId && q === aId)) return r.resultMonsterId;
    }
    return null;
  }

  private rankIndex(def: MonsterDefinition): number {
    return RANK_ORDER.indexOf(def.rank);
  }

  private statTotal(stats: StatBlock): number {
    return STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  }

  /** Family/rank fallback when no fixed recipe exists. */
  private fallbackSpecies(a: MonsterDefinition, b: MonsterDefinition): string {
    // Child family = family of the higher-base-total parent (tie -> a).
    const family = this.statTotal(a.baseStats) >= this.statTotal(b.baseStats) ? a.family : b.family;
    // Target rank = one above the stronger parent, capped at 'epic' (never 'boss').
    const maxRank = Math.max(this.rankIndex(a), this.rankIndex(b));
    const epicIndex = RANK_ORDER.indexOf('epic');
    const targetRank = Math.min(maxRank + 1, epicIndex);

    const byFamily = this.reg
      .allMonsters()
      .filter((m) => m.family === family && m.rank !== 'boss' && m.recruitable);

    const sameRank = byFamily.filter((m) => this.rankIndex(m) === targetRank);
    const pool = sameRank.length
      ? sameRank
      : byFamily.filter((m) => this.rankIndex(m) >= targetRank);
    const finalPool = pool.length ? pool : byFamily;
    // Deterministic: pick by id so tests are stable.
    finalPool.sort((m, n) => m.id.localeCompare(n.id));
    return (finalPool[0] ?? a).id;
  }

  /** Computes the fusion bonus carried to the child, capped per stat. */
  private computeBonus(a: MonsterInstance, b: MonsterInstance): Partial<StatBlock> {
    const bonus: Partial<StatBlock> = {};
    const levelComponent = Math.floor((a.level + b.level) / 20); // +1 per 20 combined levels
    for (const key of STAT_KEYS) {
      const parentCarry = ((a.fusionBonus[key] ?? 0) + (b.fusionBonus[key] ?? 0)) / 2;
      const raw = Math.round(parentCarry + levelComponent + 1);
      bonus[key as StatKey] = Math.min(FUSION_BONUS_CAP, Math.max(0, raw));
    }
    return bonus;
  }

  preview(a: MonsterInstance, b: MonsterInstance): FusionPreview {
    if (a.uuid === b.uuid) throw new Error('Cannot fuse a monster with itself.');
    const defA = this.reg.monster(a.speciesId);
    const defB = this.reg.monster(b.speciesId);

    const recipe = this.findRecipe(a.speciesId, b.speciesId);
    const resultSpeciesId = recipe ?? this.fallbackSpecies(defA, defB);
    const childDef = this.reg.monster(resultSpeciesId);

    const innate = skillsAtLevel(childDef, 1);
    const parentSkills = new Set<string>([...a.skills, ...b.skills]);
    const inheritable = [...parentSkills].filter((s) => !innate.includes(s));

    return {
      resultSpeciesId,
      fixedRecipe: recipe !== null,
      innateSkills: innate,
      inheritableSkills: inheritable,
      maxInherit: MAX_INHERITED_SKILLS,
      fusionBonus: this.computeBonus(a, b),
      generation: Math.max(a.generation, b.generation) + 1,
      fusionCount: Math.max(a.fusionCount, b.fusionCount) + 1,
    };
  }

  /**
   * Produces the child instance. `chosenSkills` must be a subset of the
   * preview's inheritableSkills with length <= maxInherit. Does NOT remove the
   * parents from the player's collection — the caller (GameState) does that
   * atomically after final confirmation.
   */
  execute(
    a: MonsterInstance,
    b: MonsterInstance,
    chosenSkills: string[],
    rng?: Rng,
  ): MonsterInstance {
    const preview = this.preview(a, b);
    const valid = chosenSkills.filter((s) => preview.inheritableSkills.includes(s));
    if (valid.length > preview.maxInherit) {
      throw new Error(`Too many inherited skills (max ${preview.maxInherit}).`);
    }
    const skills = [...new Set([...preview.innateSkills, ...valid])];
    const parents: LineageEntry[] = [a, b].map((p) => ({
      speciesId: p.speciesId,
      uuid: p.uuid,
      nickname: p.nickname,
    }));

    const childDef = this.reg.monster(preview.resultSpeciesId);
    return createInstance(childDef, 1, {
      skills,
      fusionBonus: preview.fusionBonus,
      fusionCount: preview.fusionCount,
      generation: preview.generation,
      parents,
      rng,
    });
  }
}
