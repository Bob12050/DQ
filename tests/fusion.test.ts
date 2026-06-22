import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { FusionService, FUSION_BONUS_CAP } from '../src/core/services/FusionService.ts';
import { createInstance } from '../src/core/monster/MonsterInstance.ts';
import { GameSession } from '../src/core/state/GameSession.ts';
import { Rng } from '../src/core/rng.ts';

const reg = registry;
const fusion = new FusionService(reg);

function inst(species: string, level: number, rng: Rng) {
  return createInstance(reg.monster(species), level, { rng });
}

describe('fusion', () => {
  it('uses a fixed recipe when one matches (mossfang + emberwisp = pyrehound)', () => {
    const rng = new Rng(1);
    const p = fusion.preview(inst('mossfang', 10, rng), inst('emberwisp', 10, rng));
    expect(p.fixedRecipe).toBe(true);
    expect(p.resultSpeciesId).toBe('pyrehound');
  });

  it('falls back to family/rank rules when no recipe matches', () => {
    const rng = new Rng(1);
    const p = fusion.preview(inst('mossfang', 10, rng), inst('mossfang', 10, rng));
    expect(p.fixedRecipe).toBe(false);
    expect(reg.monster(p.resultSpeciesId)).toBeTruthy(); // valid species
    expect(reg.monster(p.resultSpeciesId).rank).not.toBe('boss');
  });

  it('child keeps innate skills and at most maxInherit inherited skills', () => {
    const rng = new Rng(2);
    const a = inst('mossfang', 12, rng); // knows rendingClaw
    const b = inst('tidemurmur', 12, rng); // knows tidebolt, mendPulse
    const preview = fusion.preview(a, b);
    const chosen = preview.inheritableSkills.slice(0, 2);
    const child = fusion.execute(a, b, chosen, rng);
    for (const innate of preview.innateSkills) expect(child.skills).toContain(innate);
    const inheritedCount = child.skills.filter((s) => !preview.innateSkills.includes(s)).length;
    expect(inheritedCount).toBeLessThanOrEqual(preview.maxInherit);
  });

  it('rejects more than maxInherit inherited skills', () => {
    const rng = new Rng(3);
    const a = inst('bloomsage', 20, rng);
    const b = inst('hollowmask', 20, rng);
    const preview = fusion.preview(a, b);
    const tooMany = preview.inheritableSkills.slice(0, preview.maxInherit + 1);
    if (tooMany.length > preview.maxInherit) {
      expect(() => fusion.execute(a, b, tooMany, rng)).toThrow();
    }
  });

  it('child is level 1, records lineage and generation, bonus is capped', () => {
    const rng = new Rng(4);
    const a = inst('mossfang', 30, rng);
    const b = inst('emberwisp', 30, rng);
    const child = fusion.execute(a, b, [], rng);
    expect(child.level).toBe(1);
    expect(child.generation).toBe(2);
    expect(child.parents.map((p) => p.speciesId).sort()).toEqual(['emberwisp', 'mossfang']);
    for (const v of Object.values(child.fusionBonus)) expect(v as number).toBeLessThanOrEqual(FUSION_BONUS_CAP);
  });

  it('cannot fuse a monster with itself', () => {
    const rng = new Rng(5);
    const a = inst('mossfang', 10, rng);
    expect(() => fusion.preview(a, a)).toThrow();
  });

  it('GameSession fusion removes both parents and adds the child', () => {
    const session = GameSession.newGame(new Rng(7));
    const [a, b] = session.state.data.monsters;
    const beforeCount = session.state.data.monsters.length;
    const child = session.executeFusion(a!.uuid, b!.uuid, []);
    expect(session.state.monster(a!.uuid)).toBeUndefined();
    expect(session.state.monster(b!.uuid)).toBeUndefined();
    expect(session.state.monster(child.uuid)).toBeTruthy();
    expect(session.state.data.monsters.length).toBe(beforeCount - 1);
    expect(session.state.data.fusionHistory.length).toBe(1);
  });
});
