import type { EncounterDefinition } from '../types.ts';

/** Per-area weighted encounter tables. */
export const ENCOUNTERS: Record<string, EncounterDefinition> = {
  meadow: {
    id: 'meadow',
    area: 'meadow',
    parties: [
      { partyId: 'meadow_solo', weight: 35 },
      { partyId: 'meadow_pair', weight: 35 },
      { partyId: 'meadow_trio', weight: 20 },
      { partyId: 'meadow_full', weight: 10 },
    ],
  },
  cavern: {
    id: 'cavern',
    area: 'cavern',
    parties: [
      { partyId: 'cavern_pack', weight: 60 },
      { partyId: 'cavern_horde', weight: 40 },
    ],
  },
};
