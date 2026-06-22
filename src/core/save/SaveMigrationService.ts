import type { GameStateData } from '../state/GameState.ts';
import { SAVE_VERSION } from './SaveData.ts';

type Migration = (payload: GameStateData) => GameStateData;

/**
 * Sequential save migrations. To evolve the save format, bump SAVE_VERSION and
 * add a migration keyed by the version it upgrades FROM.
 */
const MIGRATIONS: Record<number, Migration> = {
  // 0: (payload) => ({ ...payload, newField: defaultValue }),
};

/** Upgrades a payload from `fromVersion` to the current SAVE_VERSION. */
export function migrate(payload: GameStateData, fromVersion: number): GameStateData {
  let current = payload;
  let v = fromVersion;
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) {
      // No migration available — newer fields will fall back to defaults.
      break;
    }
    current = step(current);
    v += 1;
  }
  return current;
}
