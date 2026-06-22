import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { GameSession } from '../src/core/state/GameSession.ts';
import { Rng } from '../src/core/rng.ts';
import { PARTY_MAX } from '../src/core/state/GameState.ts';
import { createInstance } from '../src/core/monster/MonsterInstance.ts';

describe('party service', () => {
  it('caps party at 4 and forbids duplicates', () => {
    const session = GameSession.newGame(new Rng(1));
    // fill collection with extras
    for (let i = 0; i < 4; i++) {
      session.state.data.monsters.push(createInstance(registry.monster('mossfang'), 3, { rng: session.rng }));
    }
    const stored = session.state.storage();
    // add until full
    let added = 0;
    for (const m of stored) {
      if (session.party.addToParty(m.uuid).ok) added++;
    }
    expect(session.state.data.partyUuids.length).toBe(PARTY_MAX);
    // duplicate rejected
    const inParty = session.state.data.partyUuids[0]!;
    expect(session.party.addToParty(inParty).ok).toBe(false);
    expect(added).toBeGreaterThanOrEqual(1);
  });

  it('cannot empty the party', () => {
    const session = GameSession.newGame(new Rng(1));
    while (session.state.data.partyUuids.length > 1) {
      session.party.removeFromParty(session.state.data.partyUuids[0]!);
    }
    expect(session.party.removeFromParty(session.state.data.partyUuids[0]!).ok).toBe(false);
  });
});

describe('inventory service', () => {
  it('consumes items and never goes negative', () => {
    const session = GameSession.newGame(new Rng(1));
    session.inventory.add('herbSalve', 1);
    const before = session.inventory.count('herbSalve');
    expect(session.inventory.consume('herbSalve', 1)).toBe(true);
    expect(session.inventory.count('herbSalve')).toBe(before - 1);
    // over-consume fails
    const left = session.inventory.count('herbSalve');
    expect(session.inventory.consume('herbSalve', left + 5)).toBe(false);
    expect(session.inventory.count('herbSalve')).toBe(left);
  });

  it('buying requires gold', () => {
    const session = GameSession.newGame(new Rng(1));
    session.state.data.gold = 0;
    expect(session.inventory.buy('herbSalve', 1)).toBe(false);
    session.state.data.gold = 1000;
    expect(session.inventory.buy('herbSalve', 1)).toBe(true);
  });
});
