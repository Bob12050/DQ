import type { FusionRecipe } from '../types.ts';

/**
 * 8 original fixed fusion recipes (parents are unordered).
 * When no fixed recipe matches, FusionService falls back to family + rank rules.
 */
export const FUSION_RECIPES: FusionRecipe[] = [
  { id: 'fr_pyrehound', parents: ['mossfang', 'emberwisp'], resultMonsterId: 'pyrehound' },
  { id: 'fr_pyrehound2', parents: ['cragmaw', 'emberwisp'], resultMonsterId: 'pyrehound' },
  { id: 'fr_verdant', parents: ['thornbud', 'bloomsage'], resultMonsterId: 'verdantcolossus' },
  { id: 'fr_verdant2', parents: ['frostpetal', 'bloomsage'], resultMonsterId: 'verdantcolossus' },
  { id: 'fr_obsidark', parents: ['gravelkin', 'hollowmask'], resultMonsterId: 'obsidark' },
  { id: 'fr_sparkcoil', parents: ['glimmerveil', 'tidemurmur'], resultMonsterId: 'sparkcoil' },
  { id: 'fr_bloomsage', parents: ['thornbud', 'tidemurmur'], resultMonsterId: 'bloomsage' },
  { id: 'fr_frostpetal', parents: ['thornbud', 'glimmerveil'], resultMonsterId: 'frostpetal' },
];
