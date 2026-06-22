import type { SaveData } from './SaveData.ts';
import { migrate } from './SaveMigrationService.ts';
import { validateSave, SaveValidationError } from './SaveData.ts';

const DB_NAME = 'echoes-of-beast';
const STORE = 'saves';
const DB_VERSION = 1;

/** Autosave uses slot 0; manual slots are 1..3. */
export const AUTOSAVE_SLOT = 0;
export const MANUAL_SLOTS = [1, 2, 3];

export interface SlotInfo {
  slot: number;
  title: string;
  savedAt: number;
  corrupt: boolean;
}

function mainKey(slot: number): string {
  return `slot:${slot}:main`;
}
function backupKey(slot: number): string {
  return `slot:${slot}:backup`;
}

/**
 * IndexedDB-backed save storage. Implements a safe write (previous good save is
 * kept as a backup) and corruption recovery. All game saves live here; only
 * lightweight UI settings use localStorage elsewhere.
 */
export class SaveRepository {
  private dbPromise?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  private async tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
  }

  private getRaw(key: string): Promise<unknown> {
    return this.tx('readonly', (s) => s.get(key));
  }

  /**
   * Saves atomically-as-possible: the prior good main becomes the backup, then
   * the new save is written. (IndexedDB puts are themselves atomic.)
   */
  async save(save: SaveData): Promise<void> {
    const prior = await this.getRaw(mainKey(save.slot));
    if (prior) {
      try {
        validateSave(prior);
        await this.tx('readwrite', (s) => s.put(prior, backupKey(save.slot)));
      } catch {
        // Prior was already corrupt; don't overwrite a possibly-good backup.
      }
    }
    await this.tx('readwrite', (s) => s.put(save, mainKey(save.slot)));
  }

  /**
   * Loads a slot. On corruption, attempts the backup. Returns null if empty.
   * Applies migrations to the payload.
   */
  async load(slot: number): Promise<SaveData | null> {
    const raw = await this.getRaw(mainKey(slot));
    if (raw === undefined) return null;
    let save: SaveData;
    try {
      save = validateSave(raw);
    } catch (err) {
      // Try the backup before giving up.
      const backup = await this.getRaw(backupKey(slot));
      if (backup === undefined) throw err;
      save = validateSave(backup); // throws SaveValidationError if also bad
    }
    save.payload = migrate(save.payload, save.version);
    return save;
  }

  async exists(slot: number): Promise<boolean> {
    return (await this.getRaw(mainKey(slot))) !== undefined;
  }

  async info(slot: number): Promise<SlotInfo | null> {
    const raw = await this.getRaw(mainKey(slot));
    if (raw === undefined) return null;
    try {
      const save = validateSave(raw);
      return { slot, title: save.title, savedAt: save.savedAt, corrupt: false };
    } catch (err) {
      if (err instanceof SaveValidationError) {
        return { slot, title: '（破損データ）', savedAt: 0, corrupt: true };
      }
      throw err;
    }
  }

  async delete(slot: number): Promise<void> {
    await this.tx('readwrite', (s) => s.delete(mainKey(slot)));
    await this.tx('readwrite', (s) => s.delete(backupKey(slot)));
  }
}
