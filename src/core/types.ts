/**
 * Core shared types for Echoes of Beast.
 *
 * Naming conventions:
 *  - `*Definition` types are immutable master data (shared across all instances).
 *  - `*Instance` types are per-player owned/runtime data.
 *  - IDs are stable string keys (never shown to the player); `name` is the display label.
 */

// ---------------------------------------------------------------------------
// Elements & families (all original)
// ---------------------------------------------------------------------------

export type Element =
  | 'neutral'
  | 'fire'
  | 'water'
  | 'wind'
  | 'earth'
  | 'light'
  | 'shadow';

export const ELEMENTS: readonly Element[] = [
  'neutral',
  'fire',
  'water',
  'wind',
  'earth',
  'light',
  'shadow',
];

export type MonsterFamily =
  | 'beast' // 獣系
  | 'spirit' // 精霊系
  | 'plant' // 植物系
  | 'stone' // 岩石系
  | 'phantom'; // 幻影系

export const FAMILIES: readonly MonsterFamily[] = [
  'beast',
  'spirit',
  'plant',
  'stone',
  'phantom',
];

/** Rank/rarity, low to high. Used by fusion fallback and recruitment. */
export type Rank = 'common' | 'uncommon' | 'rare' | 'epic' | 'boss';

export const RANK_ORDER: readonly Rank[] = ['common', 'uncommon', 'rare', 'epic', 'boss'];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface StatBlock {
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  magic: number;
  agility: number;
}

export type StatKey = keyof StatBlock;

export const STAT_KEYS: readonly StatKey[] = [
  'hp',
  'mp',
  'attack',
  'defense',
  'magic',
  'agility',
];

/** Per-level growth multipliers (fractional gain per level for each stat). */
export type GrowthRates = StatBlock;

// ---------------------------------------------------------------------------
// Status effects
// ---------------------------------------------------------------------------

export type StatusEffectId = 'poison' | 'sleep' | 'stun' | 'attackUp' | 'attackDown' | 'guardUp';

export interface StatusEffectDefinition {
  id: StatusEffectId;
  name: string;
  description: string;
  kind: 'ailment' | 'buff' | 'debuff';
  /** Prevents the unit from acting while present (e.g. sleep, stun). */
  preventsAction: boolean;
  /** Multiplicative stat modifiers applied while active. */
  statMultipliers?: Partial<Record<StatKey, number>>;
  /** Default duration in turns when applied. */
  defaultDuration: number;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export type TargetRule =
  | 'self'
  | 'allyOne'
  | 'allyAll'
  | 'enemyOne'
  | 'enemyAll'
  | 'allyDeadOne' // revive target
  | 'enemyRandomMulti'
  | 'allyRandom'
  | 'allyOthers'
  | 'everyone';

export type SkillEffectKind =
  | 'physical' // uses attack vs defense
  | 'magical' // uses magic
  | 'heal'
  | 'revive'
  | 'buff'
  | 'debuff'
  | 'ailment'
  | 'cleanse' // remove ailments
  | 'guard';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  /** Base power; meaning depends on effectKind (damage/heal scalar). 0 for pure status. */
  power: number;
  /** 0..1 accuracy. */
  accuracy: number;
  target: TargetRule;
  element: Element;
  effectKind: SkillEffectKind;
  /** Action ordering priority; higher resolves first. Normal=0, guard high, etc. */
  priority: number;
  /** Number of hits for multi-hit skills (default 1). */
  hits?: number;
  /** Status effect to apply and its chance (0..1). */
  inflicts?: { status: StatusEffectId; chance: number; duration?: number };
  /** Stat buffs/debuffs to apply (multiplier) and duration. */
  statChange?: { stats: Partial<Record<StatKey, number>>; duration: number };
  /** Heuristic value the AI uses to weight this skill (higher = more attractive baseline). */
  aiWeight: number;
}

// ---------------------------------------------------------------------------
// Traits (passive abilities) — original
// ---------------------------------------------------------------------------

export type TraitId =
  | 'emberHeart'
  | 'tideScale'
  | 'galeStep'
  | 'stoneSkin'
  | 'firstLight'
  | 'echoGuard'
  | 'thornmail'
  | 'mendingWind'
  | 'manaWell'
  | 'venomFang'
  | 'wardenWill'
  | 'lastEcho';

export interface TraitDefinition {
  id: TraitId;
  name: string;
  description: string;
  /** Trait effect hooks resolved by TraitTriggerService. */
  effect: TraitEffect;
}

