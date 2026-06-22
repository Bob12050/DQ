import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../game/constants';

/**
 * Card / panel helpers. Also hosts the shared gradient background used by every
 * scene so the game looks like a modern mobile title without image assets.
 */
export class Card {
  /** Draws the full-screen vertical gradient background + soft vignette. */
  static background(scene: Phaser.Scene): void {
    const g = scene.add.graphics();
    g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Decorative glow blobs.
    g.fillStyle(COLORS.accent2, 0.1);
    g.fillCircle(GAME_WIDTH * 0.2, GAME_HEIGHT * 0.18, 220);
    g.fillStyle(COLORS.accent, 0.07);
    g.fillCircle(GAME_WIDTH * 0.85, GAME_HEIGHT * 0.7, 260);
  }

  /** Draws a rounded panel into a graphics object (helper for composites). */
  static drawPanel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { fill?: number; alpha?: number; stroke?: number; radius?: number } = {},
  ): void {
    const r = opts.radius ?? 20;
    g.fillStyle(opts.fill ?? COLORS.panel, opts.alpha ?? 0.95);
    g.fillRoundedRect(x, y, w, h, r);
    g.lineStyle(2, opts.stroke ?? COLORS.stroke, 0.9);
    g.strokeRoundedRect(x, y, w, h, r);
  }

  /** Creates a standalone rounded panel game object at (x,y) centered. */
  static panel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { fill?: number; alpha?: number; stroke?: number; radius?: number } = {},
  ): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    Card.drawPanel(g, x - w / 2, y - h / 2, w, h, opts);
    return g;
  }
}
