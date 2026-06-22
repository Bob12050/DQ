import { GameState, PARTY_MAX } from '../state/GameState.ts';

export interface PartyChangeResult {
  ok: boolean;
  reason?: string;
}

/** Manages party composition (max 4, no duplicates, at least 1 alive overall). */
export class PartyService {
  constructor(private gs: GameState) {}

  /** Adds a stored monster to the party (if room and not already in). */
  addToParty(uuid: string): PartyChangeResult {
    const data = this.gs.data;
    if (!this.gs.monster(uuid)) return { ok: false, reason: 'unknown monster' };
    if (data.partyUuids.includes(uuid)) return { ok: false, reason: 'already in party' };
    if (data.partyUuids.length >= PARTY_MAX) return { ok: false, reason: 'party full' };
    data.partyUuids.push(uuid);
    return { ok: true };
  }

  /** Removes a monster from the party (cannot empty the party entirely). */
  removeFromParty(uuid: string): PartyChangeResult {
    const data = this.gs.data;
    if (!data.partyUuids.includes(uuid)) return { ok: false, reason: 'not in party' };
    if (data.partyUuids.length <= 1) return { ok: false, reason: 'party cannot be empty' };
    data.partyUuids = data.partyUuids.filter((u) => u !== uuid);
    return { ok: true };
  }

  /** Swaps a party member (by uuid) for a stored monster. */
  swap(partyUuid: string, storageUuid: string): PartyChangeResult {
    const data = this.gs.data;
    const idx = data.partyUuids.indexOf(partyUuid);
    if (idx < 0) return { ok: false, reason: 'not in party' };
    if (!this.gs.monster(storageUuid)) return { ok: false, reason: 'unknown monster' };
    if (data.partyUuids.includes(storageUuid)) return { ok: false, reason: 'already in party' };
    data.partyUuids[idx] = storageUuid;
    return { ok: true };
  }

  /** Reorders party slots. */
  reorder(uuids: string[]): PartyChangeResult {
    if (uuids.length < 1 || uuids.length > PARTY_MAX) return { ok: false, reason: 'invalid size' };
    if (new Set(uuids).size !== uuids.length) return { ok: false, reason: 'duplicate slot' };
    for (const u of uuids) if (!this.gs.monster(u)) return { ok: false, reason: 'unknown monster' };
    this.gs.data.partyUuids = [...uuids];
    return { ok: true };
  }

  /** True if any party member is alive (currentHp > 0). */
  hasLivingMember(): boolean {
    return this.gs.party().some((m) => m.currentHp > 0);
  }

  /** Restores HP/MP of every owned monster (used on returning to town/defeat). */
  fullHealAll(maxStats: (uuid: string) => { hp: number; mp: number }): void {
    for (const m of this.gs.data.monsters) {
      const max = maxStats(m.uuid);
      m.currentHp = max.hp;
      m.currentMp = max.mp;
    }
  }
}
