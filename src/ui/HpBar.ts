import Phaser from 'phaser';
import { COLORS } from '../game/constants';

/** A rounded HP bar that changes color by ratio and can tween between values. */
export class HpBar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private boxW: number;
  private boxH: number;
  private ratio = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height = 14) {
    super(scene, x, y);
    this.boxW = width;
    this.boxH = height;
    this.bg = scene.add.graphics();
    this.fill = scene.add.graphics();
    this.add([this.bg, this.fill]);
    this.drawBg();
    this.set(1, 1);
    scene.add.existing(this);
  }

  private drawBg(): void {
    const g = this.bg;
    g.clear();
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, this.boxH / 2);
  }

  private color(): number {
    if (this.ratio <= 0.25) return COLORS.hpLow;
    if (this.ratio <= 0.5) return COLORS.hpMid;
    return COLORS.hp;
  }

  private render(): void {
    const g = this.fill;
    g.clear();
    const fw = Math.max(0, this.boxW * this.ratio);
    if (fw <= 0) return;
    g.fillStyle(this.color(), 1);
    g.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, fw, this.boxH, this.boxH / 2);
  }

  /** Sets value instantly. */
  set(hp: number, maxHp: number): void {
    this.ratio = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    this.render();
  }

  /** Animates from the current value to a new one. */
  tweenTo(hp: number, maxHp: number, duration = 350): void {
    const target = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    this.scene.tweens.addCounter({
      from: this.ratio,
      to: target,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: (tw) => {
        this.ratio = tw.getValue() ?? 0;
        this.render();
      },
    });
  }
}
