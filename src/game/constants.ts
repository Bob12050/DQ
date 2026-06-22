import type { Element, Rarity } from '../types/Monster';

/** Logical portrait resolution (9:16). The Scale Manager fits this to device. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Scene keys (avoid magic strings). */
export const SCENES = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  Title: 'TitleScene',
  Home: 'HomeScene',
  StageSelect: 'StageSelectScene',
  TeamEdit: 'TeamEditScene',
  MonsterDex: 'MonsterDexScene',
  Battle: 'BattleScene',
  Result: 'ResultScene',
} as const;

/** Numeric colors for shapes/fills. */
export const COLORS = {
  bgTop: 0x141a3a,
  bgBottom: 0x070912,
  panel: 0x1b2350,
  panelLight: 0x2a356f,
  panelDark: 0x121838,
  stroke: 0x3a4a92,
  accent: 0x5ad1ff,
  accent2: 0x7b5cff,
  gold: 0xffd166,
  hp: 0x49d27a,
  hpMid: 0xffd166,
  hpLow: 0xff5d5d,
  danger: 0xff6b6b,
  white: 0xffffff,
} as const;

/** String colors for Phaser Text. */
export const TXT = {
  light: '#eaf0ff',
  dim: '#9aa6d6',
  accent: '#5ad1ff',
  gold: '#ffd166',
  danger: '#ff8a8a',
  good: '#7ef0a6',
} as const;

export const ELEMENT_COLORS: Record<Element, number> = {
  fire: 0xff6b3d,
  water: 0x4aa8ff,
  grass: 0x5fd16a,
  light: 0xffe08a,
  dark: 0x9b6bff,
  neutral: 0xb8c0e0,
};

export const ELEMENT_LABELS: Record<Element, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  light: '光',
  dark: '闇',
  neutral: '無',
};

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x9aa6d6,
  rare: 0x5ad1ff,
  epic: 0xb47bff,
  legendary: 0xffd166,
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'N',
  rare: 'R',
  epic: 'SR',
  legendary: 'SSR',
};
