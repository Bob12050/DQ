import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, GAME_TITLE, GAME_VERSION, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';

export class TitleScene extends BaseScene {
  constructor() {
    super(SCENES.Title);
  }

  async create(): Promise<void> {
    this.addBackground();
    const cx = LOGICAL_WIDTH / 2;

    this.add.text(cx, 150, GAME_TITLE, { fontSize: '64px', color: COLORS.text, fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(cx, 215, '― 調律師と魔法生物のものがたり ―', { fontSize: '22px', color: COLORS.textDim })
      .setOrigin(0.5);

    const focus = new FocusManager(this);
    const buttons: Button[] = [];

    const newGame = new Button(this, cx, 320, 'はじめから', () => this.startNewGame(), { width: 320, height: 60 });
    buttons.push(newGame);

    const hasSave = (await app.slotInfos()).some((i) => !i.corrupt);
    const cont = new Button(
      this,
      cx,
      395,
      'つづきから',
      () => this.scene.start(SCENES.SaveLoad, { mode: 'load' }),
      { width: 320, height: 60, enabled: hasSave },
    );
    buttons.push(cont);

    const settings = new Button(this, cx, 470, 'せってい', () => this.scene.start(SCENES.Settings, { from: SCENES.Title }), {
      width: 320,
      height: 60,
    });
    buttons.push(settings);

    focus.set(buttons);

    // PWA / platform footer.
    this.add
      .text(20, LOGICAL_HEIGHT - 30, `v${GAME_VERSION} ${app.pwa.isStandalone ? '(ホーム画面起動)' : '(ブラウザ起動)'}`, {
        fontSize: '16px',
        color: COLORS.textDim,
      });

    if (!app.pwa.isStandalone) {
      this.add
        .text(cx, LOGICAL_HEIGHT - 60, 'iPhone: 共有 → 「ホーム画面に追加」でアプリのように遊べます', {
          fontSize: '16px',
          color: COLORS.textDim,
        })
        .setOrigin(0.5);
    }

    this.refreshPwaBanner();
    app.pwa.onChange(() => this.refreshPwaBanner());
  }

  private pwaBanner?: Button;

  private refreshPwaBanner(): void {
    if (app.pwa.needRefresh && !this.pwaBanner) {
      this.pwaBanner = new Button(
        this,
        LOGICAL_WIDTH - 180,
        LOGICAL_HEIGHT - 40,
        '⟳ 更新があります',
        () => void app.pwa.applyUpdate(),
        { width: 280, height: 44, fontSize: 16, fill: COLORS.accent2 },
      );
    }
    if (app.pwa.offlineReady) {
      this.toast('オフラインで遊べる準備ができました', 2000);
    }
  }

  private startNewGame(): void {
    void (async () => {
      const hasSave = (await app.slotInfos()).some((i) => !i.corrupt);
      if (hasSave) {
        this.confirmOverlay('既存のセーブがあります。新しく始めますか？', () => this.doNewGame());
      } else {
        this.doNewGame();
      }
    })();
  }

  private doNewGame(): void {
    app.newGame();
    void app.autosave('area');
    this.scene.start(SCENES.Town);
  }

  private confirmOverlay(message: string, onYes: () => void): void {
    const c = this.add.container(0, 0).setDepth(3000);
    const dim = this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x000000, 0.7);
    const panel = this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 640, 260, COLORS.panel).setStrokeStyle(2, COLORS.accent2);
    const txt = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 50, message, { fontSize: '22px', color: COLORS.text, align: 'center', wordWrap: { width: 560 } })
      .setOrigin(0.5);
    c.add([dim, panel, txt]);
    const yes = new Button(this, LOGICAL_WIDTH / 2 - 110, LOGICAL_HEIGHT / 2 + 50, 'はい', () => { c.destroy(); onYes(); }, { width: 180 });
    const no = new Button(this, LOGICAL_WIDTH / 2 + 110, LOGICAL_HEIGHT / 2 + 50, 'いいえ', () => c.destroy(), { width: 180 });
    c.add([yes, no]);
    const fm = new FocusManager(this);
    fm.set([yes, no]);
    fm.onCancel = () => c.destroy();
  }
}
