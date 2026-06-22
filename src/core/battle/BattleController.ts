import type { DataRegistry } from '../registry/DataRegistry.ts';
import { BattleState, BattleTeam } from './BattleState.ts';
import type { BattleUnit } from './BattleUnit.ts';
import { unitFromEnemy, unitFromInstance } from './BattleUnit.ts';
import type { MonsterInstance } from '../monster/MonsterInstance.ts';
import type { EnemyPartyDefinition } from '../types.ts';
import { Rng } from '../rng.ts';
import { DamageCalculator } from './DamageCalculator.ts';
import { StatusEffectService } from './StatusEffectService.ts';
import { TraitTriggerService } from './TraitTriggerService.ts';
import { ActionEvaluator, newAiContext } from './ActionEvaluator.ts';
import { EnemyAI } from './EnemyAI.ts';
import { TacticsAI } from './TacticsAI.ts';
import { ActionQueueBuilder } from './ActionQueueBuilder.ts';
import { ActionResolver } from './ActionResolver.ts';
import { RecruitmentService } from './RecruitmentService.ts';
import { expFromDefeat } from '../monster/leveling.ts';
import { TRAITS } from '../data/traits.ts';
import type { BattleCommand, BattleResult, BattleOutcome } from './types.ts';

const MAX_EXTRA_ACTIONS_PER_TURN = 1;

export type TurnInput =
  | { type: 'commands'; commands: BattleCommand[] }
  | { type: 'resonate'; targetId: string }
  | { type: 'flee' };

export interface TurnReport {
  outcome: BattleOutcome;
  fromLogIndex: number;
}

/**
 * Drives a full 4v4 battle as an explicit state machine. UI supplies player
 * input via resolveTurn(); all rules live here and in the injected services.
 */
export class BattleController {
  readonly state: BattleState;
  private dmg: DamageCalculator;
  private status: StatusEffectService;
  private traits: TraitTriggerService;
  private evaluator: ActionEvaluator;
  private enemyAi: EnemyAI;
  private tacticsAi: TacticsAI;
  private queueBuilder: ActionQueueBuilder;
  private resolver: ActionResolver;
  readonly recruitment: RecruitmentService;

  private constructor(
    private reg: DataRegistry,
    player: BattleTeam,
    enemy: BattleTeam,
    rng: Rng,
    isBoss: boolean,
    noFlee: boolean,
    areaBonus: number,
  ) {
    this.state = new BattleState(player, enemy, rng, isBoss, noFlee);
    this.dmg = new DamageCalculator(reg);
    this.status = new StatusEffectService(reg);
    this.traits = new TraitTriggerService();
    this.evaluator = new ActionEvaluator(reg, this.dmg);
    this.enemyAi = new EnemyAI(this.evaluator);
    this.tacticsAi = new TacticsAI(this.evaluator);
    this.queueBuilder = new ActionQueueBuilder(reg);
    this.resolver = new ActionResolver(reg, this.dmg, this.status, this.traits);
    this.recruitment = new RecruitmentService(reg, areaBonus);
  }

  static create(
    reg: DataRegistry,
    playerInstances: MonsterInstance[],
    enemyParty: EnemyPartyDefinition,
    rng: Rng,
    areaBonus = 0,
  ): BattleController {
    const playerUnits: BattleUnit[] = playerInstances
      .slice(0, 4)
      .map((inst, i) => unitFromInstance(reg, inst, `p${i}`, i));
    const enemyUnits: BattleUnit[] = enemyParty.members
      .slice(0, 4)
      .map((m, i) => unitFromEnemy(reg, m.monsterId, m.level, `e${i}`, i, m.tactics ?? 'evenTide'));

    const ctrl = new BattleController(
      reg,
      new BattleTeam('player', playerUnits),
      new BattleTeam('enemy', enemyUnits),
      rng,
      enemyParty.isBoss,
      enemyParty.noFlee,
      areaBonus,
    );
    ctrl.start();
    return ctrl;
  }

  private start(): void {
    this.state.state = 'BATTLE_START';
    this.traits.onBattleStart(this.state);
    this.state.info('戦闘開始！');
    this.state.state = 'TURN_START';
  }

  /** Whether the player can flee this battle. */
  get canFlee(): boolean {
    return !this.state.noFlee;
  }

  /** Living player units that require manual orders this turn. */
  manualUnits(): BattleUnit[] {
    return this.state.player.livingUnits().filter((u) => this.tacticsAi.isManual(u) && u.canAct);
  }

