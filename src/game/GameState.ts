import type { Monster } from '../types/Monster';
import { STARTER_TEMPLATE_IDS } from '../data/monsters';
import { createMonster, monsterPower } from '../systems/ProgressionSystem';

const SAVE_KEY = 'monster-nexus-save';
const SAVE_VERSION = 1;

/** All persisted player progress. */
export interface PlayerData {
  version: number;
  name: string;
  rank: number;
  coins: number;
  /** Owned monster instances. */
  monsters: Monster[];
  /** Up to 4 monster ids forming the battle team. */
  teamIds: string[];
  /** Stage ids the player has cleared. */
  clearedStageIds: string[];
}

/**
 * Single source of truth for run-time progress, shared across scenes.
 * Persists to localStorage (simple MVP save). Extension point for cloud saves.
 */
class GameStateManager {
  private _data: PlayerData = this.createNewData();

  get data(): PlayerData {
    return this._data;
  }

  /** Loads from localStorage, or starts a new game if absent/corrupt. */
  load(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        this.newGame();
        return;
      }
      const parsed = JSON.parse(raw) as PlayerData;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.monsters)) {
        this.newGame();
        return;
      }
      // Future migrations would go here based on parsed.version.
      this._data = { ...this.createNewData(), ...parsed, version: SAVE_VERSION };
    } catch {
      this.newGame();
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this._data));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }

  newGame(): void {
    this._data = this.createNewData();
    this.save();
  }

  private createNewData(): PlayerData {
    const monsters = STARTER_TEMPLATE_IDS.map((id) => createMonster(id, 3));
    return {
      version: SAVE_VERSION,
      name: '調律師',
      rank: 1,
      coins: 100,
      monsters,
      teamIds: monsters.slice(0, 4).map((m) => m.id),
      clearedStageIds: [],
    };
  }

  // --- Helpers -------------------------------------------------------------

  monster(id: string): Monster | undefined {
    return this._data.monsters.find((m) => m.id === id);
  }

  /** Resolved team monsters, in slot order (length 0..4). */
  team(): Monster[] {
    return this._data.teamIds
      .map((id) => this.monster(id))
      .filter((m): m is Monster => m !== undefined);
  }

  setTeam(ids: string[]): void {
    this._data.teamIds = ids.slice(0, 4);
    this.save();
  }

  /** Toggles a monster in/out of the team (max 4, no duplicates). */
  toggleTeam(id: string): void {
    const ids = this._data.teamIds;
    const at = ids.indexOf(id);
    if (at >= 0) {
      ids.splice(at, 1);
    } else if (ids.length < 4) {
      ids.push(id);
    }
    this.save();
  }

  isCleared(stageId: string): boolean {
    return this._data.clearedStageIds.includes(stageId);
  }

  markCleared(stageId: string): void {
    if (!this.isCleared(stageId)) {
      this._data.clearedStageIds.push(stageId);
      this._data.rank += 1;
    }
  }

  addCoins(n: number): void {
    this._data.coins += n;
  }

  addMonster(m: Monster): void {
    this._data.monsters.push(m);
  }

  teamPower(): number {
    return this.team().reduce((sum, m) => sum + monsterPower(m), 0);
  }
}

/** Shared singleton. */
export const GameState = new GameStateManager();
