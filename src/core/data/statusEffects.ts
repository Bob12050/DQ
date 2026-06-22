import type { StatusEffectDefinition, StatusEffectId } from '../types.ts';

export const STATUS_EFFECTS: Record<StatusEffectId, StatusEffectDefinition> = {
  poison: {
    id: 'poison',
    name: '蝕み',
    description: 'ターン終了時に最大HPの一部を失う。',
    kind: 'ailment',
    preventsAction: false,
    defaultDuration: 4,
  },
  sleep: {
    id: 'sleep',
    name: '微睡み',
    description: '行動できない。攻撃を受けると目覚めることがある。',
    kind: 'ailment',
    preventsAction: true,
    defaultDuration: 3,
  },
  stun: {
    id: 'stun',
    name: '麻痺',
    description: '行動できない。',
    kind: 'ailment',
    preventsAction: true,
    defaultDuration: 2,
  },
  attackUp: {
    id: 'attackUp',
    name: '高揚',
    description: '攻撃力が上昇している。',
    kind: 'buff',
    preventsAction: false,
    statMultipliers: { attack: 1.4 },
    defaultDuration: 3,
  },
  attackDown: {
    id: 'attackDown',
    name: '萎縮',
    description: '攻撃力が低下している。',
    kind: 'debuff',
    preventsAction: false,
    statMultipliers: { attack: 0.7 },
    defaultDuration: 3,
  },
  guardUp: {
    id: 'guardUp',
    name: '堅守',
    description: '防御力が上昇している。',
    kind: 'buff',
    preventsAction: false,
    statMultipliers: { defense: 1.5 },
    defaultDuration: 3,
  },
};

/** Fraction of max HP lost from poison each turn. */
export const POISON_HP_FRACTION = 0.08;
