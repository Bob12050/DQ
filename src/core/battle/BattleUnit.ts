import type {
  Element,
  MonsterDefinition,
  StatBlock,
  StatKey,
  StatusEffectId,
  TacticsId,
  TraitId,
} from '../types.ts';
import type { DataRegistry } from '../registry/DataRegistry.ts';
import type { MonsterInstance } from '../monster/MonsterInstance.ts';
import { instanceStats } from '../monster/MonsterInstance.ts';
import { statsAtLevel } from '../monster/leveling.ts';
import type { ActiveStatus, Side, TimedModifier } from './types.ts';

/**
 * Battle-time representation of a combatant. Holds a *snapshot* of the source
 * MonsterInstance so battle math never mutates persisted save data. After
 * battle, results are written back through BattleResult.
 */
export class BattleUnit {
  readonly id: string;
  readonly side: Side;
  readonly slot: number;
  readonly def: MonsterDefinition;
  readonly name: string;
  readonly level: number;
  /** Source player instance uuid (player side only). */
  readonly sourceUuid?: string;

  readonly baseStats: StatBlock;
  maxHp: number;
  maxMp: number;
  hp: number;
  mp: number;

  readonly skills: string[];
  readonly traits: TraitId[];
  readonly element: Element;
  tactics: TacticsId;

  statuses: ActiveStatus[] = [];
  modifiers: TimedModifier[] = [];
  guarding = false;
  /** Recruitment wariness rises with failed resonance attempts. */
  wariness = 0;
  /** Extra actions already taken this turn (capped). */
  extraActionsThisTurn = 0;
  /** Whether the unit left the field via recruitment. */
  recruited = false;

  constructor(params: {
    id: string;
    side: Side;
    slot: number;
    def: MonsterDefinition;
    name: string;
    level: number;
    stats: StatBlock;
    hp: number;
    mp: number;
    skills: string[];
    tactics: TacticsId;
    sourceUuid?: string;
  }) {
    this.id = params.id;
    this.side = params.side;
    this.slot = params.slot;
    this.def = params.def;
    this.name = params.name;
    this.level = params.level;
    this.baseStats = params.stats;
    this.maxHp = params.stats.hp;
    this.maxMp = params.stats.mp;
    this.hp = Math.min(params.hp, this.maxHp);
    this.mp = Math.min(params.mp, this.maxMp);
    this.skills = params.skills;
    this.traits = params.def.traits;
    this.element = params.def.element;
    this.tactics = params.tactics;
    this.sourceUuid = params.sourceUuid;
  }

  get isAlive(): boolean {
    return this.hp > 0 && !this.recruited;
  }

  /** Can this unit take an action right now? */
  get canAct(): boolean {
    if (!this.isAlive) return false;
    for (const st of this.statuses) {
      // preventsAction looked up by caller via registry; cached here for speed.
      if (st.id === 'sleep' || st.id === 'stun') return false;
    }
    return true;
  }

  hasStatus(id: StatusEffectId): boolean {
    return this.statuses.some((s) => s.id === id);
  }

  /** Effective value of a stat after status & timed modifiers (and guard for defense). */
  effectiveStat(reg: DataRegistry, key: StatKey): number {
    let value = this.baseStats[key];
    for (const st of this.statuses) {
      const def = reg.statusEffect(st.id);
      const mult = def.statMultipliers?.[key];
      if (mult !== undefined) value *= mult;
    }
    for (const mod of this.modifiers) {
      const mult = mod.stats[key];
      if (mult !== undefined) value *= mult;
    }
    return Math.max(1, Math.round(value));
  }
}

/** Builds a BattleUnit from a player-owned MonsterInstance. */
export function unitFromInstance(
  reg: DataRegistry,
  inst: MonsterInstance,
  id: string,
  slot: number,
): BattleUnit {
  const def = reg.monster(inst.speciesId);
  const stats = instanceStats(reg, inst);
  return new BattleUnit({
    id,
    side: 'player',
    slot,
    def,
    name: inst.nickname,
    level: inst.level,
    stats,
    hp: inst.currentHp,
    mp: inst.currentMp,
    skills: [...inst.skills],
    tactics: inst.tactics,
    sourceUuid: inst.uuid,
  });
}

/** Builds an enemy BattleUnit from species + level. */
export function unitFromEnemy(
  reg: DataRegistry,
  speciesId: string,
  level: number,
  id: string,
  slot: number,
  tactics: TacticsId = 'evenTide',
): BattleUnit {
  const def = reg.monster(speciesId);
  const stats = statsAtLevel(def, level);
  const skills = new Set<string>(def.innateSkills);
  for (const ls of def.learnset) if (ls.level <= level) skills.add(ls.skillId);
  return new BattleUnit({
    id,
    side: 'enemy',
    slot,
    def,
    name: def.name,
    level,
    stats,
    hp: stats.hp,
    mp: stats.mp,
    skills: [...skills],
    tactics,
  });
}
