import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BottomNav } from '../ui/BottomNav';
import { GameState } from '../game/GameState';

/** Player hub: profile summary, main actions, bottom navigation. */
export class HomeScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Home);
  }

  create(): void {
    Card.background(this);
    const cx = GAME_WIDTH / 2;
    const d = GameState.data;

    // Header / profile card.
    Card.panel(this, cx, 150, GAME_WIDTH - 60, 200, { fill: COLORS.panel, radius: 24 });
    this.add.text(60, 90, d.name, { fontSize: '34px', color: TXT.light, fontStyle: 'bold' });
    this.add.text(60, 138, `ランク ${d.rank}`, { fontSize: '22px', color: TXT.dim });
    this.add.text(60, 178, `クリア済 ${d.clearedStageIds.length} ステージ`, { fontSize: '20px', color: TXT.dim });

    // Coins pill.
    const coinG = this.add.graphics();
    coinG.fillStyle(COLORS.panelDark, 1);
    coinG.fillRoundedRect(GAME_WIDTH - 250, 110, 200, 56, 28);
    this.add.text(GAME_WIDTH - 230, 138, '🪙', { fontSize: '26px' }).setOrigin(0, 0.5);
    this.add
      .text(GAME_WIDTH - 70, 138, `${d.coins}`, { fontSize: '28px', color: TXT.gold, fontStyle: 'bold' })
      .setOrigin(1, 0.5);

    // Main action buttons.
    new Button(this, cx, 420, '⚔  ステージ', () => this.scene.start(SCENES.StageSelect), {
      width: GAME_WIDTH - 90,
      height: 110,
      fontSize: 32,
      fill: COLORS.accent2,
    });
    new Button(this, cx, 560, '🛡  編成', () => this.scene.start(SCENES.TeamEdit), {
      width: GAME_WIDTH - 90,
      height: 110,
      fontSize: 32,
      fill: COLORS.panelLight,
    });
    new Button(this, cx, 700, '📖  モンスター図鑑', () => this.scene.start(SCENES.MonsterDex), {
      width: GAME_WIDTH - 90,
      height: 110,
      fontSize: 32,
      fill: COLORS.panelLight,
    });

    // Team power hint.
    this.add
      .text(cx, 860, `編成中の戦力: ${GameState.teamPower()}`, { fontSize: '24px', color: TXT.accent })
      .setOrigin(0.5);
    this.add
      .text(cx, 900, `手持ち ${d.monsters.length} 体 / 編成 ${GameState.team().length}/4`, {
        fontSize: '20px',
        color: TXT.dim,
      })
      .setOrigin(0.5);

    this.addBottomNav();
  }

  private addBottomNav(): void {
    new BottomNav(
      this,
      GAME_HEIGHT - 120,
      [
        { key: 'home', label: '🏠 ホーム', onSelect: () => {} },
        { key: 'stage', label: '⚔ ステージ', onSelect: () => this.scene.start(SCENES.StageSelect) },
        { key: 'team', label: '🛡 編成', onSelect: () => this.scene.start(SCENES.TeamEdit) },
        { key: 'dex', label: '📖 図鑑', onSelect: () => this.scene.start(SCENES.MonsterDex) },
      ],
      'home',
    );
  }
}
