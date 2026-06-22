import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, GAME_TITLE, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';

export class ClearScene extends BaseScene {
  constructor() {
    super(SCENES.Clear);
  }
  create(): void {
    this.addBackground();
    const cx = LOGICAL_WIDTH / 2;
    this.add.text(cx, 160, '― クリア ―', { fontSize: '56px', color: TXT.accent, fontStyle: 'bold' }).setOrigin(0.5);
    const session = app.session;
    const time = session ? Math.floor(session.state.data.playtimeSeconds / 60) : 0;
    const lines = [
      '番人「ダージウォーデン」を打ち倒した。',
      '洞窟の奥に渦巻いていた不協和音は鎮まり、',
      'エコービーストたちの声が再び調和を取り戻した。',
      '',
      `仲間にしたモンスター: ${session ? session.state.data.monsters.length : 0} 体`,
      `配合回数: ${session ? session.state.data.fusionHistory.length : 0} 回`,
      `プレイ時間: 約 ${time} 分`,
      '',
      `${GAME_TITLE} を遊んでくれてありがとう！`,
    ];
    this.add.text(cx, 380, lines.join('\n'), { fontSize: '24px', color: COLORS.text, align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    const back = new Button(this, cx, LOGICAL_HEIGHT - 80, 'タイトルへ', () => this.scene.start(SCENES.Title), { width: 300, height: 60 });
    const fm = new FocusManager(this);
    fm.set([back]);
    app.audio.unlock();
    app.audio.play('victory');
  }
}
