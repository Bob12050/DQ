import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TXT } from '../game/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GameState } from '../game/GameState';
import { getStage } from '../data/stages';
import { addExp, createMonster } from '../systems/ProgressionSystem';

/** Win/lose screen. On victory, applies coins, EXP (with level-ups) and drops. */
export class ResultScene extends Phaser.Scene {
  private stageId = '';
  private win = false;
  private scouted: { templateId: string; level: number }[] = [];

  constructor() {
    super(SCENES.Result);
  }

  init(data: { stageId: string; win: boolean; scouted?: { templateId: string; level: number }[] }): void {
    this.stageId = data.stageId;
    this.win = data.win;
    this.scouted = data.scouted ?? [];
  }

  create(): void {
    Card.background(this);
    const cx = GAME_WIDTH / 2;
    const stage = getStage(this.stageId);

    this.add
      .text(cx, 180, this.win ? 'VICTORY' : 'DEFEAT', {
        fontSize: '76px',
        color: this.win ? TXT.gold : TXT.danger,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const lines: string[] = [];
    if (this.win) {
      // Coins.
      GameState.addCoins(stage.reward.coins);
      lines.push(`🪙 コイン +${stage.reward.coins}`);

      // EXP & level-ups for the persistent team monsters.
      for (const m of GameState.team()) {
        const res = addExp(m, stage.reward.exp);
        if (res.leveledUp) {
          lines.push(`⬆ ${m.name} が Lv${res.fromLevel}→${res.toLevel} に！`);
        }
      }
      lines.push(`✨ 各モンスター EXP +${stage.reward.exp}`);

      // Scouted monsters join the collection (respecting a soft cap).
      for (const s of this.scouted) {
        if (GameState.data.monsters.length >= 30) {
          lines.push('⚠ 手持ちがいっぱいでスカウトを逃がした…');
          break;
        }
        const joined = createMonster(s.templateId, s.level);
        GameState.addMonster(joined);
        lines.push(`🎯 ${joined.name} をスカウトした！`);
      }

      // Drop / new recruit.
      if (stage.reward.dropTemplateId && GameState.data.monsters.length < 30) {
        const dropLevel = Math.max(1, Math.round(stage.reward.exp / 30));
        const recruit = createMonster(stage.reward.dropTemplateId, Math.max(2, dropLevel));
        GameState.addMonster(recruit);
        lines.push(`🎁 ${recruit.name} が仲間になった！`);
      }

      const first = !GameState.isCleared(stage.id);
      GameState.markCleared(stage.id);
      if (first) lines.push('🏅 ステージ初クリア！');
      GameState.save();
    } else {
      lines.push('やられてしまった…');
      lines.push('編成を見直して再挑戦しよう。');
    }

    // Reward panel.
    Card.panel(this, cx, 560, GAME_WIDTH - 80, 460, { fill: COLORS.panel, radius: 24 });
    this.add.text(cx, 360, this.win ? '獲得報酬' : '結果', { fontSize: '30px', color: TXT.accent, fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(cx, 420, lines.join('\n'), { fontSize: '26px', color: TXT.light, align: 'center', lineSpacing: 14, wordWrap: { width: GAME_WIDTH - 140 } })
      .setOrigin(0.5, 0);

    // Actions.
    new Button(this, cx, GAME_HEIGHT - 260, this.win ? '次へ（ステージ）' : 'もう一度（ステージ）', () => this.scene.start(SCENES.StageSelect), {
      width: GAME_WIDTH - 120,
      height: 100,
      fontSize: 30,
      fill: COLORS.accent2,
    });
    new Button(this, cx, GAME_HEIGHT - 140, 'ホームへ', () => this.scene.start(SCENES.Home), {
      width: GAME_WIDTH - 120,
      height: 100,
      fontSize: 30,
      fill: COLORS.panelLight,
    });
  }
}
