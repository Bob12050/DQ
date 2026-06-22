import type { BattleUnit } from './BattleUnit.ts';
import type { BattleLogEntry, BattleOutcome, BattleStateId, Side } from './types.ts';
import { Rng } from '../rng.ts';

/** One side's team of up to 4 units. The same class is used for player & enemy. */
export class BattleTeam {
  constructor(
    readonly side: Side,
    readonly units: BattleUnit[],
  ) {}

  livingUnits(): BattleUnit[] {
    return this.units.filter((u) => u.isAlive);
  }

  isWiped(): boolean {
    return this.livingUnits().length === 0;
  }
}

/** Mutable container for an in-progress battle. */
export class BattleState {
  turn = 0;
  state: BattleStateId = 'BATTLE_START';
  outcome: BattleOutcome = 'ongoing';
  readonly log: BattleLogEntry[] = [];
  /** Cap on retained log entries (perf on long boss fights). */
  maxLog = 200;
  /** Items consumed during battle (id -> count), written back afterwards. */
  readonly itemsConsumed: Record<string, number> = {};
  /** Pending recruit-rate bonus from used items, applied on next resonance. */
  recruitItemBonus = 0;

  constructor(
    readonly player: BattleTeam,
    readonly enemy: BattleTeam,
    readonly rng: Rng,
    readonly isBoss: boolean,
    readonly noFlee: boolean,
  ) {}

  allUnits(): BattleUnit[] {
    return [...this.player.units, ...this.enemy.units];
  }

  unit(id: string): BattleUnit {
    const u = this.allUnits().find((x) => x.id === id);
    if (!u) throw new Error(`Unknown battle unit id: ${id}`);
    return u;
  }

  teamOf(unit: BattleUnit): BattleTeam {
    return unit.side === 'player' ? this.player : this.enemy;
  }

  enemyTeamOf(unit: BattleUnit): BattleTeam {
    return unit.side === 'player' ? this.enemy : this.player;
  }

  pushLog(entry: BattleLogEntry): void {
    this.log.push(entry);
    if (this.log.length > this.maxLog) this.log.splice(0, this.log.length - this.maxLog);
  }

  info(text: string): void {
    this.pushLog({ text, kind: 'info' });
  }
}
