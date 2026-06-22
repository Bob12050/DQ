import Phaser from 'phaser';
import { COLORS } from '../../app/config.ts';
import { app } from '../../app/GameApp.ts';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  enabled?: boolean;
}

/**
 * A touch- and keyboard-friendly button. Large hit area, no hover dependency,
 * debounced to prevent double-trigger from rapid taps.
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private _enabled: boolean;
  private lastFire = 0;
  focused = false;
  onPress: () => void = () => {};

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onPress: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    const w = opts.width ?? 220;
    const h = opts.height ?? 52;
    this._enabled = opts.enabled ?? true;
    this.bg = scene.add.rectangle(0, 0, w, h, opts.fill ?? COLORS.panelLight).setStrokeStyle(2, COLORS.accent2);
    this.label = scene.add
      .text(0, 0, text, { fontSize: `${opts.fontSize ?? 20}px`, color: COLORS.text, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    this.onPress = onPress;
    this.on('pointerdown', () => this.fire());
    scene.add.existing(this);
    this.refresh();
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setEnabled(v: boolean): this {
    this._enabled = v;
    this.refresh();
    return this;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setFocused(v: boolean): this {
    this.focused = v;
    this.refresh();
    return this;
  }

  fire(): void {
    if (!this._enabled) {
      app.audio.play('cancel');
      return;
    }
    const now = performance.now();
    if (now - this.lastFire < 250) return; // debounce double taps
    this.lastFire = now;
    app.audio.play('confirm');
    this.onPress();
  }

  private refresh(): void {
    this.label.setColor(this._enabled ? COLORS.text : COLORS.textDim);
    this.bg.setFillStyle(this.focused ? COLORS.accent2 : COLORS.panelLight);
    this.bg.setStrokeStyle(this.focused ? 3 : 2, this.focused ? COLORS.accent : COLORS.accent2);
    this.bg.setAlpha(this._enabled ? 1 : 0.55);
  }
}

/**
 * Manages keyboard focus across a set of focusable controls. Arrow keys / WASD
 * move focus; Enter/Space activates; Escape calls the cancel handler. Pointer
 * use updates focus too, so touch and keyboard coexist.
 */
export class FocusManager {
  private items: Button[] = [];
  private index = 0;
  onCancel: () => void = () => {};

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      kb.on('keydown-UP', () => this.move(-1));
      kb.on('keydown-DOWN', () => this.move(1));
      kb.on('keydown-LEFT', () => this.move(-1));
      kb.on('keydown-RIGHT', () => this.move(1));
      kb.on('keydown-W', () => this.move(-1));
      kb.on('keydown-S', () => this.move(1));
      kb.on('keydown-A', () => this.move(-1));
      kb.on('keydown-D', () => this.move(1));
      kb.on('keydown-ENTER', () => this.activate());
      kb.on('keydown-SPACE', () => this.activate());
      kb.on('keydown-ESC', () => this.onCancel());
      kb.on('keydown-BACKSPACE', () => this.onCancel());
    }
  }

  set(items: Button[]): void {
    this.items = items;
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
    items.forEach((b, i) => {
      b.on('pointerover', () => this.focus(i));
      b.on('pointerdown', () => this.focus(i));
    });
    this.render();
  }

  private move(delta: number): void {
    if (this.items.length === 0) return;
    let i = this.index;
    for (let n = 0; n < this.items.length; n++) {
      i = (i + delta + this.items.length) % this.items.length;
      if (this.items[i]!.enabled) break;
    }
    this.focus(i);
    app.audio.play('select');
  }

  private focus(i: number): void {
    this.index = i;
    this.render();
  }

  private activate(): void {
    this.items[this.index]?.fire();
  }

  private render(): void {
    this.items.forEach((b, i) => b.setFocused(i === this.index));
  }
}
