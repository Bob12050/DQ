import Phaser from 'phaser';
import { COLORS, GAME_TITLE, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';
import { app } from '../../app/GameApp.ts';
import { Button } from './widgets.ts';

/**
 * Shared scene base: deep background, portrait-rotation guidance, safe-area
 * aware header, and audio unlock on first interaction.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected rotateOverlay?: Phaser.GameObjects.Container;

  protected addBackground(): void {
    this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, COLORS.bg);
    this.unlockAudioOnInput();
    this.setupOrientationGuard();
  }

  private unlockAudioOnInput(): void {
    const unlock = () => app.audio.unlock();
    this.input.once('pointerdown', unlock);
    this.input.keyboard?.once('keydown', unlock);
  }

  /** Header bar with a title and an optional back button. */
  protected addHeader(title: string, onBack?: () => void): void {
    this.add.rectangle(LOGICAL_WIDTH / 2, 38, LOGICAL_WIDTH, 76, COLORS.panel).setDepth(5);
    this.add
      .text(LOGICAL_WIDTH / 2, 38, title, { fontSize: '30px', color: COLORS.text, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(6);
    if (onBack) {
      const back = new Button(this, 90, 38, '◀ もどる', onBack, { width: 150, height: 50, fontSize: 18 });
      back.setDepth(6);
      this.input.keyboard?.on('keydown-ESC', onBack);
      this.input.keyboard?.on('keydown-BACKSPACE', onBack);
    }
  }

  /** Shows a rotate-to-landscape overlay when the device is in portrait. */
  private setupOrientationGuard(): void {
    const update = () => {
      const portrait = this.scale.height > this.scale.width;
      if (portrait && !this.rotateOverlay) this.showRotateOverlay();
      else if (!portrait && this.rotateOverlay) {
        this.rotateOverlay.destroy();
        this.rotateOverlay = undefined;
      }
    };
    this.scale.on('resize', update);
    update();
  }

  private showRotateOverlay(): void {
    const c = this.add.container(0, 0).setDepth(1000);
    const bg = this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.9);
    const t1 = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 30, '📱 横向きにしてください', {
        fontSize: '40px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const t2 = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 40, `${GAME_TITLE} は横画面でお楽しみいただけます`, {
        fontSize: '22px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);
    c.add([bg, t1, t2]);
    this.rotateOverlay = c;
  }

  /** Brief toast message at the bottom-center of the screen. */
  protected toast(message: string, ms = 1600): void {
    const y = LOGICAL_HEIGHT - 70;
    const box = this.add.container(LOGICAL_WIDTH / 2, y).setDepth(2000);
    const bg = this.add.rectangle(0, 0, Math.min(900, message.length * 18 + 80), 50, COLORS.panel, 0.95).setStrokeStyle(2, COLORS.accent2);
    const txt = this.add.text(0, 0, message, { fontSize: '20px', color: COLORS.text }).setOrigin(0.5);
    box.add([bg, txt]);
    this.tweens.add({ targets: box, alpha: 0, duration: 400, delay: ms, onComplete: () => box.destroy() });
  }
}
