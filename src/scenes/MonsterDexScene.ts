import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BottomNav } from '../ui/BottomNav';
import { MonsterCard } from '../ui/MonsterCard';
import { GameState } from '../game/GameState';

/** Scrollable list of owned monsters with full stats. */
export class MonsterDexScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private minScroll = 0;
  private readonly viewTop = 180;
  private readonly viewBottom = GAME_HEIGHT - 140;

  constructor() {
    super(SCENES.MonsterDex);
  }

  create(): void {
    Card.background(this);
    this.add.text(40, 70, 'モンスター図鑑', { fontSize: '40px', color: TXT.light, fontStyle: 'bold' });
    new Button(this, GAME_WIDTH - 90, 90, '←', () => this.scene.start(SCENES.Home), { width: 90, height: 70, fontSize: 30, fill: COLORS.panelLight });

    this.content = this.add.container(0, this.viewTop);
    const owned = GameState.data.monsters;
    const cardW = GAME_WIDTH - 60;
    const cardH = 180;
    const gap = 18;
    owned.forEach((m, i) => {
      const y = i * (cardH + gap) + cardH / 2 + 6;
      const card = new MonsterCard(this, GAME_WIDTH / 2, y, m, { width: cardW, height: cardH, showStats: true });
      this.content.add(card);
    });

    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, this.viewTop, GAME_WIDTH, this.viewBottom - this.viewTop);
    this.content.setMask(maskShape.createGeometryMask());

    const contentH = owned.length * (cardH + gap);
    this.minScroll = Math.min(0, this.viewBottom - this.viewTop - contentH);
    this.setupScroll();

    new BottomNav(
      this,
      GAME_HEIGHT - 120,
      [
        { key: 'home', label: '🏠 ホーム', onSelect: () => this.scene.start(SCENES.Home) },
        { key: 'stage', label: '⚔ ステージ', onSelect: () => this.scene.start(SCENES.StageSelect) },
        { key: 'team', label: '🛡 編成', onSelect: () => this.scene.start(SCENES.TeamEdit) },
        { key: 'dex', label: '📖 図鑑', onSelect: () => {} },
      ],
      'dex',
    );
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
      if (this.minScroll >= 0) return; // content fits: don't hijack taps
      const dy = p.y - lastY;
      lastY = p.y;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, this.minScroll, 0);
      this.content.y = this.viewTop + this.scrollY;
    });
    this.input.on('pointerup', () => {
      dragging = false;
    });
  }
}
