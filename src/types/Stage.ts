/** One enemy entry in a stage's party (species + level). */
export interface EnemyEntry {
  templateId: string;
  level: number;
}

/** Rewards granted on victory. */
export interface StageReward {
  coins: number;
  exp: number;
  /** Optional monster template dropped/recruited on clear (extension point). */
  dropTemplateId?: string;
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  /** Enemy party (1–4). */
  enemies: EnemyEntry[];
  /** Suggested team power for UI guidance. */
  recommendedPower: number;
  reward: StageReward;
}
