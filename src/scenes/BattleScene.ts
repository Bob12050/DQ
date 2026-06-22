import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MonsterCard } from '../ui/MonsterCard';
import { GameState } from '../game/GameState';
import { getStage } from '../data/stages';
import { getSkill } from '../data/skills';
import { createMonster } from '../systems/ProgressionSystem';
import { BattleSystem } from '../systems/BattleSystem';
import type { BattleCommand, BattleEvent, BattleHit, Side } from '../types/Battle';

const CARD_W = 320;
const CARD_H = 150;
const ENEMY_POS: ReadonlyArray<[number, number]> = [
  [190, 215],
  [530, 215],
  [190, 388],
  [530, 388],
];
const ALLY_POS: ReadonlyArray<[number, number]> = [
  [190, 700],
  [530, 700],
  [190, 873],
  [530, 873],
];


/**
 * 4v4 turn-based battle. The Scene handles ONLY presentation & input; all rules
 * live in BattleSystem (pure TS). Each round: collect a command per living ally,
 * then play back the resolved events with HP tweens and floating numbers.
 */
export class BattleScene extends Phaser.Scene {
  private stageId = '';
  private battle!: BattleSystem;
  private allyCards: MonsterCard[] = [];
  private enemyCards: MonsterCard[] = [];
  private cmdLayer!: Phaser.GameObjects.Container;
  private targetLayer!: Phaser.GameObjects.Container;
  private logText!: Phaser.GameObjects.Text;
  private logLines: string[] = [];

  private pending = new Map<number, BattleCommand>();
  private queue: number[] = [];
  private qPtr = 0;
  private round = 0;

  constructor() {
    super(SCENES.Battle);
  }

  init(data: { stageId: string }): void {
    this.stageId = data.stageId;
  }

