import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, TXT } from '../game/constants';

export interface NavItem {
  key: string;
  label: string;
  onSelect: () => void;
}

/**
 * Bottom navigation bar (modern mobile style). Shows a row of large tappable
 * items; the active one is highlighted.
 */
export class BottomNav extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, y: number, items: NavItem[], activeKey: string) {
    super(scene, 0, y);

    const bar = scene.add.graphics();
    bar.fillStyle(COLORS.panelDark, 0.98);
    bar.fillRect(0, -2, GAME_WIDTH, 120);
    bar.lineStyle(2, COLORS.stroke, 0.8);
    bar.lineBetween(0, 0, GAME_WIDTH, 0);
    this.add(bar);

    const slot = GAME_WIDTH / items.length;
    items.forEach((item, i) => {
      const cx = slot * i + slot / 2;
      const active = item.key === activeKey;
      if (active) {
        const hl = scene.add.graphics();
        hl.fillStyle(COLORS.accent2, 0.25);
        hl.fillRoundedRect(cx - slot / 2 + 12, 14, slot - 24, 86, 16);
        this.add(hl);
      }
      const t = scene.add
        .text(cx, 56, item.label, {
          fontSize: '24px',
          color: active ? TXT.accent : TXT.dim,
          fontStyle: active ? 'bold' : 'normal',
        })
        .setOrigin(0.5);
      // Large invisible hit zone for easy tapping.
      const zone = scene.add
        .zone(cx, 56, slot, 110)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (!active) item.onSelect();
      });
      this.add([t, zone]);
    });

    scene.add.existing(this);
  }
}
