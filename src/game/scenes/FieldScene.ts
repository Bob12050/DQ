import Phaser from 'phaser';
import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';

type Area = 'meadow' | 'cavern' | 'bossroom';

const AREA_INFO: Record<Area, { name: string; color: number; encounterArea?: string }> = {
  meadow: { name: '草原', color: 0x24411f, encounterArea: 'meadow' },
  cavern: { name: '洞窟', color: 0x1c1830, encounterArea: 'cavern' },
  bossroom: { name: '番人の間', color: 0x2a1320 },
};

/**
 * Lightweight exploration: tap (or arrow-keys) to move the avatar around the
 * field; each move can trigger an encounter from the area table. A virtual
 * "探索を進める" button is always available for pure-tap play.
 */
export class FieldScene extends BaseScene {
  private area: Area = 'meadow';
  private avatar!: Phaser.GameObjects.Arc;
  private moving = false;
  private steps = 0;

  constructor() {
    super(SCENES.Field);
  }

  init(data: { area: Area }): void {
    this.area = data.area ?? 'meadow';
  }

  create(): void {
    const info = AREA_INFO[this.area];
    this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, info.color);
    this.addHeaderLocal(info.name);

    if (this.area === 'bossroom') {
      this.setupBossRoom();
      return;
    }

    // Field play area.
    this.avatar = this.add.circle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 20, COLORS.accent).setStrokeStyle(3, 0xffffff);
    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 130, 'タップで移動・探索。モンスターと遭遇することがある。', {
        fontSize: '18px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 90 || p.y > LOGICAL_HEIGHT - 100) return; // ignore header/footer taps
      this.moveTo(p.x, p.y);
    });
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.nudge(-120, 0));
    kb?.on('keydown-RIGHT', () => this.nudge(120, 0));
    kb?.on('keydown-UP', () => this.nudge(0, -120));
    kb?.on('keydown-DOWN', () => this.nudge(0, 120));
    kb?.on('keydown-SPACE', () => this.explore());

    new Button(this, LOGICAL_WIDTH - 180, LOGICAL_HEIGHT - 60, '探索を進める', () => this.explore(), { width: 280, height: 56 });
  }

  private addHeaderLocal(name: string): void {
    this.add.rectangle(LOGICAL_WIDTH / 2, 38, LOGICAL_WIDTH, 76, COLORS.panel).setDepth(5);
    this.add.text(LOGICAL_WIDTH / 2, 38, `${name}を探索中`, { fontSize: '28px', color: COLORS.text, fontStyle: 'bold' }).setOrigin(0.5).setDepth(6);
    const back = new Button(this, 110, 38, '◀ 拠点へ', () => this.scene.start(SCENES.Town), { width: 170, height: 50, fontSize: 18 });
    back.setDepth(6);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENES.Town));
  }

  private nudge(dx: number, dy: number): void {
    if (!this.avatar) return;
    this.moveTo(
      Phaser.Math.Clamp(this.avatar.x + dx, 60, LOGICAL_WIDTH - 60),
      Phaser.Math.Clamp(this.avatar.y + dy, 110, LOGICAL_HEIGHT - 120),
    );
  }

  private moveTo(x: number, y: number): void {
    if (this.moving) return;
    this.moving = true;
    const dist = Phaser.Math.Distance.Between(this.avatar.x, this.avatar.y, x, y);
    this.tweens.add({
      targets: this.avatar,
      x,
      y,
      duration: Math.min(600, dist * 1.4),
      onComplete: () => {
        this.moving = false;
        this.steps++;
        this.maybeEncounter();
      },
    });
  }

  private explore(): void {
    if (this.moving) return;
    this.steps++;
    this.maybeEncounter(true);
  }

  private maybeEncounter(force = false): void {
    const chance = force ? 0.7 : 0.45;
    if (!app.session!.rng.chance(chance)) {
      if (force) this.toast('…なにもいなかった');
      return;
    }
    this.startEncounter();
  }

  private startEncounter(): void {
    const session = app.session!;
    const enc = session.reg.encounter(AREA_INFO[this.area].encounterArea!);
    const total = enc.parties.reduce((s, p) => s + p.weight, 0);
    let roll = session.rng.float(0, total);
    let partyId = enc.parties[0]!.partyId;
    for (const p of enc.parties) {
      roll -= p.weight;
      if (roll <= 0) {
        partyId = p.partyId;
        break;
      }
    }
    this.scene.start(SCENES.Battle, { partyId, returnScene: SCENES.Field, returnArea: this.area });
  }

  private setupBossRoom(): void {
    const cleared = app.session!.state.data.bossesDefeated.includes('boss_dirgewarden');
    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 80, cleared ? '番人はもういない。静寂が満ちている。' : 'おぞましい気配が満ちている…', {
        fontSize: '24px',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);
    if (!cleared) {
      new Button(this, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 30, '番人に挑む', () =>
        this.scene.start(SCENES.Battle, { partyId: 'boss_dirgewarden', returnScene: SCENES.Field, returnArea: 'bossroom' }),
        { width: 300, height: 64 },
      );
    }
    new Button(this, 110, 38, '◀ 拠点へ', () => this.scene.start(SCENES.Town), { width: 170, height: 50, fontSize: 18 }).setDepth(6);
  }
}
