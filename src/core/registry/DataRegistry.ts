import type {
  EncounterDefinition,
  EnemyPartyDefinition,
  ItemDefinition,
  MonsterDefinition,
  SkillDefinition,
  StatusEffectDefinition,
  StatusEffectId,
  TacticsDefinition,
  TacticsId,
  TraitDefinition,
  TraitId,
} from '../types.ts';
import { MONSTERS } from '../data/monsters.ts';
import { SKILLS } from '../data/skills.ts';
import { TRAITS } from '../data/traits.ts';
import { ITEMS } from '../data/items.ts';
import { STATUS_EFFECTS } from '../data/statusEffects.ts';
import { TACTICS } from '../data/tactics.ts';
import { ENEMY_PARTIES } from '../data/enemyParties.ts';
import { ENCOUNTERS } from '../data/encounters.ts';
import { FUSION_RECIPES } from '../data/fusionRecipes.ts';

/**
 * Central, read-only access to all master data.
 *
 * Data is authored as TypeScript modules (typed object literals) rather than
 * JSON: this gives compile-time checking of the shape, IDE navigation, and lets
 * us reference shared enums — while still being fully data-driven (no game rule
 * reads these literals directly except through the registry). See DESIGN.md.
 */
export class DataRegistry {
  readonly monsters = MONSTERS;
  readonly skills = SKILLS;
  readonly traits = TRAITS;
  readonly items = ITEMS;
  readonly statusEffects = STATUS_EFFECTS;
  readonly tactics = TACTICS;
  readonly enemyParties = ENEMY_PARTIES;
  readonly encounters = ENCOUNTERS;
  readonly fusionRecipes = FUSION_RECIPES;

  monster(id: string): MonsterDefinition {
    const m = this.monsters[id];
    if (!m) throw new Error(`Unknown monster id: ${id}`);
    return m;
  }

  skill(id: string): SkillDefinition {
    const s = this.skills[id];
    if (!s) throw new Error(`Unknown skill id: ${id}`);
    return s;
  }

  trait(id: TraitId): TraitDefinition {
    const t = this.traits[id];
    if (!t) throw new Error(`Unknown trait id: ${id}`);
    return t;
  }

  item(id: string): ItemDefinition {
    const i = this.items[id];
    if (!i) throw new Error(`Unknown item id: ${id}`);
    return i;
  }

  statusEffect(id: StatusEffectId): StatusEffectDefinition {
    const s = this.statusEffects[id];
    if (!s) throw new Error(`Unknown status effect id: ${id}`);
    return s;
  }

  tacticsDef(id: TacticsId): TacticsDefinition {
    const t = this.tactics[id];
    if (!t) throw new Error(`Unknown tactics id: ${id}`);
    return t;
  }

  enemyParty(id: string): EnemyPartyDefinition {
    const p = this.enemyParties[id];
    if (!p) throw new Error(`Unknown enemy party id: ${id}`);
    return p;
  }

  encounter(area: string): EncounterDefinition {
    const e = this.encounters[area];
    if (!e) throw new Error(`Unknown encounter area: ${area}`);
    return e;
  }

  allMonsters(): MonsterDefinition[] {
    return Object.values(this.monsters);
  }
}

/** Shared singleton instance. */
export const registry = new DataRegistry();
