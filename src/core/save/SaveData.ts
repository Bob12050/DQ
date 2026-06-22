import type { GameStateData } from '../state/GameState.ts';

/** Bump when the payload shape changes; add a migration step accordingly. */
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  slot: number;
  savedAt: number;
  /** Human-readable summary for the slot list. */
  title: string;
  payload: GameStateData;
  /** Integrity checksum over the payload (detects corruption/partial writes). */
  checksum: string;
}

/** djb2 string hash, hex. Cheap integrity check (not cryptographic). */
export function checksum(payload: unknown): string {
  const str = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export function buildSave(slot: number, payload: GameStateData, title: string): SaveData {
  return {
    version: SAVE_VERSION,
    slot,
    savedAt: Date.now(),
    title,
    payload,
    checksum: checksum(payload),
  };
}

export class SaveValidationError extends Error {}

/** Structural validation of a loaded save before it is trusted. */
export function validateSave(data: unknown): SaveData {
  if (typeof data !== 'object' || data === null) {
    throw new SaveValidationError('セーブデータが空か壊れています。');
  }
  const d = data as Partial<SaveData>;
  if (typeof d.version !== 'number') throw new SaveValidationError('バージョン情報がありません。');
  if (typeof d.checksum !== 'string') throw new SaveValidationError('チェックサムがありません。');
  if (typeof d.payload !== 'object' || d.payload === null) {
    throw new SaveValidationError('本体データがありません。');
  }
  if (checksum(d.payload) !== d.checksum) {
    throw new SaveValidationError('チェックサムが一致しません（破損の可能性）。');
  }
  const p = d.payload as Partial<GameStateData>;
  if (!Array.isArray(p.monsters) || !Array.isArray(p.partyUuids)) {
    throw new SaveValidationError('モンスターデータが不正です。');
  }
  if (p.monsters.length === 0) throw new SaveValidationError('モンスターが一体もいません。');
  return d as SaveData;
}
