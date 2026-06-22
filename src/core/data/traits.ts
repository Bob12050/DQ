import type { TraitDefinition, TraitId } from '../types.ts';

/** 12 original passive traits resolved by TraitTriggerService. */
export const TRAITS: Record<TraitId, TraitDefinition> = {
  emberHeart: {
    id: 'emberHeart',
    name: '熾火の心',
    description: '火属性で与えるダメージが増える。',
    effect: { kind: 'elementDamageUp', element: 'fire', multiplier: 1.3 },
  },
  tideScale: {
    id: 'tideScale',
    name: '潮鱗',
    description: '水属性で受けるダメージが減る。',
    effect: { kind: 'elementResist', element: 'water', multiplier: 0.6 },
  },
  galeStep: {
    id: 'galeStep',
    name: '疾風の歩',
    description: '戦闘開始時に素早さが上がる。',
    effect: { kind: 'battleStartStatUp', stat: 'agility', multiplier: 1.3, duration: 99 },
  },
  stoneSkin: {
    id: 'stoneSkin',
    name: '石膚',
    description: '戦闘開始時に防御が上がる。',
    effect: { kind: 'battleStartStatUp', stat: 'defense', multiplier: 1.25, duration: 99 },
  },
  firstLight: {
    id: 'firstLight',
    name: '黎明',
    description: '戦闘開始時に攻撃が上がる。',
    effect: { kind: 'battleStartStatUp', stat: 'attack', multiplier: 1.25, duration: 99 },
  },
  echoGuard: {
    id: 'echoGuard',
    name: '反響盾',
    description: 'HPが低い味方をかばうことがある。',
    effect: { kind: 'cover', threshold: 0.3 },
  },
  thornmail: {
    id: 'thornmail',
    name: '棘衣',
    description: '物理攻撃を受けると反撃することがある。',
    effect: { kind: 'counter', multiplier: 0.6, chance: 0.35 },
  },
  mendingWind: {
    id: 'mendingWind',
    name: '癒風',
    description: 'ターン終了時にHPが少し回復する。',
    effect: { kind: 'regenHp', fraction: 0.07 },
  },
  manaWell: {
    id: 'manaWell',
    name: '源泉',
    description: 'ターン終了時にMPが回復する。',
    effect: { kind: 'regenMp', amount: 4 },
  },
  venomFang: {
    id: 'venomFang',
    name: '毒牙',
    description: '状態異常を付与しやすい。',
    effect: { kind: 'ailmentBoost', bonus: 0.2 },
  },
  wardenWill: {
    id: 'wardenWill',
    name: '不屈',
    description: '状態異常に強い。',
    effect: { kind: 'ailmentResist', reduction: 0.3 },
  },
  lastEcho: {
    id: 'lastEcho',
    name: '残響',
    description: '戦闘不能になると味方の攻撃が上がる。',
    effect: { kind: 'onFaintBuffAllies', stat: 'attack', multiplier: 1.25, duration: 3 },
  },
};