  /**
   * Resolves one full turn. Returns the outcome and the log start index so the
   * UI/animation queue can replay only this turn's events.
   */
  resolveTurn(input: TurnInput): TurnReport {
    const fromLogIndex = this.state.log.length;
    this.state.turn += 1;
    this.state.state = 'TURN_START';

    // Reset per-turn flags.
    for (const u of this.state.allUnits()) {
      u.guarding = false;
      u.extraActionsThisTurn = 0;
    }

    if (input.type === 'flee') {
      if (this.tryFlee()) {
        this.state.outcome = 'fled';
        this.state.state = 'BATTLE_END';
        return { outcome: 'fled', fromLogIndex };
      }
      // Failed flee: enemies still act this turn.
      this.runEnemyOnlyTurn();
      return { outcome: this.state.outcome, fromLogIndex };
    }

    if (input.type === 'resonate') {
      this.performResonance(input.targetId);
      if (this.state.outcome === 'ongoing') this.runEnemyOnlyTurn();
      this.finishTurn();
      return { outcome: this.state.outcome, fromLogIndex };
    }

    // Normal command turn.
    this.state.state = 'PLAYER_COMMAND_SELECTION';
    const manualByActor = new Map<string, BattleCommand>();
    for (const cmd of input.commands) manualByActor.set(cmd.actorId, cmd);

    const aiCtx = newAiContext();
    const commands: BattleCommand[] = [];

    // Player commands: manual where provided, tactics-AI otherwise.
    for (const u of this.state.player.livingUnits()) {
      if (!u.canAct) continue;
      if (this.tacticsAi.isManual(u)) {
        const cmd = manualByActor.get(u.id);
        if (cmd) commands.push(cmd);
        else commands.push({ actorId: u.id, actionType: 'wait', targetIds: [], commandSource: 'manual' });
      } else {
        commands.push(this.tacticsAi.chooseCommand(this.state, u, aiCtx));
      }
    }

    // Enemy commands.
    this.state.state = 'ENEMY_COMMAND_SELECTION';
    commands.push(...this.enemyAi.chooseCommands(this.state, aiCtx));

    this.state.state = 'ACTION_QUEUE_BUILD';
    const queue = this.queueBuilder.build(this.state, commands, this.state.rng);

    this.state.state = 'ACTION_RESOLUTION';
    for (const action of queue) {
      if (this.state.outcome !== 'ongoing') break;
      if (this.bothCheckEnd()) break;
      this.resolver.resolve(this.state, action, this.state.rng);
      this.maybeExtraAction(action.actorId);
    }

    this.finishTurn();
    return { outcome: this.state.outcome, fromLogIndex };
  }

  private maybeExtraAction(actorId: string): void {
    const actor = this.state.unit(actorId);
    if (!actor.isAlive || actor.extraActionsThisTurn >= MAX_EXTRA_ACTIONS_PER_TURN) return;
    for (const t of actor.traits) {
      const eff = TRAITS[t].effect;
      if (eff.kind === 'extraAction' && this.state.rng.chance(eff.chance)) {
        actor.extraActionsThisTurn += 1;
        this.state.pushLog({ text: `${actor.name}は続けて動いた！`, kind: 'info', actorId: actor.id });
        const ctx = newAiContext();
        const cmd = this.evaluator.decide(this.state, actor, actor.side === 'enemy' ? actor.tactics : 'fangForward', ctx);
        const [action] = this.queueBuilder.build(this.state, [cmd], this.state.rng);
        if (action) this.resolver.resolve(this.state, action, this.state.rng);
        return;
      }
    }
  }

  private runEnemyOnlyTurn(): void {
    const aiCtx = newAiContext();
    const commands = this.enemyAi.chooseCommands(this.state, aiCtx);
    const queue = this.queueBuilder.build(this.state, commands, this.state.rng);
    this.state.state = 'ACTION_RESOLUTION';
    for (const action of queue) {
      if (this.bothCheckEnd()) break;
      this.resolver.resolve(this.state, action, this.state.rng);
    }
    this.finishTurn();
  }

