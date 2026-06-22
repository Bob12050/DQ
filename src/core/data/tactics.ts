import type { TacticsDefinition, TacticsId } from '../types.ts';

/** Original AI policies for player-controlled monsters. */
export const TACTICS: Record<TacticsId, TacticsDefinition> = {
  manualOrders: {
    id: 'manualOrders',
    name: '直接命令',
    description: 'プレイヤーが毎ターン行動を指示する。',
    manual: true,
    weights: { damage: 1, heal: 1, support: 1, guard: 1, mpThrift: 1 },
  },
  fangForward: {
    id: 'fangForward',
    name: '牙を前へ',
    description: '攻撃を最優先する。',
    manual: false,
    weights: { damage: 1.4, heal: 0.7, support: 0.6, guard: 0.4, mpThrift: 0.8 },
  },
  evenTide: {
    id: 'evenTide',
    name: '均衡の波',
    description: '攻撃と支援をバランスよく行う。',
    manual: false,
    weights: { damage: 1, heal: 1, support: 1, guard: 0.8, mpThrift: 1 },
  },
  tendThePack: {
    id: 'tendThePack',
    name: '群れを癒す',
    description: '回復を優先する。',
    manual: false,
    weights: { damage: 0.7, heal: 1.6, support: 0.9, guard: 0.8, mpThrift: 0.9 },
  },
  emberThrift: {
    id: 'emberThrift',
    name: '焔を惜しむ',
    description: 'MP消費を抑える。',
    manual: false,
    weights: { damage: 1, heal: 0.9, support: 0.7, guard: 0.9, mpThrift: 2 },
  },
  snareAndHex: {
    id: 'snareAndHex',
    name: '搦め手',
    description: '補助と妨害を優先する。',
    manual: false,
    weights: { damage: 0.8, heal: 0.8, support: 1.6, guard: 0.7, mpThrift: 0.9 },
  },
  bulwark: {
    id: 'bulwark',
    name: '盾の構え',
    description: '防御を優先する。',
    manual: false,
    weights: { damage: 0.7, heal: 1, support: 0.8, guard: 1.6, mpThrift: 1 },
  },
};
