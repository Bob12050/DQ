import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { GameSession } from '../src/core/state/GameSession.ts';
import { BattleController } from '../src/core/battle/BattleController.ts';
import { SaveRepository } from '../src/core/save/SaveRepository.ts';
import { buildSave } from '../src/core/save/SaveData.ts';
import { Rng } from '../src/core/rng.ts';
import type { BattleCommand } from '../src/core/battle/types.ts';

describe('full game-loop integration', () => {
  it('new game → win a battle → apply EXP/HP/items → fuse → save → load', async () => {
    const session = GameSession.newGame(new Rng(1));
    const beforeLevels = session.state.party().map((m) => m.level);
    session.inventory.add('herbSalve', 3);

    // Fight a weak enemy party and win by attacking + using an item.
    const ctrl = BattleController.create(
      session.reg,
      session.state.party(),
      session.reg.enemyParty('meadow_solo'),
      session.rng,
    );

    let turns = 0;
    let itemUsed = false;
    while (!ctrl.isOver && turns < 30) {
      const commands: BattleCommand[] = [];
      const enemy = ctrl.state.enemy.livingUnits()[0];
      for (const u of ctrl.manualUnits()) {
        // Use one herb on the very first action (exercises item path), then attack.
        if (!itemUsed) {
          itemUsed = true;
          commands.push({ actorId: u.id, actionType: 'item', itemId: 'herbSalve', targetIds: [u.id], commandSource: 'manual' });
        } else {
          commands.push({ actorId: u.id, actionType: 'attack', targetIds: enemy ? [enemy.id] : [], commandSource: 'manual' });
        }
      }
      ctrl.resolveTurn({ type: 'commands', commands });
      turns++;
    }
    expect(ctrl.state.outcome).toBe('victory');

    const beforeHerb = session.inventory.count('herbSalve');
    const summary = session.applyBattleResult(ctrl);
    expect(summary.outcome).toBe('victory');
    // Item used in battle was consumed from the real inventory.
    expect(session.inventory.count('herbSalve')).toBe(beforeHerb - 1);
    // Someone gained EXP (levels are >= before; total exp moved forward).
    const afterLevels = session.state.party().map((m) => m.level);
    expect(afterLevels.every((lv, i) => lv >= beforeLevels[i]!)).toBe(true);

    // Fuse the first two owned monsters.
    const [a, b] = session.state.data.monsters;
    const count = session.state.data.monsters.length;
    const child = session.executeFusion(a!.uuid, b!.uuid, []);
    expect(session.state.data.monsters.length).toBe(count - 1);
    expect(child.level).toBe(1);

    // Persist and restore.
    const repo = new SaveRepository();
    await repo.save(buildSave(1, session.state.data, 'integration'));
    const loaded = await repo.load(1);
    expect(loaded).not.toBeNull();
    const restored = new GameSession(loaded!.payload, new Rng(2));
    expect(restored.state.monster(child.uuid)).toBeTruthy();
    expect(restored.state.data.fusionHistory.length).toBe(1);
  });

  it('boss battle cannot be fled and boss cannot be recruited', () => {
    const session = GameSession.newGame(new Rng(9));
    const ctrl = BattleController.create(
      session.reg,
      session.state.party(),
      session.reg.enemyParty('boss_dirgewarden'),
      session.rng,
    );
    expect(ctrl.canFlee).toBe(false);
    const boss = ctrl.state.enemy.units.find((u) => u.def.id === 'dirgewarden')!;
    expect(ctrl.recruitment.evaluate(ctrl.state, boss, 0).possible).toBe(false);
  });
});
