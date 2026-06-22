import type { Element } from './Monster';

/** Who a skill / command affects. */
export type TargetType =
  | 'singleEnemy'
  | 'allEnemies'
  | 'singleAlly'
  | 'allAllies'
  | 'self';

/** High-level effect category (extension point: buff/debuff/status). */
export type SkillKind = 'attack' | 'heal' | 'buff' | 'debuff';

export interface Skill {
  /** Stable skill id. */
  id: string;
  name: string;
  description: string;
  element: Element;
  kind: SkillKind;
  /** Base power scalar for damage/heal. */
  skillPower: number;
  targetType: TargetType;
  /** MP cost — reserved for future; MVP does not consume MP. */
  mpCost: number;
}