export type TraitEffect =
  | { kind: 'battleStartStatUp'; stat: StatKey; multiplier: number; duration: number }
  | { kind: 'elementDamageUp'; element: Element; multiplier: number }
  | { kind: 'elementResist'; element: Element; multiplier: number }
  | { kind: 'extraAction'; chance: number }
  | { kind: 'counter'; multiplier: number; chance: number }
  | { kind: 'cover'; threshold: number } // covers allies below HP threshold
  | { kind: 'regenHp'; fraction: number }
  | { kind: 'regenMp'; amount: number }
  | { kind: 'ailmentBoost'; bonus: number }
  | { kind: 'ailmentResist'; reduction: number }
  | { kind: 'onFaintBuffAllies'; stat: StatKey; multiplier: number; duration: number }
  | { kind: 'lowHpStatUp'; stat: StatKey; multiplier: number; threshold: number };

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export type ItemEffectKind =
  | 'healHp'
  | 'healMp'
  | 'cureAilment'
  | 'revive'
  | 'recruitBoost'
  | 'statBuff';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  /** Usable inside battle? */
  usableInBattle: boolean;
  target: TargetRule;
  effect: ItemEffect;
  price: number;
}

export type ItemEffect =
  | { kind: 'healHp'; amount: number }
  | { kind: 'healMp'; amount: number }
  | { kind: 'cureAilment'; statuses: StatusEffectId[] }
  | { kind: 'revive'; hpFraction: number }
  | { kind: 'recruitBoost'; bonus: number } // used by recruitment, consumed on attempt
  | { kind: 'statBuff'; stats: Partial<Record<StatKey, number>>; duration: number };

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

/** A skill the species learns at a given level. */
export interface LearnableSkill {
  skillId: string;
  level: number;
}

export interface MonsterDefinition {
  id: string;
  name: string;
  description: string;
  family: MonsterFamily;
  rank: Rank;
  element: Element;
  baseStats: StatBlock;
  growth: GrowthRates;
  learnset: LearnableSkill[];
  /** Innate skills always known from level 1 (species-fixed). */
  innateSkills: string[];
  traits: TraitId[];
  /** Element damage taken multipliers. Missing element => 1.0 (neutral). */
  elementResist: Partial<Record<Element, number>>;
  /** Status resistance 0..1 (fraction of inflict chance removed). */
  ailmentResist: Partial<Record<StatusEffectId, number>>;
  /** Base recruit rate 0..1, before situational modifiers. */
  baseRecruitRate: number;
  /** If true, cannot be recruited (bosses, story-locked). */
  recruitable: boolean;
  /** Areas where this species appears (for flavor/validation). */
  habitats: string[];
  /** Placeholder display: a hex color and a glyph drawn procedurally. */
  sprite: { color: string; glyph: string };
}

// ---------------------------------------------------------------------------
// Tactics (AI policies for player monsters) — original names
// ---------------------------------------------------------------------------

export type TacticsId =
  | 'manualOrders' // 直接命令
  | 'fangForward' // 攻撃優先
  | 'evenTide' // バランス重視
  | 'tendThePack' // 回復優先
  | 'emberThrift' // MP節約
  | 'snareAndHex' // 補助と妨害優先
  | 'bulwark'; // 防御優先

export interface TacticsDefinition {
  id: TacticsId;
  name: string;
  description: string;
  /** Whether the player inputs orders manually for this monster. */
  manual: boolean;
  /** Scoring weights applied on top of base AI scoring. */
  weights: {
    damage: number;
    heal: number;
    support: number; // buffs/debuffs/ailments
    guard: number;
    mpThrift: number; // penalty multiplier for spending MP
  };
}

// ---------------------------------------------------------------------------
// Encounters / enemy parties
// ---------------------------------------------------------------------------

export interface EnemyMemberDefinition {
  monsterId: string;
  level: number;
  tactics?: TacticsId;
}

export interface EnemyPartyDefinition {
  id: string;
  name: string;
  members: EnemyMemberDefinition[];
  isBoss: boolean;
  /** Disallow fleeing for this encounter. */
  noFlee: boolean;
}

export interface EncounterDefinition {
  id: string;
  area: string;
  /** Weighted list of enemy party ids that can appear in this area. */
  parties: { partyId: string; weight: number }[];
}

// ---------------------------------------------------------------------------
// Fusion
// ---------------------------------------------------------------------------

export interface FusionRecipe {
  id: string;
  /** Unordered pair of parent species ids. */
  parents: [string, string];
  resultMonsterId: string;
}
