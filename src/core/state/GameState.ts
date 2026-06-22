import type { MonsterInstance } from '../monster/MonsterInstance.ts';

export const PARTY_MAX = 4;
export const STORAGE_MAX = 50;

export interface FusionHistoryEntry {
  childUuid: string;
  childSpeciesId: string;
  parentSpeciesIds: [string, string];
  at: number;
}

export type AreaId = 'town' | 'meadow' | 'cavern' | 'bossroom';

/** Serializable snapshot of all progress. Mirrors SaveData.payload. */
export interface GameStateData {
  area: AreaId;
  /** Story progress flags. */
  flags: Record<string, boolean>;
  bossesDefeated: string[];
  /** All owned monsters (party members included). */
  monsters: MonsterInstance[];
  /** Ordered party member uuids (length 1..4). */
  partyUuids: string[];
  /** Item id -> count. */
  inventory: Record<string, number>;
  gold: number;
  fusionHistory: FusionHistoryEntry[];
  /** Total playtime in seconds. */
  playtimeSeconds: number;
}

export function createNewGameData(starters: MonsterInstance[]): GameStateData {
  return {
    area: 'town',
    flags: {},
    bossesDefeated: [],
    monsters: [...starters],
    partyUuids: starters.slice(0, PARTY_MAX).map((m) => m.uuid),
    inventory: { herbSalve: 3, springVial: 2, clearLeaf: 1, resonantBell: 1 },
    gold: 100,
    fusionHistory: [],
    playtimeSeconds: 0,
  };
}

/** Thin OO wrapper over GameStateData with lookup helpers. */
export class GameState {
  constructor(public data: GameStateData) {}

  monster(uuid: string): MonsterInstance | undefined {
    return this.data.monsters.find((m) => m.uuid === uuid);
  }

  party(): MonsterInstance[] {
    return this.data.partyUuids
      .map((uuid) => this.monster(uuid))
      .filter((m): m is MonsterInstance => m !== undefined);
  }

  storage(): MonsterInstance[] {
    const inParty = new Set(this.data.partyUuids);
    return this.data.monsters.filter((m) => !inParty.has(m.uuid));
  }

  isAtCapacity(): boolean {
    return this.data.monsters.length >= STORAGE_MAX;
  }
}
