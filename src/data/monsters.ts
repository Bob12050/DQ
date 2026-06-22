import type { MonsterTemplate } from '../types/Monster';

/**
 * Original monster species. All names/designs are original to Monster Nexus.
 * Stats are base (level 1); ProgressionSystem scales them by level via `growth`.
 */
export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  emberpup: {
    templateId: 'emberpup',
    name: 'エンバーパップ',
    element: 'fire',
    rarity: 'common',
    base: { maxHp: 90, attack: 22, defense: 12, magic: 14, speed: 16 },
    growth: 0.11,
    skillIds: ['ember_slash'],
    description: '尾の火種を揺らして駆けまわる、好奇心旺盛な火の仔獣。',
  },
  cinderdrake: {
    templateId: 'cinderdrake',
    name: 'シンダードレイク',
    element: 'fire',
    rarity: 'epic',
    base: { maxHp: 120, attack: 28, defense: 16, magic: 20, speed: 14 },
    growth: 0.12,
    skillIds: ['ember_slash', 'flame_burst'],
    description: '噴煙をまとう竜種。怒りに触れると全てを焼き払う。',
  },
  ripplet: {
    templateId: 'ripplet',
    name: 'リプレット',
    element: 'water',
    rarity: 'common',
    base: { maxHp: 100, attack: 18, defense: 16, magic: 16, speed: 14 },
    growth: 0.11,
    skillIds: ['aqua_lance'],
    description: '澄んだ泉に棲む水のスライム。穏やかだが芯は強い。',
  },
  tidalon: {
    templateId: 'tidalon',
    name: 'タイダロン',
    element: 'water',
    rarity: 'rare',
    base: { maxHp: 115, attack: 22, defense: 18, magic: 22, speed: 13 },
    growth: 0.12,
    skillIds: ['aqua_lance', 'tidal_surge'],
    description: '深海の潮流を操る巨魚。大波で戦場を塗り替える。',
  },
  sprigling: {
    templateId: 'sprigling',
    name: 'スプリグリング',
    element: 'grass',
    rarity: 'common',
    base: { maxHp: 105, attack: 19, defense: 18, magic: 15, speed: 12 },
    growth: 0.11,
    skillIds: ['leaf_edge'],
    description: '若葉をまとう小さな精。土の力でじっくり戦う。',
  },
  bramblehorn: {
    templateId: 'bramblehorn',
    name: 'ブランブルホーン',
    element: 'grass',
    rarity: 'rare',
    base: { maxHp: 125, attack: 24, defense: 22, magic: 14, speed: 11 },
    growth: 0.12,
    skillIds: ['leaf_edge', 'bramble_storm'],
    description: '茨の角を持つ獣。守りに優れ、群れを束ねる。',
  },
  glimmercat: {
    templateId: 'glimmercat',
    name: 'グリマーキャット',
    element: 'light',
    rarity: 'rare',
    base: { maxHp: 95, attack: 20, defense: 13, magic: 24, speed: 20 },
    growth: 0.12,
    skillIds: ['lumina_ray', 'mend_pulse'],
    description: '光をまとう俊敏な霊獣。仲間を癒やす光をともす。',
  },
  nocturne: {
    templateId: 'nocturne',
    name: 'ノクターン',
    element: 'dark',
    rarity: 'rare',
    base: { maxHp: 100, attack: 26, defense: 14, magic: 22, speed: 18 },
    growth: 0.12,
    skillIds: ['umbral_fang'],
    description: '夜陰に紛れる影の使い。鋭い牙で急所を狙う。',
  },
  pebblite: {
    templateId: 'pebblite',
    name: 'ペブライト',
    element: 'neutral',
    rarity: 'common',
    base: { maxHp: 130, attack: 17, defense: 24, magic: 10, speed: 8 },
    growth: 0.11,
    skillIds: ['rally_cry'],
    description: '硬い殻を持つ岩の守り手。粘り強く前線を支える。',
  },
};

/**
 * Template ids the player owns at the start of a new game.
 * Starts with a single partner; the rest are collected by scouting in battle.
 */
export const STARTER_TEMPLATE_IDS: string[] = ['emberpup'];

export function getTemplate(templateId: string): MonsterTemplate {
  const t = MONSTER_TEMPLATES[templateId];
  if (!t) throw new Error(`Unknown monster template: ${templateId}`);
  return t;
}
