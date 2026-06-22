import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';
import type { ApplyBattleSummary } from '../../core/state/GameSession.ts';

interface ResultInit {
  summary: ApplyBattleSummary;
  returnScene: string;
  returnArea: string;
}

export class ResultScene extends BaseScene {
  private data_!: ResultInit;
  constructor() {
    super(SCENES.Result);
  }
  init(data: ResultInit): void {
    this.data_ = data;
  }
  create(): void {
    this.addBackground();
    const cx = LOGICAL_WIDTH / 2;
    this.add.text(cx, 70, '戦闘に勝利した！', { fontSize: '40px', color: TXT.accent, fontStyle: 'bold' }).setOrigin(0.5);

    let y = 150;
    const { levelUps, recruited } = this.data_.summary;
    if (levelUps.length === 0 && recruited.length === 0) {
      this.add.text(cx, y, '経験値を獲得した。', { fontSize: '22px', color: COLORS.text }).setOrigin(0.5);
      y += 40;
    }
    for (const lv of levelUps) {
      this.add.text(cx, y, `${lv.nickname} は Lv${lv.fromLevel} → Lv${lv.toLevel} になった！`, { fontSize: '22px', color: COLORS.text }).setOrigin(0.5);
      y += 34;
      if (lv.learnedSkills.length) {
        const names = lv.learnedSkills.map((s) => app.session!.reg.skill(s).name).join('・');
        this.add.text(cx, y, `　新しいスキル: ${names}`, { fontSize: '18px', color: '#9fe6b0' }).setOrigin(0.5);
        y += 30;
      }
    }
    for (const r of recruited) {
      const text = r.accepted ? `${r.nickname} が共鳴し、仲間になった！` : `${r.nickname} を仲間にしたが、保有上限で逃がした…`;
      this.add.text(cx, y, text, { fontSize: '22px', color: r.accepted ? TXT.gold : TXT.danger }).setOrigin(0.5);
      y += 34;
    }

    const cont = new Button(this, cx - 170, LOGICAL_HEIGHT - 90, '探索に戻る', () => {
      this.scene.start(this.data_.returnScene, { area: this.data_.returnArea });
    }, { width: 300, height: 60 });
    const toTown = new Button(this, cx + 170, LOGICAL_HEIGHT - 90, '拠点へ戻る', () => this.scene.start(SCENES.Town), { width: 300, height: 60 });
    const fm = new FocusManager(this);
    fm.set([cont, toTown]);
  }
}
