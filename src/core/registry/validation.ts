import type { DataRegistry } from './DataRegistry.ts';
import { STAT_KEYS } from '../types.ts';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all master data for referential integrity and value ranges.
 * Called at boot (dev) and by a Vitest test. Surfaces problems loudly rather
 * than letting a bad id crash mid-battle.
 */
export function validateData(reg: DataRegistry): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const skillIds = new Set(Object.keys(reg.skills));
  const monsterIds = new Set(Object.keys(reg.monsters));
  const traitIds = new Set(Object.keys(reg.traits));
  const statusIds = new Set(Object.keys(reg.statusEffects));

  // Duplicate ids: object literals can't duplicate keys, but verify the `id`
  // field matches its map key (a common copy/paste mistake).
  const checkKeyMatch = (label: string, map: Record<string, { id: string }>): void => {
    for (const [key, def] of Object.entries(map)) {
      if (def.id !== key) {
        errors.push(`${label}: key "${key}" does not match its id "${def.id}".`);
      }
    }
  };
  checkKeyMatch('monster', reg.monsters);
  checkKeyMatch('skill', reg.skills);
  checkKeyMatch('item', reg.items);
  checkKeyMatch('trait', reg.traits as Record<string, { id: string }>);

  // Skills: ranges.
  for (const skill of Object.values(reg.skills)) {
    if (skill.mpCost < 0) errors.push(`skill ${skill.id}: negative mpCost (${skill.mpCost}).`);
    if (skill.accuracy < 0 || skill.accuracy > 1) {
      errors.push(`skill ${skill.id}: accuracy out of range (${skill.accuracy}).`);
    }
    if (skill.power < 0) errors.push(`skill ${skill.id}: negative power.`);
    if (skill.inflicts && !statusIds.has(skill.inflicts.status)) {
      errors.push(`skill ${skill.id}: unknown status ${skill.inflicts.status}.`);
    }
  }

  // Monsters: stats, learnset/innate/trait references.
  for (const m of Object.values(reg.monsters)) {
    for (const key of STAT_KEYS) {
      const v = m.baseStats[key];
      if (key === 'hp' && v <= 0) errors.push(`monster ${m.id}: maxHP must be > 0.`);
      if (v < 0) errors.push(`monster ${m.id}: negative base stat ${key}.`);
      if (v > 999) warnings.push(`monster ${m.id}: very high base stat ${key} (${v}).`);
    }
    if (m.baseRecruitRate < 0 || m.baseRecruitRate > 1) {
      errors.push(`monster ${m.id}: baseRecruitRate out of range.`);
    }
    for (const sk of m.innateSkills) {
      if (!skillIds.has(sk)) errors.push(`monster ${m.id}: unknown innate skill ${sk}.`);
    }
    for (const ls of m.learnset) {
      if (!skillIds.has(ls.skillId)) {
        errors.push(`monster ${m.id}: unknown learnset skill ${ls.skillId}.`);
      }
      if (ls.level < 1 || ls.level > 50) {
        errors.push(`monster ${m.id}: learnset level out of range (${ls.level}).`);
      }
    }
    for (const tr of m.traits) {
      if (!traitIds.has(tr)) errors.push(`monster ${m.id}: unknown trait ${tr}.`);
    }
  }

  // Items: effect target sanity.
  for (const it of Object.values(reg.items)) {
    if (it.effect.kind === 'cureAilment') {
      for (const s of it.effect.statuses) {
        if (!statusIds.has(s)) errors.push(`item ${it.id}: unknown status ${s}.`);
      }
    }
  }

  // Enemy parties & members.
  for (const p of Object.values(reg.enemyParties)) {
    if (p.members.length < 1 || p.members.length > 4) {
      errors.push(`enemy party ${p.id}: must have 1–4 members (has ${p.members.length}).`);
    }
    for (const mem of p.members) {
      if (!monsterIds.has(mem.monsterId)) {
        errors.push(`enemy party ${p.id}: unknown monster ${mem.monsterId}.`);
      }
      if (mem.level < 1 || mem.level > 50) {
        errors.push(`enemy party ${p.id}: member level out of range (${mem.level}).`);
      }
    }
  }

  // Encounters reference valid parties.
  for (const enc of Object.values(reg.encounters)) {
    if (enc.parties.length === 0) errors.push(`encounter ${enc.id}: no parties.`);
    for (const ref of enc.parties) {
      if (!reg.enemyParties[ref.partyId]) {
        errors.push(`encounter ${enc.id}: unknown party ${ref.partyId}.`);
      }
      if (ref.weight <= 0) errors.push(`encounter ${enc.id}: non-positive weight.`);
    }
  }

  // Fusion recipes reference valid monsters.
  const recipeKeys = new Set<string>();
  for (const r of reg.fusionRecipes) {
    if (recipeKeys.has(r.id)) errors.push(`fusion recipe: duplicate id ${r.id}.`);
    recipeKeys.add(r.id);
    for (const parent of r.parents) {
      if (!monsterIds.has(parent)) errors.push(`fusion recipe ${r.id}: unknown parent ${parent}.`);
    }
    if (!monsterIds.has(r.resultMonsterId)) {
      errors.push(`fusion recipe ${r.id}: unknown result ${r.resultMonsterId}.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
