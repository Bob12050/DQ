import { DataRegistry, registry } from '../registry/DataRegistry.ts';
import { GameState, GameStateData, createNewGameData, STORAGE_MAX } from './GameState.ts';
import type { FusionHistoryEntry } from './GameState.ts';
import { PartyService } from '../services/PartyService.ts';
import { InventoryService } from '../services/InventoryService.ts';
import { FusionService } from '../services/FusionService.ts';
import { createInstance, instanceStats, type MonsterInstance } from '../monster/MonsterInstance.ts';
import { applyExp, type LevelUpStep } from '../monster/leveling.ts';
import type { BattleController } from '../battle/BattleController.ts';
import type { BattleResult } from '../battle/types.ts';
import { Rng } from '../rng.ts';

export interface LevelUpReport {
  uuid: string;
  nickname: string;
  fromLevel: number;
  toLevel: number;
  gainedExp: number;
  learnedSkills: string[];
}

export interface ApplyBattleSummary {
  outcome: BattleResult['outcome'];
  levelUps: LevelUpReport[];
  recruited: { speciesId: string; nickname: string; accepted: boolean }[];
}

/** Default starter party for a new game (original species). */
const STARTERS: { species: string; level: number; nickname?: string }[] = [
  { species: 'mossfang', level: 5 },
  { species: 'emberwisp', level: 5 },
  { species: 'gravelkin', level: 5 },
];

/**
 * Top-level game orchestrator. Owns the GameState and stateless services,
 * and is the single place that mutates persisted progress from battle results.
 */
export class GameSession {
  readonly reg: DataRegistry = registry;
  state: GameState;
  party: PartyService;
  inventory: InventoryService;
  fusion: FusionService;
  rng: Rng;

  constructor(data: GameStateData, rng?: Rng) {
    this.state = new GameState(data);
    this.party = new PartyService(this.state);
    this.inventory = new InventoryService(this.state, this.reg);
    this.fusion = new FusionService(this.reg);
    this.rng = rng ?? new Rng();
  }

  static newGame(rng?: Rng): GameSession {
    const seedRng = rng ?? new Rng();
    const starters = STARTERS.map((s) =>
      createInstance(registry.monster(s.species), s.level, { nickname: s.nickname, rng: seedRng }),
    );
    return new GameSession(createNewGameData(starters), seedRng);
  }

  /** Recompute and return max HP/MP for an owned monster. */
  maxVitals(uuid: string): { hp: number; mp: number } {
    const inst = this.state.monster(uuid);
    if (!inst) return { hp: 1, mp: 0 };
    const stats = instanceStats(this.reg, inst);
    return { hp: stats.hp, mp: stats.mp };
  }

  /** Heals the whole owned collection (e.g. on returning to town / after defeat). */
  healAll(): void {
    this.party.fullHealAll((uuid) => this.maxVitals(uuid));
  }

  /**
   * Applies a finished battle's result to persisted state: HP/MP write-back,
   * EXP & level-ups, recruited monsters, and item consumption.
   */
  applyBattleResult(controller: BattleController): ApplyBattleSummary {
    const result = controller.buildResult();

    // 1. Write back HP/MP for surviving party units.
    const vitals = controller.vitalsByUuid();
    for (const inst of this.state.party()) {
      const v = vitals.get(inst.uuid);
      if (v) {
        inst.currentHp = v.hp;
        inst.currentMp = v.mp;
      }
    }

    // 2. EXP & level-ups.
    const levelUps: LevelUpReport[] = [];
    for (const award of result.expAwards) {
      if (award.gained <= 0) continue;
      const inst = this.state.monster(award.uuid);
      if (!inst) continue;
      const def = this.reg.monster(inst.speciesId);
      const before = inst.level;
      const { level, exp, steps } = applyExp(def, inst.level, inst.exp, award.gained, inst.fusionBonus);
      inst.level = level;
      inst.exp = exp;
      if (steps.length > 0) {
        const learned = steps.flatMap((s: LevelUpStep) => s.learnedSkills);
        for (const sk of learned) if (!inst.skills.includes(sk)) inst.skills.push(sk);
        levelUps.push({
          uuid: inst.uuid,
          nickname: inst.nickname,
          fromLevel: before,
          toLevel: level,
          gainedExp: award.gained,
          learnedSkills: learned,
        });
      }
      // Clamp current vitals against possibly-raised maxima.
      const max = instanceStats(this.reg, inst);
      inst.currentHp = Math.min(inst.currentHp, max.hp);
      inst.currentMp = Math.min(inst.currentMp, max.mp);
    }

    // 3. Recruited monsters.
    const recruited: ApplyBattleSummary['recruited'] = [];
    for (const r of result.recruited) {
      if (this.state.isAtCapacity()) {
        recruited.push({ speciesId: r.speciesId, nickname: this.reg.monster(r.speciesId).name, accepted: false });
        continue;
      }
      const inst = createInstance(this.reg.monster(r.speciesId), r.level, { rng: this.rng });
      this.state.data.monsters.push(inst);
      recruited.push({ speciesId: r.speciesId, nickname: inst.nickname, accepted: true });
    }

    // 4. Item consumption (from the battle's snapshot inventory usage).
    for (const [itemId, n] of Object.entries(controller.state.itemsConsumed)) {
      this.inventory.consume(itemId, n);
    }

    return { outcome: result.outcome, levelUps, recruited };
  }

  /**
   * Executes a fusion after final confirmation: validates constraints, removes
   * the two parents, adds the child, records lineage/history.
   */
  executeFusion(parentUuidA: string, parentUuidB: string, chosenSkills: string[]): MonsterInstance {
    if (parentUuidA === parentUuidB) throw new Error('同じ個体は親に選べません。');
    const a = this.state.monster(parentUuidA);
    const b = this.state.monster(parentUuidB);
    if (!a || !b) throw new Error('親モンスターが見つかりません。');
    // Must leave at least one monster after fusion (2 removed, 1 added => net -1).
    if (this.state.data.monsters.length <= 2) throw new Error('最後の1体になる融合はできません。');

    const child = this.fusion.execute(a, b, chosenSkills, this.rng);

    // Remove parents from collection and party.
    const removed = new Set([a.uuid, b.uuid]);
    this.state.data.monsters = this.state.data.monsters.filter((m) => !removed.has(m.uuid));
    this.state.data.partyUuids = this.state.data.partyUuids.filter((u) => !removed.has(u));

    // Add child; auto-join party if there is room.
    this.state.data.monsters.push(child);
    if (this.state.data.partyUuids.length < 4) this.state.data.partyUuids.push(child.uuid);

    const entry: FusionHistoryEntry = {
      childUuid: child.uuid,
      childSpeciesId: child.speciesId,
      parentSpeciesIds: [a.speciesId, b.speciesId],
      at: Date.now(),
    };
    this.state.data.fusionHistory.push(entry);
    return child;
  }

  get capacityRemaining(): number {
    return STORAGE_MAX - this.state.data.monsters.length;
  }
}
