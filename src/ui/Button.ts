import Phaser from 'phaser';
import { COLORS, TXT } from '../game/constants';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
  enabled?: boolean;
}

/**
 * Touch-friendly button: rounded panel + label, large hit area, tap-scale
 * animation, and debounce against accidental double-taps. Works with mouse too.
 */
export class Button extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private boxW: number;
  private boxH: number;
  private fill: number;
  private _enabled: boolean;
  private lastFire = 0;
  onClick: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    this.boxW = opts.width ?? 280;
    this.boxH = opts.height ?? 84;
    this.fill = opts.fill ?? COLORS.accent2;
    this._enabled = opts.enabled ?? true;
    this.onClick = onClick;

    this.gfx = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, {
        fontSize: `${opts.fontSize ?? 26}px`,
        color: opts.textColor ?? TXT.light,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add([this.gfx, this.label]);
    this.redraw();

    this.setSize(this.boxW, this.boxH);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerdown', () => this.press());
    scene.add.existing(this);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  setEnabled(v: boolean): this {
    this._enabled = v;
    this.redraw();
    return this;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  private press(): void {
    if (!this._enabled) return;
    const now = performance.now();
    if (now - this.lastFire < 260) return;
    this.lastFire = now;
    // Tap-scale pulse.
    this.scene.tweens.add({
      targets: this,
      scale: 0.94,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.onClick();
  }

  private redraw(): void {
    const g = this.gfx;
    g.clear();
    const r = Math.min(18, this.boxH / 2);
    const a = this._enabled ? 1 : 0.45;
    // Subtle "raised" look: darker base + lighter top sheen.
    g.fillStyle(0x000000, 0.25 * a);
    g.fillRoundedRect(-this.boxW / 2, -this.boxH / 2 + 4, this.boxW, this.boxH, r);
    g.fillStyle(this.fill, a);
    g.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, r);
    g.fillStyle(COLORS.white, 0.08 * a);
    g.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH * 0.45, r);
    g.lineStyle(2, COLORS.white, 0.18 * a);
    g.strokeRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, r);
    this.label.setAlpha(a);
  }
}
