export const SCENES = {
  Boot: 'Boot',
  Title: 'Title',
  Town: 'Town',
  Field: 'Field',
  Battle: 'Battle',
  Result: 'Result',
  Party: 'Party',
  Storage: 'Storage',
  MonsterDetail: 'MonsterDetail',
  Fusion: 'Fusion',
  Shop: 'Shop',
  SaveLoad: 'SaveLoad',
  Settings: 'Settings',
  Clear: 'Clear',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];
