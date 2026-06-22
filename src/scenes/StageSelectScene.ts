import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BottomNav } from '../ui/BottomNav';
import { STAGES } from '../data/stages';
import { GameState } from '../game/GameState';

/** Stage list with vertical drag-scroll (scales to many stages). */
export class StageSelectScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private minScroll = 0;
  private readonly viewTop = 200;
  private readonly viewBottom = GAME_HEIGHT - 140;

  constructor() {
    super(SCENES.StageSelect);
  }

  create(): void {
    Card.background(this);
    this.add.text(40, 70, 'ステージ選択', { fontSize: '40px', color: TXT.light, fontStyle: 'bold' });
    new Button(this, GAME_WIDTH - 90, 90, '←', () => this.scene.start(SCENES.Home), { width: 90, height: 70, fontSize: 30, fill: COLORS.panelLight });

    const power = GameState.teamPower();
    this.add.text(40, 140, `あなたの戦力: ${power}`, { fontSize: '22px', color: TXT.accent });

    this.content = this.add.container(0, this.viewTop);
    const cardH = 168;
    const gap = 16;
    STAGES.forEach((stage, i) => {
      const y = i * (cardH + gap) + cardH / 2 + 10;
      this.content.add(this.buildStageCard(stage.id, y, cardH));
    });

    // Mask the content to the scroll viewport.
    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, this.viewTop, GAME_WIDTH, this.viewBottom - this.viewTop);
    this.content.setMask(maskShape.createGeometryMask());

    const contentH = STAGES.length * (cardH + gap);
    this.minScroll = Math.min(0, this.viewBottom - this.viewTop - contentH);
    this.setupScroll();

    new BottomNav(
      this,
      GAME_HEIGHT - 120,
      [
        { key: 'home', label: '🏠 ホーム', onSelect: () => this.scene.start(SCENES.Home) },
        { key: 'stage', label: '⚔ ステージ', onSelect: () => {} },
        { key: 'team', label: '🛡 編成', onSelect: () => this.scene.start(SCENES.TeamEdit) },
        { key: 'dex', label: '📖 図鑑', onSelect: () => this.scene.start(SCENES.MonsterDex) },
      ],
      'stage',
    );
  }

  private buildStageCard(stageId: string, y: number, h: number): Phaser.GameObjects.Container {
    const stage = STAGES.find((s) => s.id === stageId)!;
    const c = this.add.container(GAME_WIDTH / 2, y);
    const w = GAME_WIDTH - 60;
    const cleared = GameState.isCleared(stage.id);

    const g = this.add.graphics();
    Card.drawPanel(g, -w / 2, -h / 2, w, h, { fill: COLORS.panel, stroke: cleared ? COLORS.hp : COLORS.stroke, radius: 20 });
    c.add(g);

    c.add(this.add.text(-w / 2 + 28, -h / 2 + 22, stage.name, { fontSize: '28px', color: TXT.light, fontStyle: 'bold' }));
    c.add(this.add.text(-w / 2 + 28, -h / 2 + 64, stage.description, { fontSize: '18px', color: TXT.dim, wordWrap: { width: w - 200 } }));

    const power = GameState.teamPower();
    const okColor = power >= stage.recommendedPower ? TXT.good : TXT.danger;
    c.add(this.add.text(-w / 2 + 28, h / 2 - 44, `推奨戦力 ${stage.recommendedPower}`, { fontSize: '19px', color: okColor }));
    c.add(this.add.text(-w / 2 + 250, h / 2 - 44, `報酬 🪙${stage.reward.coins} / EXP ${stage.reward.exp}`, { fontSize: '18px', color: TXT.gold }));

    if (cleared) c.add(this.add.text(w / 2 - 28, -h / 2 + 26, '✓ CLEAR', { fontSize: '22px', color: TXT.good, fontStyle: 'bold' }).setOrigin(1, 0));

    // The whole card is a button.
    const btn = new Button(this, w / 2 - 80, h / 2 - 36, '挑戦 ▶', () => this.startStage(stage.id), { width: 130, height: 56, fontSize: 22, fill: COLORS.accent2 });
    c.add(btn);
    return c;
  }

  private startStage(stageId: string): void {
    if (GameState.team().length === 0) {
      this.flashMessage('先に編成でモンスターを入れてください');
      return;
    }
    this.scene.start(SCENES.Battle, { stageId });
  }

  private setupScroll(): void {
    let dragging = false;
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < this.viewTop || p.y > this.viewBottom) return;
      dragging = true;
      lastY = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const dy = p.y - lastY;
      lastY = p.y;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, this.minScroll, 0);
      this.content.y = this.viewTop + this.scrollY;
    });
    this.input.on('pointerup', () => {
      dragging = false;
    });
  }

  private flashMessage(text: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 200, text, { fontSize: '22px', color: TXT.danger, backgroundColor: '#000000aa', padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, duration: 500, delay: 1400, onComplete: () => t.destroy() });
  }
}
