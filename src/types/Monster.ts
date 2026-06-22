/** Elemental attribute of monsters and skills. */
export type Element = 'fire' | 'water' | 'grass' | 'light' | 'dark' | 'neutral';

/** Rarity tiers (extension point for gacha / drop rates). */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Master template for a monster species (data-driven, immutable).
 * Stored in src/data/monsters.ts. Instances are derived from these.
 */
export interface MonsterTemplate {
  /** Stable species id (never shown to the player). */
  templateId: string;
  /** Display name. */
  name: string;
  element: Element;
  rarity: Rarity;
  /** Base stats at level 1. */
  base: {
    maxHp: number;
    attack: number;
    defense: number;
    magic: number;
    speed: number;
  };
  /** Per-level growth multiplier (fractional gain per level). */
  growth: number;
  /** Skill ids this species knows. */
  skillIds: string[];
  /** Short flavor text for the dex. */
  description: string;
}

/**
 * A player-owned monster instance (mutable, persisted).
 * Distinct from MonsterTemplate. Carries the fields required by the battle spec.
 */
export interface Monster {
  /** Unique instance id. */
  id: string;
  /** Source species template id. */
  templateId: string;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  exp: number;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
  /** Known skill ids. */
  skills: string[];
}