  private performResonance(targetId: string): void {
    const target = this.state.enemy.units.find((u) => u.id === targetId);
    if (!target || !target.isAlive) {
      this.state.info('共鳴の対象がいない。');
      return;
    }
    const chance = this.recruitment.evaluate(this.state, target, this.state.recruitItemBonus);
    this.state.recruitItemBonus = 0;
    this.state.info('味方全員が共鳴を試みた…');
    if (!chance.possible) {
      this.state.pushLog({ text: `${target.name}には共鳴が届かない。`, kind: 'recruit', targetId: target.id });
      target.wariness += 0.5;
      return;
    }
    if (this.state.rng.chance(chance.chance)) {
      target.recruited = true;
      this.state.pushLog({ text: `${target.name}が仲間になった！`, kind: 'recruit', targetId: target.id });
      if (this.state.enemy.isWiped()) {
        this.state.outcome = this.state.enemy.units.some((u) => u.recruited) ? 'recruited_all' : 'victory';
        this.state.state = 'BATTLE_RESULT';
      }
    } else {
      this.state.pushLog({ text: `${target.name}との共鳴は届かなかった…`, kind: 'recruit', targetId: target.id });
      target.wariness += 1;
    }
  }

  private tryFlee(): boolean {
    if (this.state.noFlee) {
      this.state.info('ここからは逃げられない！');
      return false;
    }
    const pSpeed = this.state.player.livingUnits().reduce((s, u) => s + u.effectiveStat(this.reg, 'agility'), 0);
    const eSpeed = this.state.enemy.livingUnits().reduce((s, u) => s + u.effectiveStat(this.reg, 'agility'), 0);
    const chance = Math.max(0.25, Math.min(0.9, pSpeed / (pSpeed + eSpeed) + 0.25));
    if (this.state.rng.chance(chance)) {
      this.state.info('うまく逃げ切った！');
      return true;
    }
    this.state.info('逃げ切れなかった！');
    return false;
  }

  private finishTurn(): void {
    if (this.state.outcome !== 'ongoing') {
      this.state.state = 'BATTLE_END';
      return;
    }
    this.state.state = 'END_OF_TURN_EFFECTS';
    for (const u of this.state.allUnits()) {
      this.status.tickEndOfTurn(this.state, u, this.state.rng);
      this.traits.onEndOfTurn(this.state, u);
    }
    this.state.state = 'VICTORY_OR_DEFEAT_CHECK';
    this.bothCheckEnd();
    this.state.state = this.state.outcome === 'ongoing' ? 'TURN_END' : 'BATTLE_END';
  }

  /** Returns true if the battle has ended; sets outcome. */
  private bothCheckEnd(): boolean {
    if (this.state.outcome !== 'ongoing') return true;
    if (this.state.player.isWiped()) {
      this.state.outcome = 'defeat';
      this.state.info('パーティは全滅した…');
      return true;
    }
    if (this.state.enemy.isWiped()) {
      this.state.outcome = this.state.enemy.units.some((u) => u.recruited) ? 'recruited_all' : 'victory';
      this.state.info('敵を打ち倒した！');
      return true;
    }
    return false;
  }

  get isOver(): boolean {
    return this.state.outcome !== 'ongoing';
  }

  /** Builds the post-battle result for GameState to apply. */
  buildResult(): BattleResult {
    const outcome = this.state.outcome;
    const victory = outcome === 'victory' || outcome === 'recruited_all';

    let totalExp = 0;
    if (victory) {
      for (const e of this.state.enemy.units) {
        if (!e.recruited) totalExp += expFromDefeat(e.level);
      }
    }
    const partySize = Math.max(1, this.state.player.units.length);
    const share = Math.round(totalExp / partySize);

    const expAwards = this.state.player.units
      .filter((u) => u.sourceUuid)
      .map((u) => ({
        uuid: u.sourceUuid!,
        gained: victory ? (u.isAlive ? share : Math.round(share * 0.5)) : 0,
      }));

    const recruited = this.state.enemy.units
      .filter((u) => u.recruited)
      .map((u) => ({ enemyUnitId: u.id, speciesId: u.def.id, level: u.level }));

    const itemDrops: { itemId: string; count: number }[] = [];

    return {
      outcome,
      expPerSurvivor: share,
      expAwards,
      recruited,
      itemDrops,
      log: this.state.log,
    };
  }

  /** Returns the current HP/MP snapshot for a player unit (for write-back). */
  vitalsByUuid(): Map<string, { hp: number; mp: number }> {
    const map = new Map<string, { hp: number; mp: number }>();
    for (const u of this.state.player.units) {
      if (u.sourceUuid) map.set(u.sourceUuid, { hp: u.hp, mp: u.mp });
    }
    return map;
  }
}
