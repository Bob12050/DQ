import type { Skill } from '../types/Skill';

/**
 * Original skill definitions. Data-driven so new skills can be added without
 * touching battle/UI code. `skillPower` feeds DamageCalculator.
 */
export const SKILLS: Record<string, Skill> = {
  ember_slash: {
    id: 'ember_slash',
    name: 'エンバースラッシュ',
    description: '炎をまとった一閃。敵1体に火属性ダメージ。',
    element: 'fire',
    kind: 'attack',
    skillPower: 14,
    targetType: 'singleEnemy',
    mpCost: 4,
  },
  flame_burst: {
    id: 'flame_burst',
    name: 'フレイムバースト',
    description: '爆炎が敵全体を包む。火属性の全体攻撃。',
    element: 'fire',
    kind: 'attack',
    skillPower: 10,
    targetType: 'allEnemies',
    mpCost: 10,
  },
  aqua_lance: {
    id: 'aqua_lance',
    name: 'アクアランス',
    description: '水の槍で敵1体を貫く。水属性ダメージ。',
    element: 'water',
    kind: 'attack',
    skillPower: 14,
    targetType: 'singleEnemy',
    mpCost: 4,
  },
  tidal_surge: {
    id: 'tidal_surge',
    name: 'タイダルサージ',
    description: '高波が敵全体を飲み込む。水属性の全体攻撃。',
    element: 'water',
    kind: 'attack',
    skillPower: 10,
    targetType: 'allEnemies',
    mpCost: 10,
  },
  leaf_edge: {
    id: 'leaf_edge',
    name: 'リーフエッジ',
    description: '鋭い葉刃で敵1体を斬る。草属性ダメージ。',
    element: 'grass',
    kind: 'attack',
    skillPower: 14,
    targetType: 'singleEnemy',
    mpCost: 4,
  },
  bramble_storm: {
    id: 'bramble_storm',
    name: 'ブランブルストーム',
    description: '茨の嵐が敵全体を切り裂く。草属性の全体攻撃。',
    element: 'grass',
    kind: 'attack',
    skillPower: 10,
    targetType: 'allEnemies',
    mpCost: 10,
  },
  lumina_ray: {
    id: 'lumina_ray',
    name: 'ルミナレイ',
    description: '聖なる光線で敵1体を撃つ。光属性ダメージ。',
    element: 'light',
    kind: 'attack',
    skillPower: 15,
    targetType: 'singleEnemy',
    mpCost: 5,
  },
  umbral_fang: {
    id: 'umbral_fang',
    name: 'アンブラルファング',
    description: '闇の牙で敵1体を喰らう。闇属性ダメージ。',
    element: 'dark',
    kind: 'attack',
    skillPower: 15,
    targetType: 'singleEnemy',
    mpCost: 5,
  },
  mend_pulse: {
    id: 'mend_pulse',
    name: 'メンドパルス',
    description: '癒やしの波動で味方1体のHPを回復する。',
    element: 'light',
    kind: 'heal',
    skillPower: 18,
    targetType: 'singleAlly',
    mpCost: 6,
  },
  rally_cry: {
    id: 'rally_cry',
    name: 'ラリークライ',
    description: '味方全体を鼓舞する（将来: 攻撃強化）。MVPでは軽い全体回復。',
    element: 'neutral',
    kind: 'heal',
    skillPower: 8,
    targetType: 'allAllies',
    mpCost: 8,
  },
};

export function getSkill(id: string): Skill {
  const s = SKILLS[id];
  if (!s) throw new Error(`Unknown skill id: ${id}`);
  return s;
}
