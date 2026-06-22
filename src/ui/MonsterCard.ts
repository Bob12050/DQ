import Phaser from 'phaser';
import type { Monster } from '../types/Monster';
import { COLORS, ELEMENT_COLORS, ELEMENT_LABELS, RARITY_COLORS, RARITY_LABELS, TXT } from '../game/constants';
import { HpBar } from './HpBar';
import { Card } from './Card';

export interface MonsterCardOptions {
  width?: number;
  height?: number;
  /** Show attack/defense/etc. (used in the dex). */
  showStats?: boolean;
}

/**
 * Reusable card showing a monster: name, element badge, rarity, level and an
 * HP bar. Used by the dex, team editor and battle field. `hpBar` is exposed so
 * the battle scene can animate damage.
 */
export class MonsterCard extends Phaser.GameObjects.Container {
  readonly hpBar: HpBar;
  private panel: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private boxW: number;
  private boxH: number;
  private selected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, monster: Monster, opts: MonsterCardOptions = {}) {
    super(scene, x, y);
    this.boxW = opts.width ?? 320;
    this.boxH = opts.height ?? 150;
    const w = this.boxW;
    const h = this.boxH;

    this.panel = scene.add.graphics();
    this.drawPanel();

    // Element badge (top-left circle).
    const badge = scene.add.graphics();
    badge.fillStyle(ELEMENT_COLORS[monster.element], 1);
    badge.fillCircle(-w / 2 + 34, -h / 2 + 32, 22);
    const badgeText = scene.add
      .text(-w / 2 + 34, -h / 2 + 32, ELEMENT_LABELS[monster.element], { fontSize: '22px', color: '#10142e', fontStyle: 'bold' })
      .setOrigin(0.5);

    // Rarity tag (top-right).
    const rarity = scene.add
      .text(w / 2 - 18, -h / 2 + 22, RARITY_LABELS[monster.rarity], { fontSize: '20px', color: '#10142e', fontStyle: 'bold' })
      .setOrigin(1, 0.5);
    const rarityBg = scene.add.graphics();
    rarityBg.fillStyle(RARITY_COLORS[monster.rarity], 1);
    rarityBg.fillRoundedRect(w / 2 - 70, -h / 2 + 10, 56, 26, 8);

    this.nameText = scene.add.text(-w / 2 + 70, -h / 2 + 20, monster.name, {
      fontSize: '23px',
      color: TXT.light,
      fontStyle: 'bold',
    });
    const lvText = scene.add.text(-w / 2 + 70, -h / 2 + 52, `Lv ${monster.level}`, {
      fontSize: '19px',
      color: TXT.dim,
    });

    this.hpBar = new HpBar(scene, 0, h / 2 - 38, w - 48, 16);
    this.hpText = scene.add
      .text(0, h / 2 - 16, `HP ${monster.hp}/${monster.maxHp}`, { fontSize: '17px', color: TXT.dim })
      .setOrigin(0.5);

    this.add([this.panel, rarityBg, rarity, badge, badgeText, this.nameText, lvText, this.hpBar, this.hpText]);

    if (opts.showStats) {
      const stats = `攻 ${monster.attack}  防 ${monster.defense}  魔 ${monster.magic}  速 ${monster.speed}`;
      this.add(scene.add.text(-w / 2 + 70, -h / 2 + 80, stats, { fontSize: '17px', color: TXT.dim }));
    }

    this.hpBar.set(monster.hp, monster.maxHp);
    this.setSize(w, h);
    scene.add.existing(this);
  }

  private drawPanel(): void {
    this.panel.clear();
    Card.drawPanel(this.panel, -this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, {
      fill: this.selected ? COLORS.panelLight : COLORS.panel,
      stroke: this.selected ? COLORS.accent : COLORS.stroke,
      radius: 18,
    });
  }

  setSelected(v: boolean): this {
    this.selected = v;
    this.drawPanel();
    return this;
  }

  /** Updates HP readout (and bar) — used in battle. */
  refreshHp(monster: Monster, tween = true): void {
    this.hpText.setText(monster.hp <= 0 ? '戦闘不能' : `HP ${monster.hp}/${monster.maxHp}`);
    if (tween) this.hpBar.tweenTo(monster.hp, monster.maxHp);
    else this.hpBar.set(monster.hp, monster.maxHp);
    if (monster.hp <= 0) this.setAlpha(0.4);
  }

  /** Makes the whole card tappable, returning itself for chaining. */
  makeTappable(onTap: () => void): this {
    this.setSize(this.boxW, this.boxH);
    this.setInteractive(new Phaser.Geom.Rectangle(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', onTap);
    return this;
  }
}
