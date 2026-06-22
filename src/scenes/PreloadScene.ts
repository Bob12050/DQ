import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';

/**
 * Asset preloading stage. No image assets yet, but the structure (progress bar
 * + load queue) is in place so future assets can be added in `preload()`.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Preload);
  }

  preload(): void {
    // Future: this.load.image(...), this.load.audio(...), etc.
    // A progress bar is wired up for when real assets exist.
    const barW = 420;
    const x = GAME_WIDTH / 2 - barW / 2;
    const y = GAME_HEIGHT / 2 + 60;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(x, y, barW, 22, 11);
    const bar = this.add.graphics();
    this.load.on('progress', (p: number) => {
      bar.clear();
      bar.fillStyle(COLORS.accent, 1);
      bar.fillRoundedRect(x, y, barW * p, 22, 11);
    });
  }

  create(): void {
    Card.background(this);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'MONSTER NEXUS', {
        fontSize: '46px',
        color: TXT.accent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'Loading...', { fontSize: '22px', color: TXT.dim })
      .setOrigin(0.5);
    // Brief beat so the splash is visible, then to the title.
    this.time.delayedCall(450, () => this.scene.start(SCENES.Title));
  }
}
