import type { Stage } from '../types/Stage';

/**
 * Stage definitions (1–5). Designed to scale: add more entries here without
 * touching scene code. Each stage's enemy party is built from monster templates.
 */
export const STAGES: Stage[] = [
  {
    id: 'stage_1',
    name: '1. 芽吹きの草原',
    description: '弱い野良モンスターが現れる、調律師の入門地。',
    enemies: [
      { templateId: 'sprigling', level: 2 },
      { templateId: 'emberpup', level: 2 },
    ],
    recommendedPower: 120,
    reward: { coins: 50, exp: 30 },
  },
  {
    id: 'stage_2',
    name: '2. せせらぎの渓',
    description: '水辺に棲むモンスターたちが群れをなす。',
    enemies: [
      { templateId: 'ripplet', level: 3 },
      { templateId: 'ripplet', level: 3 },
      { templateId: 'sprigling', level: 3 },
    ],
    recommendedPower: 220,
    reward: { coins: 90, exp: 55 },
  },
  {
    id: 'stage_3',
    name: '3. 灰かぶりの丘',
    description: '火属性のモンスターが多い、熱気立つ丘陵。',
    enemies: [
      { templateId: 'emberpup', level: 4 },
      { templateId: 'emberpup', level: 4 },
      { templateId: 'pebblite', level: 4 },
      { templateId: 'cinderdrake', level: 4 },
    ],
    recommendedPower: 360,
    reward: { coins: 140, exp: 90, dropTemplateId: 'cinderdrake' },
  },
  {
    id: 'stage_4',
    name: '4. 月影の森',
    description: '闇と光が交差する森。素早い影の獣に注意。',
    enemies: [
      { templateId: 'nocturne', level: 5 },
      { templateId: 'glimmercat', level: 5 },
      { templateId: 'bramblehorn', level: 5 },
      { templateId: 'nocturne', level: 5 },
    ],
    recommendedPower: 480,
    reward: { coins: 200, exp: 130, dropTemplateId: 'glimmercat' },
  },
  {
    id: 'stage_5',
    name: '5. 潮鳴りの深淵',
    description: '深海の主が待つ最終試練。総力戦に備えよ。',
    enemies: [
      { templateId: 'tidalon', level: 6 },
      { templateId: 'bramblehorn', level: 6 },
      { templateId: 'cinderdrake', level: 6 },
      { templateId: 'tidalon', level: 7 },
    ],
    recommendedPower: 650,
    reward: { coins: 320, exp: 200, dropTemplateId: 'tidalon' },
  },
];

export function getStage(id: string): Stage {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown stage id: ${id}`);
  return s;
}
