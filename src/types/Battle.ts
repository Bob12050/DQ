import type { Monster } from './Monster';

export type Side = 'ally' | 'enemy';

/** Player command verbs. `scout` attempts to recruit a living enemy. */
export type CommandType = 'attack' | 'skill' | 'defend' | 'scout';

/** A chosen command for one acting unit. */
export interface BattleCommand {
  type: CommandType;
  /** Required when type === 'skill'. */
  skillId?: string;
  /** Target unit index within the opposing/own team (resolved by the system). */
  targetIndex?: number;
}

/**
 * A combat participant. Wraps a Monster (a battle-local copy, so the persisted
 * monster is never mutated mid-fight) plus battle-only flags.
 */
export interface BattleUnit {
  monster: Monster;
  side: Side;
  /** Slot index within its own team. */
  index: number;
  alive: boolean;
  /** True for the round if the unit chose to defend. */
  defending: boolean;
  /** True if this enemy left the battle by being scouted (recruited). */
  scouted: boolean;
}

/** A monster recruited via scouting during a battle. */
export interface ScoutedMonster {
  templateId: string;
  level: number;
}

/** Effect of one action on one target (drives the animation/HP updates). */
export interface BattleHit {
  side: Side;
  index: number;
  hpBefore: number;
  hpAfter: number;
  amount: number;
  /** Negative amount = healing. */
  kind: 'damage' | 'heal' | 'miss';
  effectiveness: 'weak' | 'resist' | 'normal';
  dead: boolean;
}

/** One resolved action within a round (an actor acting on targets). */
export interface BattleEvent {
  actorSide: Side;
  actorIndex: number;
  text: string;
  hits: BattleHit[];
}

export type BattleOutcome = 'win' | 'lose' | 'ongoing';

/** Result of resolving a full round. */
export interface RoundResult {
  events: BattleEvent[];
  outcome: BattleOutcome;
}
