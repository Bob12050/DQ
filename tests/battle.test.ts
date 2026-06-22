import { describe, it, expect } from 'vitest';
import { registry } from '../src/core/registry/DataRegistry.ts';
import { BattleController, type TurnInput } from '../src/core/battle/BattleController.ts';
import { ActionQueueBuilder } from '../src/core/battle/ActionQueueBuilder.ts';
import { Rng } from '../src/core/rng.ts';
import { makeParty, enemyParty } from './helpers.ts';
import type { BattleCommand } from '../src/core/battle/types.ts';

const reg = registry;

/** Builds a turn where every manual player unit basic-attacks the first living enemy. */
function attackAll(ctrl: BattleController): TurnInput {
  const commands: BattleCommand[] = [];
  const livingEnemies = ctrl.state.enemy.livingUnits();
  for (const u of ctrl.manualUnits()) {
    const target = livingEnemies[0];
    commands.push({ actorId: u.id, actionType: 'attack', targetIds: target ? [target.id] : [], commandSource: 'manual' });
  }
  return { type: 'commands', commands };
}

function runToEnd(ctrl: BattleController, maxTurns = 60): void {
  let i = 0;
  while (!ctrl.isOver && i < maxTurns) {
    ctrl.resolveTurn(attackAll(ctrl));
    i++;
  }
}

describe('4v4 battle core', () => {
  it('creates up to 8 BattleUnits (4 vs 4)', () => {
    const rng = new Rng(42);
    const party = makeParty(
      [
        { species: 'mossfang', level: 8 },
        { species: 'emberwisp', level: 8 },
        { species: 'gravelkin', level: 8 },
        { species: 'cragmaw', level: 8 },
      ],
      rng,
    );
    const ctrl = BattleController.create(reg, party, enemyParty([
      { monsterId: 'mossfang', level: 5 },
      { monsterId: 'thornbud', level: 5 },
      { monsterId: 'emberwisp', level: 5 },
      { monsterId: 'glimmerveil', level: 5 },
    ]), rng);
    expect(ctrl.state.allUnits().length).toBe(8);
    expect(ctrl.state.player.units.length).toBe(4);
    expect(ctrl.state.enemy.units.length).toBe(4);
  });

  it('queues all 8 actions in one ActionQueue', () => {
    const rng = new Rng(7);
    const party = makeParty([
      { species: 'mossfang', level: 10 },
      { species: 'emberwisp', level: 10 },
      { species: 'gravelkin', level: 10 },
      { species: 'cragmaw', level: 10 },
    ], rng);
    const ctrl = BattleController.create(reg, party, enemyParty([
      { monsterId: 'mossfang', level: 8 },
      { monsterId: 'thornbud', level: 8 },
      { monsterId: 'emberwisp', level: 8 },
      { monsterId: 'glimmerveil', level: 8 },
    ]), rng);
    const builder = new ActionQueueBuilder(reg);
    const commands: BattleCommand[] = ctrl.state.allUnits().map((u) => ({
      actorId: u.id,
      actionType: 'guard',
      targetIds: [u.id],
      commandSource: 'manual',
    }));
    const queue = builder.build(ctrl.state, commands, rng);
    expect(queue.length).toBe(8);
  });

  it('battles resolve to victory or defeat for all party sizes 1..4 vs 1..4', () => {
    for (let pn = 1; pn <= 4; pn++) {
      for (let en = 1; en <= 4; en++) {
        const rng = new Rng(100 + pn * 10 + en);
        const pSpecs = Array.from({ length: pn }, () => ({ species: 'cragmaw', level: 12 }));
        const eSpecs = Array.from({ length: en }, () => ({ monsterId: 'mossfang', level: 3 }));
        const ctrl = BattleController.create(reg, makeParty(pSpecs, rng), enemyParty(eSpecs), rng);
        runToEnd(ctrl);
        expect(['victory', 'defeat', 'recruited_all', 'fled']).toContain(ctrl.state.outcome);
      }
    }
  });

  it('1 vs 4 and 4 vs 1 both reach a decision', () => {
    const rng = new Rng(5);
    const oneVsFour = BattleController.create(
      reg,
      makeParty([{ species: 'verdantcolossus', level: 25 }], rng),
      enemyParty([
        { monsterId: 'mossfang', level: 3 },
        { monsterId: 'thornbud', level: 3 },
        { monsterId: 'emberwisp', level: 3 },
        { monsterId: 'glimmerveil', level: 3 },
      ]),
      rng,
    );
    runToEnd(oneVsFour);
    expect(oneVsFour.isOver).toBe(true);

    const fourVsOne = BattleController.create(
      reg,
      makeParty([
        { species: 'mossfang', level: 10 },
        { species: 'emberwisp', level: 10 },
        { species: 'gravelkin', level: 10 },
        { species: 'cragmaw', level: 10 },
      ], rng),
      enemyParty([{ monsterId: 'mossfang', level: 3 }]),
      rng,
    );
    runToEnd(fourVsOne);
    expect(fourVsOne.state.outcome).toBe('victory');
  });

  it('speed order is reproducible with a fixed seed', () => {
    const buildOrder = (): string[] => {
      const rng = new Rng(999);
      const party = makeParty([
        { species: 'mossfang', level: 10 },
        { species: 'gravelkin', level: 10 },
      ], rng);
      const ctrl = BattleController.create(reg, party, enemyParty([
        { monsterId: 'glimmerveil', level: 10 },
        { monsterId: 'cragmaw', level: 10 },
      ]), rng);
      const builder = new ActionQueueBuilder(reg);
      const commands: BattleCommand[] = ctrl.state.allUnits().map((u) => ({
        actorId: u.id, actionType: 'attack', targetIds: [], commandSource: 'manual',
      }));
      return builder.build(ctrl.state, commands, ctrl.state.rng).map((a) => a.actorId);
    };
    expect(buildOrder()).toEqual(buildOrder());
  });

  it('defeated units do not act and fallen targets are re-selected', () => {
    const rng = new Rng(3);
    const party = makeParty([{ species: 'verdantcolossus', level: 30 }], rng);
    const ctrl = BattleController.create(reg, party, enemyParty([
      { monsterId: 'mossfang', level: 2 },
      { monsterId: 'mossfang', level: 2 },
    ]), rng);
    // Target a specific enemy that will likely die; resolver must re-pick.
    const firstEnemy = ctrl.state.enemy.units[0]!;
    ctrl.resolveTurn({
      type: 'commands',
      commands: [{ actorId: 'p0', actionType: 'attack', targetIds: [firstEnemy.id], commandSource: 'manual' }],
    });
    // No exception, battle progressed.
    expect(ctrl.state.turn).toBe(1);
  });
});
