import Phaser from 'phaser';
import { COLORS } from '../../app/config.ts';
import type { BattleUnit } from '../../core/battle/BattleUnit.ts';
import { registry } from '../../core/registry/DataRegistry.ts';
import { monsterIcon } from './MonsterIcon.ts';

/** Compact HP/MP/status panel for one combatant, used for both sides. */
export class UnitPanel extends Phaser.GameObjects.Container {
  private hpBar: Phaser.GameObjects.Rectangle;
  private mpBar?: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private selectRing: Phaser.GameObjects.Rectangle;
  private readonly barW: number;
  readonly unit: BattleUnit;

  constructor(scene: Phaser.Scene, x: number, y: number, unit: BattleUnit, opts: { enemy?: boolean; compact?: boolean } = {}) {
    super(scene, x, y);
    this.unit = unit;
    const w = opts.compact ? 250 : 280;
    const h = opts.compact ? 92 : 104;
    this.barW = w - 100;

    const bg = scene.add.rectangle(0, 0, w, h, COLORS.panel, 0.9).setStrokeStyle(2, opts.enemy ? COLORS.enemy : COLORS.accent2);
    this.selectRing = scene.add.rectangle(0, 0, w + 8, h + 8, 0x000000, 0).setStrokeStyle(3, 0xffe66d).setVisible(false);
    const def = registry.monster(unit.def.id);
    const icon = monsterIcon(scene, -w / 2 + 34, 0, def, 26);

    this.nameText = scene.add.text(-w / 2 + 70, -h / 2 + 10, '', { fontSize: '17px', color: COLORS.text, fontStyle: 'bold' });
    this.hpText = scene.add.text(-w / 2 + 70, -h / 2 + 34, '', { fontSize: '14px', color: COLORS.textDim });
    scene.add.rectangle(-w / 2 + 70 + this.barW / 2, h / 2 - 30, this.barW, 12, 0x000000).setOrigin(0.5);
    this.hpBar = scene.add.rectangle(-w / 2 + 70, h / 2 - 36, this.barW, 12, COLORS.hp).setOrigin(0, 0);
    this.mpBar = scene.add.rectangle(-w / 2 + 70, h / 2 - 18, this.barW, 8, COLORS.mp).setOrigin(0, 0);
    this.statusText = scene.add.text(-w / 2 + 70, -h / 2 + 34, '', { fontSize: '13px', color: '#ffd166' });

    this.add([this.selectRing, bg, icon, this.nameText, this.hpText, this.hpBar, this.mpBar, this.statusText]);
    if (opts.enemy) this.mpBar.setVisible(false);
    this.refresh();
    scene.add.existing(this);
  }

  setSelectable(on: boolean, onTap?: () => void): void {
    this.removeInteractive();
    if (on) {
      this.setSize(280, 104);
      this.setInteractive(new Phaser.Geom.Rectangle(-140, -52, 280, 104), Phaser.Geom.Rectangle.Contains);
      if (onTap) this.on('pointerdown', onTap);
      this.selectRing.setVisible(false);
    } else {
      this.off('pointerdown');
    }
  }

  highlight(on: boolean): void {
    this.selectRing.setVisible(on);
  }

  refresh(): void {
    const u = this.unit;
    const max = u.maxHp;
    const ratio = Math.max(0, u.hp / max);
    this.hpBar.width = this.barW * ratio;
    this.hpBar.setFillStyle(ratio < 0.3 ? COLORS.hpLow : COLORS.hp);
    if (this.mpBar) this.mpBar.width = this.barW * Math.max(0, u.mp / Math.max(1, u.maxMp));

    const dead = !u.isAlive;
    this.nameText.setText(`${u.name} Lv${u.level}`).setAlpha(dead ? 0.4 : 1);
    this.hpText.setText(u.recruited ? '共鳴済' : dead ? '戦闘不能' : `HP ${u.hp}/${max}  MP ${u.mp}/${u.maxMp}`);

    const st = u.statuses.map((s) => registry.statusEffect(s.id).name);
    const mods = u.modifiers.length ? '◆' : '';
    this.statusText.setText(st.length ? `${st.join('・')}${mods}` : '');
    this.setAlpha(u.recruited ? 0.3 : 1);
  }
}
