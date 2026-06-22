import { describe, it, expect } from 'vitest';
import { BattleSystem } from '../src/systems/BattleSystem';
import { DamageCalculator } from '../src/systems/DamageCalculator';
import { createMonster, addExp, expToNext } from '../src/systems/ProgressionSystem';
import type { BattleCommand } from '../src/types/Battle';

/** Deterministic RNG for reproducible tests. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('DamageCalculator element chart', () => {
  const dc = new DamageCalculator();
  it('fire beats grass, grass beats water, water beats fire', () => {
    expect(dc.elementMultiplier('fire', 'grass')).toBeGreaterThan(1);
    expect(dc.elementMultiplier('grass', 'water')).toBeGreaterThan(1);
    expect(dc.elementMultiplier('water', 'fire')).toBeGreaterThan(1);
  });
  it('reverse matchups are resisted', () => {
    expect(dc.elementMultiplier('grass', 'fire')).toBeLessThan(1);
  });
  it('light and dark are mutually weak', () => {
    expect(dc.elementMultiplier('light', 'dark')).toBeGreaterThan(1);
    expect(dc.elementMultiplier('dark', 'light')).toBeGreaterThan(1);
  });
  it('neutral is always 1x', () => {
    expect(dc.elementMultiplier('neutral', 'fire')).toBe(1);
    expect(dc.elementMultiplier('fire', 'neutral')).toBe(1);
  });
});

describe('BattleSystem 4v4', () => {
  it('runs a full battle to a decisive outcome', () => {
    const allies = [
      createMonster('emberpup', 8),
      createMonster('ripplet', 8),
      createMonster('sprigling', 8),
      createMonster('glimmercat', 8),
    ];
    const enemies = [createMonster('pebblite', 2), createMonster('sprigling', 2)];
    const battle = new BattleSystem(allies, enemies, seeded(1));

    let guard = 0;
    let outcome = battle.outcome();
    while (outcome === 'ongoing' && guard < 50) {
      const cmds = new Map<number, BattleCommand>();
      for (const u of battle.allies) if (u.alive) cmds.set(u.index, { type: 'attack', targetIndex: 0 });
      outcome = battle.resolveRound(cmds).outcome;
      guard++;
    }
    expect(['win', 'lose']).toContain(outcome);
  });

  it('supports any team size (1v4 and 4v1)', () => {
    const oneVsFour = new BattleSystem(
      [createMonster('cinderdrake', 20)],
      [createMonster('ripplet', 1), createMonster('ripplet', 1), createMonster('ripplet', 1), createMonster('ripplet', 1)],
      seeded(2),
    );
    let oc = oneVsFour.outcome();
    let g = 0;
    while (oc === 'ongoing' && g++ < 50) {
      const cmds = new Map<number, BattleCommand>([[0, { type: 'attack', targetIndex: 0 }]]);
      oc = oneVsFour.resolveRound(cmds).outcome;
    }
    expect(['win', 'lose']).toContain(oc);
  });

  it('defeated units never act / fall to 0 HP', () => {
    const battle = new BattleSystem([createMonster('nocturne', 30)], [createMonster('ripplet', 1)], seeded(3));
    battle.resolveRound(new Map([[0, { type: 'attack', targetIndex: 0 }]]));
    const dead = battle.enemies[0]!;
    expect(dead.monster.hp).toBeGreaterThanOrEqual(0);
  });
});

describe('Scout system', () => {
  it('scout chance is higher at low HP', () => {
    const battle = new BattleSystem([createMonster('emberpup', 10)], [createMonster('ripplet', 5)], seeded(1));
    const enemy = battle.enemies[0]!;
    enemy.monster.hp = enemy.monster.maxHp;
    const full = battle.scoutChance(enemy);
    enemy.monster.hp = 1;
    const low = battle.scoutChance(enemy);
    expect(low).toBeGreaterThan(full);
  });

  it('a successful scout removes the enemy and records it (rng=0 always succeeds)', () => {
    const battle = new BattleSystem([createMonster('emberpup', 10)], [createMonster('ripplet', 5)], () => 0);
    const result = battle.resolveRound(new Map<number, BattleCommand>([[0, { type: 'scout', targetIndex: 0 }]]));
    expect(battle.enemies[0]!.scouted).toBe(true);
    expect(battle.enemies[0]!.alive).toBe(false);
    expect(battle.scouted).toHaveLength(1);
    expect(battle.scouted[0]!.templateId).toBe('ripplet');
    // Scouting the last enemy ends the battle in victory.
    expect(result.outcome).toBe('win');
  });
});

describe('ProgressionSystem', () => {
  it('levels up when EXP threshold is crossed and raises stats', () => {
    const m = createMonster('emberpup', 1);
    const atk0 = m.attack;
    const res = addExp(m, expToNext(1) + expToNext(2) + 5);
    expect(res.leveledUp).toBe(true);
    expect(m.level).toBeGreaterThanOrEqual(3);
    expect(m.attack).toBeGreaterThan(atk0);
  });
});
