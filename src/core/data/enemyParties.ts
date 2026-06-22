import type { EnemyPartyDefinition } from '../types.ts';

/** Enemy party compositions (1–4 members) used by every battle, including bosses. */
export const ENEMY_PARTIES: Record<string, EnemyPartyDefinition> = {
  meadow_solo: {
    id: 'meadow_solo',
    name: '草原の獣',
    members: [{ monsterId: 'mossfang', level: 3 }],
    isBoss: false,
    noFlee: false,
  },
  meadow_pair: {
    id: 'meadow_pair',
    name: '草原の群れ',
    members: [
      { monsterId: 'mossfang', level: 3 },
      { monsterId: 'thornbud', level: 4 },
    ],
    isBoss: false,
    noFlee: false,
  },
  meadow_trio: {
    id: 'meadow_trio',
    name: '草原の連れ',
    members: [
      { monsterId: 'mossfang', level: 4, tactics: 'fangForward' },
      { monsterId: 'emberwisp', level: 4 },
      { monsterId: 'thornbud', level: 5 },
    ],
    isBoss: false,
    noFlee: false,
  },
  meadow_full: {
    id: 'meadow_full',
    name: '草原の大群',
    members: [
      { monsterId: 'mossfang', level: 5 },
      { monsterId: 'cragmaw', level: 5 },
      { monsterId: 'emberwisp', level: 5 },
      { monsterId: 'glimmerveil', level: 6 },
    ],
    isBoss: false,
    noFlee: false,
  },
  cavern_pack: {
    id: 'cavern_pack',
    name: '洞窟の徘徊者',
    members: [
      { monsterId: 'gravelkin', level: 7 },
      { monsterId: 'tidemurmur', level: 7, tactics: 'tendThePack' },
      { monsterId: 'hollowmask', level: 8 },
    ],
    isBoss: false,
    noFlee: false,
  },
  cavern_horde: {
    id: 'cavern_horde',
    name: '洞窟の強襲',
    members: [
      { monsterId: 'obsidark', level: 9, tactics: 'bulwark' },
      { monsterId: 'sparkcoil', level: 8 },
      { monsterId: 'frostpetal', level: 8, tactics: 'tendThePack' },
      { monsterId: 'hollowmask', level: 9, tactics: 'snareAndHex' },
    ],
    isBoss: false,
    noFlee: false,
  },
  boss_dirgewarden: {
    id: 'boss_dirgewarden',
    name: '哀悼の番人',
    members: [
      { monsterId: 'dirgewarden', level: 14, tactics: 'evenTide' },
      { monsterId: 'obsidark', level: 11, tactics: 'bulwark' },
      { monsterId: 'hollowmask', level: 11, tactics: 'snareAndHex' },
    ],
    isBoss: true,
    noFlee: true,
  },
};
