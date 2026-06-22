import Phaser from 'phaser';
import { COLORS, ELEMENT_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MonsterCard } from '../ui/MonsterCard';
import { GameState } from '../game/GameState';

/** Build a team of up to 4 by tapping owned monsters. */
export class TeamEditScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private minScroll = 0;
  private readonly viewTop = 470;
  private readonly viewBottom = GAME_HEIGHT - 60;

  constructor() {
    super(SCENES.TeamEdit);
  }

  create(): void {
    Card.background(this);
    this.add.text(40, 70, '編成', { fontSize: '40px', color: TXT.light, fontStyle: 'bold' });
    new Button(this, GAME_WIDTH - 90, 90, '←', () => this.scene.start(SCENES.Home), { width: 90, height: 70, fontSize: 30, fill: COLORS.panelLight });

    this.drawTeamSlots();

    this.add.text(40, 410, `手持ち（タップで入れ替え）`, { fontSize: '22px', color: TXT.accent });

    this.content = this.add.container(0, this.viewTop);
    this.drawOwnedGrid();

    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, this.viewTop, GAME_WIDTH, this.viewBottom - this.viewTop);
    this.content.setMask(maskShape.createGeometryMask());
    this.setupScroll();
  }

  private drawTeamSlots(): void {
    const team = GameState.team();
    this.add.text(40, 150, `編成枠 ${team.length}/4`, { fontSize: '22px', color: TXT.dim });
    const slotW = 158;
    const slotH = 180;
    const gap = 12;
    const totalW = slotW * 4 + gap * 3;
    const startX = (GAME_WIDTH - totalW) / 2 + slotW / 2;
    const y = 290;
    for (let i = 0; i < 4; i++) {
      const x = startX + i * (slotW + gap);
      const g = this.add.graphics();
      const m = team[i];
      Card.drawPanel(g, x - slotW / 2, y - slotH / 2, slotW, slotH, {
        fill: m ? COLORS.panelLight : COLORS.panelDark,
        stroke: m ? COLORS.accent : COLORS.stroke,
        radius: 16,
      });
      if (m) {
        const badge = this.add.graphics();
        badge.fillStyle(ELEMENT_COLORS[m.element], 1);
        badge.fillCircle(x, y - 40, 26);
        this.add.text(x, y - 4, m.name, { fontSize: '18px', color: TXT.light, fontStyle: 'bold', align: 'center', wordWrap: { width: slotW - 16 } }).setOrigin(0.5, 0);
        this.add.text(x, y + 56, `Lv${m.level}`, { fontSize: '17px', color: TXT.dim }).setOrigin(0.5);
        // Tap slot to remove from team.
        const zone = this.add.zone(x, y, slotW, slotH).setInteractive();
        zone.on('pointerdown', () => this.toggle(m.id));
      } else {
        this.add.text(x, y, '空き', { fontSize: '20px', color: TXT.dim }).setOrigin(0.5);
      }
    }
  }

  private drawOwnedGrid(): void {
    const owned = GameState.data.monsters;
    const teamIds = new Set(GameState.data.teamIds);
    const cardW = 330;
    const cardH = 150;
    const gapX = 20;
    const gapY = 18;
    const startX = GAME_WIDTH / 2 - (cardW + gapX) / 2;
    owned.forEach((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gapX);
      const y = row * (cardH + gapY) + cardH / 2 + 10;
      const card = new MonsterCard(this, x, y, m, { width: cardW, height: cardH });
      card.setSelected(teamIds.has(m.id));
      card.makeTappable(() => this.toggle(m.id));
      this.content.add(card);
    });
    const rows = Math.ceil(owned.length / 2);
    const contentH = rows * (cardH + gapY);
    this.minScroll = Math.min(0, this.viewBottom - this.viewTop - contentH);
  }

  private toggle(id: string): void {
    const inTeam = GameState.data.teamIds.includes(id);
    if (!inTeam && GameState.team().length >= 4) {
      this.flash('編成は最大4体です');
      return;
    }
    GameState.toggleTeam(id);
    this.scene.restart();
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

  private flash(text: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 90, text, { fontSize: '22px', color: TXT.danger, backgroundColor: '#000000aa', padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, duration: 500, delay: 1200, onComplete: () => t.destroy() });
  }
}
