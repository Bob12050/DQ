import type { GameStateData } from '../state/GameState.ts';
import { buildSave, validateSave, type SaveData } from './SaveData.ts';
import { migrate } from './SaveMigrationService.ts';

/** Serializes a payload to a portable, validated JSON backup string. */
export function exportToJson(payload: GameStateData, slot = 0): string {
  const save = buildSave(slot, payload, 'backup');
  return JSON.stringify(save, null, 2);
}

/** Parses and validates a backup JSON string, returning a migrated payload. */
export function importFromJson(json: string): GameStateData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSONとして読み込めませんでした。');
  }
  const save: SaveData = validateSave(parsed);
  return migrate(save.payload, save.version);
}
