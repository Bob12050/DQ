import Phaser from 'phaser';
import type { MonsterDefinition } from '../../core/types.ts';

/** Draws a placeholder monster icon: colored disc + glyph. Returns a container. */
export function monsterIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  def: MonsterDefinition,
  radius = 34,
): Phaser.GameObjects.Container {
  const color = Phaser.Display.Color.HexStringToColor(def.sprite.color).color;
  const disc = scene.add.circle(0, 0, radius, color).setStrokeStyle(3, 0xffffff, 0.6);
  const glyph = scene.add.text(0, 0, def.sprite.glyph, { fontSize: `${radius}px` }).setOrigin(0.5);
  return scene.add.container(x, y, [disc, glyph]);
}
