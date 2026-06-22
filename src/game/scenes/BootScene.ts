import Phaser from 'phaser';
import { SCENES } from './keys.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';

/** Validates data and transitions to the Title screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, COLORS.bg);
    try {
      app.validate();
    } catch (err) {
      this.add
        .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, String((err as Error).message), {
          fontSize: '18px',
          color: '#ff8888',
          align: 'center',
          wordWrap: { width: 1000 },
        })
        .setOrigin(0.5);
      return;
    }
    document.getElementById('boot-message')?.remove();
    this.scene.start(SCENES.Title);
  }
}
