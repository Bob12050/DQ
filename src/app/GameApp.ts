import { GameSession } from '../core/state/GameSession.ts';
import { registry } from '../core/registry/DataRegistry.ts';
import { validateData } from '../core/registry/validation.ts';
import { SaveRepository, AUTOSAVE_SLOT } from '../core/save/SaveRepository.ts';
import { buildSave } from '../core/save/SaveData.ts';
import type { SlotInfo } from '../core/save/SaveRepository.ts';
import { AudioService } from '../audio/AudioService.ts';
import { PwaUpdateService } from '../pwa/PwaUpdateService.ts';
import { loadSettings, saveSettings, type GameSettings } from './Settings.ts';
import { Rng } from '../core/rng.ts';

/** Reason for an autosave; used to build a readable slot title. */
export type AutosaveReason =
  | 'battle'
  | 'recruit'
  | 'fusion'
  | 'party'
  | 'shop'
  | 'area'
  | 'boss'
  | 'background';

/**
 * Process-wide singleton holding game-wide services and the active session.
 * Phaser scenes read this instead of threading dependencies through constructors.
 */
export class GameApp {
  readonly registry = registry;
  readonly save = new SaveRepository();
  readonly settings: GameSettings = loadSettings();
  readonly audio = new AudioService(this.settings);
  readonly pwa = new PwaUpdateService();
  session: GameSession | null = null;
  playtimeStart = 0;

  /** Validates master data; throws with a readable message if broken. */
  validate(): void {
    const result = validateData(registry);
    if (!result.ok) {
      throw new Error('マスターデータ検証エラー:\n' + result.errors.join('\n'));
    }
    if (result.warnings.length) console.warn('Data warnings:', result.warnings);
  }

  newGame(): GameSession {
    this.session = GameSession.newGame(new Rng());
    this.playtimeStart = Date.now();
    return this.session;
  }

  persistSettings(): void {
    saveSettings(this.settings);
  }

  /** Accrues playtime into the session before saving. */
  private flushPlaytime(): void {
    if (!this.session) return;
    const now = Date.now();
    if (this.playtimeStart) {
      this.session.state.data.playtimeSeconds += Math.floor((now - this.playtimeStart) / 1000);
    }
    this.playtimeStart = now;
  }

  private titleFor(reason: AutosaveReason): string {
    const s = this.session!;
    const lead = s.state.party()[0];
    const who = lead ? `${lead.nickname} Lv${lead.level}` : 'パーティ';
    return `${who} / ${s.state.data.area} (${reason})`;
  }

  async saveToSlot(slot: number, reason: AutosaveReason = 'background'): Promise<void> {
    if (!this.session) return;
    this.flushPlaytime();
    const save = buildSave(slot, this.session.state.data, this.titleFor(reason));
    await this.save.save(save);
  }

  async autosave(reason: AutosaveReason): Promise<void> {
    await this.saveToSlot(AUTOSAVE_SLOT, reason);
  }

  async loadSlot(slot: number): Promise<GameSession | null> {
    const data = await this.save.load(slot);
    if (!data) return null;
    this.session = new GameSession(data.payload, new Rng());
    this.playtimeStart = Date.now();
    return this.session;
  }

  async slotInfos(): Promise<SlotInfo[]> {
    const slots = [AUTOSAVE_SLOT, 1, 2, 3];
    const infos = await Promise.all(slots.map((s) => this.save.info(s)));
    return infos.filter((i): i is SlotInfo => i !== null);
  }
}

/** The single shared instance. */
export const app = new GameApp();
