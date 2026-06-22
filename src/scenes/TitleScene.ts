import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GameState } from '../game/GameState';

/** Title screen with logo card and a big START button. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Title);
  }

  create(): void {
    Card.background(this);
    const cx = GAME_WIDTH / 2;

    // Logo card.
    Card.panel(this, cx, 360, 560, 320, { fill: COLORS.panel, alpha: 0.92, radius: 28 });
    this.add
      .text(cx, 290, 'MONSTER', { fontSize: '72px', color: TXT.light, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(cx, 370, 'NEXUS', { fontSize: '84px', color: TXT.accent, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(cx, 450, '〜 響き合う、4対4の絆 〜', { fontSize: '24px', color: TXT.dim })
      .setOrigin(0.5);

    // Floating accent ring animation.
    const ring = this.add.graphics();
    ring.lineStyle(4, COLORS.accent, 0.5);
    ring.strokeCircle(cx, 360, 250);
    this.tweens.add({ targets: ring, alpha: 0.15, scale: 1.04, duration: 1800, yoyo: true, repeat: -1 });
    ring.setPosition(0, 0);

    new Button(this, cx, GAME_HEIGHT - 360, 'START', () => this.scene.start(SCENES.Home), {
      width: 360,
      height: 96,
      fontSize: 34,
      fill: COLORS.accent2,
    });

    this.add
      .text(cx, GAME_HEIGHT - 120, 'タップしてはじめる', { fontSize: '20px', color: TXT.dim })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH - 20, GAME_HEIGHT - 30, 'v0.1.0 (prototype)', { fontSize: '16px', color: TXT.dim })
      .setOrigin(1, 1);

    new Button(this, cx, GAME_HEIGHT - 230, '🗑 データを消して最初から', () => this.confirmReset(), {
      width: 460,
      height: 64,
      fontSize: 22,
      fill: COLORS.panelDark,
      textColor: TXT.dim,
    });
  }

  private confirmReset(): void {
    const overlay = this.add.container(0, 0).setDepth(1000);
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);
    const panel = Card.panel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 560, 320, { fill: COLORS.panel, radius: 24 });
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, 'セーブデータを消して\n最初からはじめますか？', { fontSize: '28px', color: TXT.light, align: 'center', lineSpacing: 10 })
      .setOrigin(0.5);
    overlay.add([dim, panel, msg]);
    const yes = new Button(this, GAME_WIDTH / 2 - 130, GAME_HEIGHT / 2 + 60, 'はい', () => {
      GameState.newGame();
      this.scene.start(SCENES.Home);
    }, { width: 220, height: 84, fill: COLORS.danger });
    const no = new Button(this, GAME_WIDTH / 2 + 130, GAME_HEIGHT / 2 + 60, 'いいえ', () => overlay.destroy(), { width: 220, height: 84, fill: COLORS.panelLight });
    overlay.add([yes, no]);
  }
}
