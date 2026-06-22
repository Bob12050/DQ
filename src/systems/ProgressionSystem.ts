import type { Monster, MonsterTemplate } from '../types/Monster';
import { getTemplate } from '../data/monsters';

export const MAX_LEVEL = 50;

let instanceCounter = 0;

/** EXP required to advance FROM `level` to the next. */
export function expToNext(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(20 + level * level * 6);
}

interface ComputedStats {
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
}

/** Computes stats for a template at a given level: base * (1 + growth*(lvl-1)). */
export function statsForLevel(template: MonsterTemplate, level: number): ComputedStats {
  const f = 1 + template.growth * (level - 1);
  return {
    maxHp: Math.round(template.base.maxHp * f),
    attack: Math.round(template.base.attack * f),
    defense: Math.round(template.base.defense * f),
    magic: Math.round(template.base.magic * f),
    speed: Math.round(template.base.speed * f),
  };
}

/** Creates a fresh, fully-healed monster instance at the given level. */
export function createMonster(templateId: string, level: number): Monster {
  const t = getTemplate(templateId);
  const s = statsForLevel(t, level);
  instanceCounter += 1;
  return {
    id: `m_${Date.now().toString(36)}_${instanceCounter.toString(36)}`,
    templateId: t.templateId,
    name: t.name,
    element: t.element,
    rarity: t.rarity,
    level,
    exp: 0,
    maxHp: s.maxHp,
    hp: s.maxHp,
    attack: s.attack,
    defense: s.defense,
    magic: s.magic,
    speed: s.speed,
    skills: [...t.skillIds],
  };
}

export interface ExpResult {
  gained: number;
  leveledUp: boolean;
  fromLevel: number;
  toLevel: number;
}

/**
 * Adds EXP to a monster, applying any level-ups in place. Recomputes max stats
 * and grants the HP delta from leveling (so leveling feels rewarding).
 */
export function addExp(monster: Monster, amount: number): ExpResult {
  const fromLevel = monster.level;
  monster.exp += Math.max(0, Math.round(amount));

  while (monster.level < MAX_LEVEL && monster.exp >= expToNext(monster.level)) {
    monster.exp -= expToNext(monster.level);
    monster.level += 1;
  }
  if (monster.level >= MAX_LEVEL) monster.exp = 0;

  if (monster.level !== fromLevel) {
    const t = getTemplate(monster.templateId);
    const before = monster.maxHp;
    const s = statsForLevel(t, monster.level);
    monster.maxHp = s.maxHp;
    monster.attack = s.attack;
    monster.defense = s.defense;
    monster.magic = s.magic;
    monster.speed = s.speed;
    // Grant the increase in max HP to current HP.
    monster.hp = Math.min(monster.maxHp, monster.hp + (s.maxHp - before));
  }

  return {
    gained: Math.max(0, Math.round(amount)),
    leveledUp: monster.level !== fromLevel,
    fromLevel,
    toLevel: monster.level,
  };
}

/** Rough power rating for UI guidance (team strength vs recommended). */
export function monsterPower(m: Monster): number {
  return Math.round(m.maxHp / 5 + m.attack + m.defense + m.magic + m.speed);
}