  create(): void {
    Card.background(this);
    const stage = getStage(this.stageId);

    // Build combatants.
    const allyMonsters = GameState.team();
    const enemyMonsters = stage.enemies.map((e) => createMonster(e.templateId, e.level));
    this.battle = new BattleSystem(allyMonsters, enemyMonsters);

    this.add.text(GAME_WIDTH / 2, 40, stage.name, { fontSize: '24px', color: TXT.light, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(40, 30, '敵', { fontSize: '20px', color: TXT.danger });
    this.add.text(40, 640, '味方', { fontSize: '20px', color: TXT.accent });

    // Unit cards.
    this.battle.enemies.forEach((u, i) => {
      const [x, y] = ENEMY_POS[i]!;
      this.enemyCards[i] = new MonsterCard(this, x, y, u.monster, { width: CARD_W, height: CARD_H });
    });
    this.battle.allies.forEach((u, i) => {
      const [x, y] = ALLY_POS[i]!;
      this.allyCards[i] = new MonsterCard(this, x, y, u.monster, { width: CARD_W, height: CARD_H });
    });

    // Battle log panel.
    Card.panel(this, GAME_WIDTH / 2, 560, GAME_WIDTH - 60, 130, { fill: COLORS.panelDark, alpha: 0.9, radius: 16 });
    this.logText = this.add.text(60, 505, '', { fontSize: '19px', color: TXT.light, wordWrap: { width: GAME_WIDTH - 120 }, lineSpacing: 4 });

    this.cmdLayer = this.add.container(0, 0).setDepth(20);
    this.targetLayer = this.add.container(0, 0).setDepth(30);

    this.pushLog(`${stage.name} の戦闘開始！`);
    this.startRound();
  }

  // --- Round / command collection -----------------------------------------
  private startRound(): void {
    this.round += 1;
    this.pending.clear();
    this.queue = this.battle.allies.filter((u) => u.alive).map((u) => u.index);
    this.qPtr = 0;
    this.promptNext();
  }

  private promptNext(): void {
    this.clearActorHighlight();
    if (this.qPtr >= this.queue.length) {
      this.resolveRound();
      return;
    }
    const allyIndex = this.queue[this.qPtr]!;
    this.highlightActor(allyIndex);
    this.showCommandUi(allyIndex);
  }

  private highlightActor(index: number): void {
    const card = this.allyCards[index];
    if (card) card.setSelected(true);
  }
  private clearActorHighlight(): void {
    this.allyCards.forEach((c) => c.setSelected(false));
  }

  private showCommandUi(allyIndex: number): void {
    this.cmdLayer.removeAll(true);
    const unit = this.battle.allies[allyIndex]!;
    Card.panel(this, GAME_WIDTH / 2, 1090, GAME_WIDTH - 40, 220, { fill: COLORS.panel, radius: 22 });
    this.cmdLayer.add(
      this.add.text(GAME_WIDTH / 2, 1000, `${unit.monster.name} の行動 （${this.qPtr + 1}/${this.queue.length}）`, { fontSize: '24px', color: TXT.accent }).setOrigin(0.5),
    );

    const y = 1110;
    const atk = new Button(this, 150, y, '攻撃', () => this.onAttack(allyIndex), { width: 200, height: 96, fontSize: 28, fill: COLORS.accent2 });
    const hasSkill = unit.monster.skills.length > 0;
    const skl = new Button(this, 360, y, 'スキル', () => this.onSkill(allyIndex), { width: 200, height: 96, fontSize: 28, fill: COLORS.panelLight, enabled: hasSkill });
    const def = new Button(this, 570, y, '防御', () => this.onDefend(allyIndex), { width: 200, height: 96, fontSize: 28, fill: COLORS.panelLight });
    this.cmdLayer.add([atk, skl, def]);

    if (this.qPtr > 0) {
      const back = new Button(this, GAME_WIDTH / 2, 1190, '◀ 前のモンスターへ', () => this.goBack(), { width: 360, height: 56, fontSize: 20, fill: COLORS.panelDark });
      this.cmdLayer.add(back);
    }
  }

  private onAttack(allyIndex: number): void {
    this.enterTargeting('enemy', (targetIndex) => this.setCommand(allyIndex, { type: 'attack', targetIndex }));
  }

  private onSkill(allyIndex: number): void {
    const unit = this.battle.allies[allyIndex]!;
    const skillId = unit.monster.skills[0]; // MVP: auto-use the first skill
    if (!skillId) {
      this.onAttack(allyIndex);
      return;
    }
    const skill = getSkill(skillId);
    if (skill.targetType === 'singleEnemy') {
      this.enterTargeting('enemy', (targetIndex) => this.setCommand(allyIndex, { type: 'skill', skillId, targetIndex }));
    } else if (skill.targetType === 'singleAlly') {
      this.enterTargeting('ally', (targetIndex) => this.setCommand(allyIndex, { type: 'skill', skillId, targetIndex }));
    } else {
      // allEnemies / allAllies / self — no manual target needed.
      this.setCommand(allyIndex, { type: 'skill', skillId });
    }
  }

  private onDefend(allyIndex: number): void {
    this.setCommand(allyIndex, { type: 'defend' });
  }

  private setCommand(allyIndex: number, cmd: BattleCommand): void {
    this.pending.set(allyIndex, cmd);
    this.qPtr += 1;
    this.promptNext();
  }

  private goBack(): void {
    this.qPtr = Math.max(0, this.qPtr - 1);
    const idx = this.queue[this.qPtr];
    if (idx !== undefined) this.pending.delete(idx);
    this.promptNext();
  }

  // --- Target selection ----------------------------------------------------
  private enterTargeting(side: Side, onPick: (index: number) => void): void {
    this.cmdLayer.removeAll(true);
    this.targetLayer.removeAll(true);

    const units = (side === 'enemy' ? this.battle.enemies : this.battle.allies).filter((u) => u.alive);
    const positions = side === 'enemy' ? ENEMY_POS : ALLY_POS;

    this.targetLayer.add(
      this.add.text(GAME_WIDTH / 2, 1000, side === 'enemy' ? '対象の敵をタップ' : '対象の味方をタップ', { fontSize: '26px', color: TXT.gold }).setOrigin(0.5),
    );

    for (const u of units) {
      const [x, y] = positions[u.index]!;
      const ring = this.add.graphics();
      ring.lineStyle(4, COLORS.gold, 1);
      ring.strokeRoundedRect(x - CARD_W / 2 - 4, y - CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 20);
      this.tweens.add({ targets: ring, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
      const zone = this.add.zone(x, y, CARD_W, CARD_H).setInteractive();
      zone.on('pointerdown', () => {
        this.targetLayer.removeAll(true);
        onPick(u.index);
      });
      this.targetLayer.add([ring, zone]);
    }

    // Cancel back to command.
    const cancel = new Button(this, GAME_WIDTH / 2, 1170, '◀ もどる', () => {
      this.targetLayer.removeAll(true);
      this.promptNext();
    }, { width: 280, height: 60, fontSize: 22, fill: COLORS.panelDark });
    this.targetLayer.add(cancel);
  }

  // --- Resolution & animation ---------------------------------------------
  private resolveRound(): void {
    this.cmdLayer.removeAll(true);
    this.clearActorHighlight();
    const result = this.battle.resolveRound(this.pending);
    this.playEvents(result.events, 0, () => {
      if (result.outcome !== 'ongoing') {
        this.time.delayedCall(500, () => this.endBattle(result.outcome === 'win'));
      } else {
        this.startRound();
      }
    });
  }

  private playEvents(events: BattleEvent[], i: number, done: () => void): void {
    if (i >= events.length) {
      done();
      return;
    }
    const ev = events[i]!;
    this.pushLog(ev.text);
    this.pulseActor(ev.actorSide, ev.actorIndex);
    for (const hit of ev.hits) this.applyHit(hit);
    // Pace events (a touch faster when many hits resolved).
    this.time.delayedCall(720, () => this.playEvents(events, i + 1, done));
  }

  private pulseActor(side: Side, index: number): void {
    const card = side === 'ally' ? this.allyCards[index] : this.enemyCards[index];
    if (!card) return;
    const dir = side === 'ally' ? -1 : 1;
    this.tweens.add({ targets: card, y: card.y + dir * -16, scale: 1.05, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  }

  private applyHit(hit: BattleHit): void {
    const card = hit.side === 'ally' ? this.allyCards[hit.index] : this.enemyCards[hit.index];
    const unit = (hit.side === 'ally' ? this.battle.allies : this.battle.enemies)[hit.index];
    if (!card || !unit) return;
    card.refreshHp(unit.monster);

    if (hit.kind === 'heal') {
      this.floatingText(card.x, card.y - 30, `+${hit.amount}`, TXT.good);
      this.pushLog(`→ ${unit.monster.name} のHPが${hit.amount}回復`);
      return;
    }
    // Damage: flash + shake + floating number colored by effectiveness.
    const color = hit.effectiveness === 'weak' ? '#ff7a3d' : hit.effectiveness === 'resist' ? '#9aa6d6' : '#ffffff';
    this.floatingText(card.x, card.y - 30, `${hit.amount}`, color);
    this.tweens.add({ targets: card, x: card.x + 8, duration: 50, yoyo: true, repeat: 2 });
    const tag = hit.effectiveness === 'weak' ? '（弱点！）' : hit.effectiveness === 'resist' ? '（耐性）' : '';
    this.pushLog(`→ ${unit.monster.name} に ${hit.amount} ダメージ${tag}`);
    if (hit.dead) this.pushLog(`→ ${unit.monster.name} は倒れた！`);
  }

  private floatingText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, { fontSize: '34px', color, fontStyle: 'bold' }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private pushLog(line: string): void {
    this.logLines.push(line);
    if (this.logLines.length > 4) this.logLines.shift();
    this.logText.setText(this.logLines.join('\n'));
  }

  private endBattle(win: boolean): void {
    this.scene.start(SCENES.Result, { stageId: this.stageId, win });
  }
}
