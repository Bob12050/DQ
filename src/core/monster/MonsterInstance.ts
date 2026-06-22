import type { MonsterDefinition, StatBlock, TacticsId } from '../types.ts';
import type { DataRegistry } from '../registry/DataRegistry.ts';
import { skillsAtLevel, statsAtLevel } from './leveling.ts';
import { Rng } from '../rng.ts';

/** Lineage entry recorded on fusion. */
export interface LineageEntry {
  speciesId: string;
  uuid: string;
  nickname: string;
}

/**
 * A player-owned monster. Distinct from MonsterDefinition (the species/master
 * data). Battle never mutates this directly — see BattleUnit snapshots.
 */
export interface MonsterInstance {
  uuid: string;
  speciesId: string;
  nickname: string;
  level: number;
  exp: number;
  /** Current HP/MP (persisted so wounds carry over outside battle). */
  currentHp: number;
  currentMp: number;
  /** Learned skills (innate + leveled + inherited). */
  skills: string[];
  tactics: TacticsId;
  /** Flat additive stat bonus from fusion, capped. */
  fusionBonus: Partial<StatBlock>;
  /** Number of times this lineage has been fused. */
  fusionCount: number;
  /** Generation number (1 = wild/starter). */
  generation: number;
  /** Direct parents recorded at fusion. */
  parents: LineageEntry[];
  /** Monotonic acquisition order / creation timestamp. */
  acquiredAt: number;
}

let acquireCounter = 0;

function makeUuid(rng?: Rng): string {
  // Deterministic-friendly id: if an Rng is supplied (tests), use it.
  const rand = rng ? rng.int(0, 0xffffffff) : Math.floor(Date.now() % 0xffffffff);
  acquireCounter += 1;
  return `m_${rand.toString(36)}_${acquireCounter.toString(36)}`;
}

export interface CreateInstanceOptions {
  nickname?: string;
  skills?: string[];
  tactics?: TacticsId;
  fusionBonus?: Partial<StatBlock>;
  fusionCount?: number;
  generation?: number;
  parents?: LineageEntry[];
  acquiredAt?: number;
  rng?: Rng;
}

/** Creates a fresh instance at a given level, HP/MP fully restored. */
export function createInstance(
  def: MonsterDefinition,
  level: number,
  opts: CreateInstanceOptions = {},
): MonsterInstance {
  const stats = statsAtLevel(def, level, opts.fusionBonus ?? {});
  return {
    uuid: makeUuid(opts.rng),
    speciesId: def.id,
    nickname: opts.nickname ?? def.name,
    level,
    exp: 0,
    currentHp: stats.hp,
    currentMp: stats.mp,
    skills: opts.skills ?? skillsAtLevel(def, level),
    tactics: opts.tactics ?? 'manualOrders',
    fusionBonus: opts.fusionBonus ?? {},
    fusionCount: opts.fusionCount ?? 0,
    generation: opts.generation ?? 1,
    parents: opts.parents ?? [],
    acquiredAt: opts.acquiredAt ?? Date.now() + acquireCounter,
  } as MonsterInstance;
}

/** Computes the live (max) stat block for an instance via the registry. */
export function instanceStats(reg: DataRegistry, inst: MonsterInstance): StatBlock {
  return statsAtLevel(reg.monster(inst.speciesId), inst.level, inst.fusionBonus);
}

/** Clamps currentHp/currentMp into valid range against computed max stats. */
export function clampVitals(reg: DataRegistry, inst: MonsterInstance): void {
  const stats = instanceStats(reg, inst);
  inst.currentHp = Math.max(0, Math.min(inst.currentHp, stats.hp));
  inst.currentMp = Math.max(0, Math.min(inst.currentMp, stats.mp));
}
