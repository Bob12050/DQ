import { registry } from '../src/core/registry/DataRegistry.ts';
import { createInstance, type MonsterInstance } from '../src/core/monster/MonsterInstance.ts';
import { Rng } from '../src/core/rng.ts';
import type { EnemyPartyDefinition, TacticsId } from '../src/core/types.ts';

export function makeParty(
  specs: { species: string; level: number; tactics?: TacticsId }[],
  rng: Rng,
): MonsterInstance[] {
  return specs.map((s) =>
    createInstance(registry.monster(s.species), s.level, { tactics: s.tactics ?? 'manualOrders', rng }),
  );
}

export function enemyParty(
  members: { monsterId: string; level: number; tactics?: TacticsId }[],
  opts: { isBoss?: boolean; noFlee?: boolean } = {},
): EnemyPartyDefinition {
  return {
    id: 'test_party',
    name: 'Test',
    members,
    isBoss: opts.isBoss ?? false,
    noFlee: opts.noFlee ?? false,
  };
}
