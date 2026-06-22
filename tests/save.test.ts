import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { GameSession } from '../src/core/state/GameSession.ts';
import { SaveRepository, AUTOSAVE_SLOT } from '../src/core/save/SaveRepository.ts';
import { buildSave, checksum, validateSave, SaveValidationError } from '../src/core/save/SaveData.ts';
import { exportToJson, importFromJson } from '../src/core/save/backup.ts';
import { Rng } from '../src/core/rng.ts';

describe('save/load', () => {
  it('round-trips through IndexedDB and restores state', async () => {
    const repo = new SaveRepository();
    const session = GameSession.newGame(new Rng(1));
    session.state.data.gold = 777;
    session.state.data.area = 'cavern';
    const save = buildSave(1, session.state.data, 'test');
    await repo.save(save);

    const loaded = await repo.load(1);
    expect(loaded).not.toBeNull();
    expect(loaded!.payload.gold).toBe(777);
    expect(loaded!.payload.area).toBe('cavern');
    expect(loaded!.payload.monsters.length).toBe(session.state.data.monsters.length);
  });

  it('JSON export and import are identical', () => {
    const session = GameSession.newGame(new Rng(2));
    session.state.data.gold = 555;
    const json = exportToJson(session.state.data);
    const restored = importFromJson(json);
    expect(restored.gold).toBe(555);
    expect(restored.monsters.map((m) => m.uuid)).toEqual(session.state.data.monsters.map((m) => m.uuid));
  });

  it('rejects a corrupted save (checksum mismatch)', () => {
    const session = GameSession.newGame(new Rng(3));
    const save = buildSave(1, session.state.data, 'x');
    save.checksum = 'deadbeef'; // tamper
    expect(() => validateSave(save)).toThrow(SaveValidationError);
  });

  it('recovers from a corrupt main using the backup', async () => {
    const repo = new SaveRepository();
    const session = GameSession.newGame(new Rng(4));
    session.state.data.gold = 10;
    await repo.save(buildSave(2, session.state.data, 'first')); // becomes good main
    session.state.data.gold = 20;
    await repo.save(buildSave(2, session.state.data, 'second')); // prior good moved to backup

    // Corrupt the main record directly.
    const corrupt = buildSave(2, session.state.data, 'broken');
    corrupt.checksum = 'bad';
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('echoes-of-beast', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('saves', 'readwrite');
        tx.objectStore('saves').put(corrupt, 'slot:2:main');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    const loaded = await repo.load(2);
    expect(loaded).not.toBeNull();
    expect(loaded!.payload.gold).toBe(10); // recovered from backup (first save)
  });

  it('checksum is stable for identical payloads', () => {
    const session = GameSession.newGame(new Rng(5));
    expect(checksum(session.state.data)).toBe(checksum(session.state.data));
  });

  it('autosave slot is usable', async () => {
    const repo = new SaveRepository();
    const session = GameSession.newGame(new Rng(6));
    await repo.save(buildSave(AUTOSAVE_SLOT, session.state.data, 'auto'));
    expect(await repo.exists(AUTOSAVE_SLOT)).toBe(true);
  });
});
