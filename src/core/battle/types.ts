import type { Element, StatKey, StatusEffectId, TacticsId } from '../types.ts';

export type Side = 'player' | 'enemy';

export interface ActiveStatus {
  id: StatusEffectId;
  remaining: number;
}

/** A timed multiplicative stat modifier (from skills/items/traits). */
export interface TimedModifier {
  id: string;
  stats: Partial<Record<StatKey, number>>;
  remaining: number;
}

export type ActionType =
  | 'attack'
  | 'skill'
  | 'guard'
  | 'item'
  | 'wait'
  | 'resonate' // team-wide recruit
  | 'flee'; // team-wide flee

/** A fully-specified action queued for resolution. */
export interface BattleAction {
  actorId: string;
  actionType: ActionType;
  skillId?: string;
  itemId?: string;
  targetIds: string[];
  priority: number;
  speedSnapshot: number;
  randomTieBreaker: number;
  /** Where the command came from: manual player input or an AI policy. */
  commandSource: 'manual' | 'tactics' | 'enemyAI';
  /** The original target rule, so the resolver can re-pick if targets die. */
  originalTargetRule?: string;
}

/** A pending player/AI command before queue ordering (no snapshot yet). */
export interface BattleCommand {
  actorId: string;
  actionType: ActionType;
  skillId?: string;
  itemId?: string;
  targetIds: string[];
  commandSource: 'manual' | 'tactics' | 'enemyAI';
}

export const BATTLE_STATES = [
  'BATTLE_START',
  'TURN_START',
  'PLAYER_COMMAND_SELECTION',
  'ENEMY_COMMAND_SELECTION',
  'ACTION_QUEUE_BUILD',
  'ACTION_RESOLUTION',
  'END_OF_TURN_EFFECTS',
  'VICTORY_OR_DEFEAT_CHECK',
  'TURN_END',
  'BATTLE_RESULT',
  'BATTLE_END',
] as const;

export type BattleStateId = (typeof BATTLE_STATES)[number];

export type BattleOutcome = 'ongoing' | 'victory' | 'defeat' | 'fled' | 'recruited_all';

/** A single log entry produced by resolution (consumed by the animation queue/UI). */
export interface BattleLogEntry {
  text: string;
  kind: 'info' | 'damage' | 'heal' | 'status' | 'faint' | 'recruit' | 'system';
  actorId?: string;
  targetId?: string;
  amount?: number;
  element?: Element;
  critical?: boolean;
}

/** Outcome record for a single recruited enemy. */
export interface RecruitOutcome {
  enemyUnitId: string;
  speciesId: string;
  level: number;
}

export interface BattleResult {
  outcome: BattleOutcome;
  expPerSurvivor: number;
  /** Per player unit (by source uuid) exp/level reporting. */
  expAwards: { uuid: string; gained: number }[];
  recruited: RecruitOutcome[];
  itemDrops: { itemId: string; count: number }[];
  log: BattleLogEntry[];
}

export interface TacticsRef {
  tactics: TacticsId;
}
