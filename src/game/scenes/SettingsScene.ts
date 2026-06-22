import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, GAME_VERSION, LOGICAL_WIDTH } from '../../app/config.ts';

export class SettingsScene extends BaseScene {
  private from: string = SCENES.Title;
  constructor() {
    super(SCENES.Settings);
  }
  init(data: { from?: string }): void {
    this.from = (data?.from as string) ?? SCENES.Title;
  }
  create(): void {
    this.addBackground();
    this.addHeader('設定', () => this.back());
    const s = app.settings;
    const fm = new FocusManager(this);
    const cx = LOGICAL_WIDTH / 2;
    let y = 150;
    const step = 64;
    const buttons: Button[] = [];
    const row = (make: () => Button) => { const b = make(); buttons.push(b); y += step; return b; };

    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const bgm = row(() => new Button(this, cx, y, `BGM音量: ${pct(s.bgmVolume)}`, () => {
      s.bgmVolume = ((Math.round(s.bgmVolume * 10) + 2) % 12) / 10; if (s.bgmVolume > 1) s.bgmVolume = 0;
      bgm.setText(`BGM音量: ${pct(s.bgmVolume)}`); app.persistSettings();
    }, { width: 520 }));
    const sfx = row(() => new Button(this, cx, y, `効果音音量: ${pct(s.sfxVolume)}`, () => {
      s.sfxVolume = ((Math.round(s.sfxVolume * 10) + 2) % 12) / 10; if (s.sfxVolume > 1) s.sfxVolume = 0;
      sfx.setText(`効果音音量: ${pct(s.sfxVolume)}`); app.persistSettings(); app.audio.play('select');
    }, { width: 520 }));
    const mute = row(() => new Button(this, cx, y, `ミュート: ${s.muted ? 'オン' : 'オフ'}`, () => {
      s.muted = !s.muted; mute.setText(`ミュート: ${s.muted ? 'オン' : 'オフ'}`); app.persistSettings();
    }, { width: 520 }));
    const spd = row(() => new Button(this, cx, y, `戦闘演出速度: ${s.battleSpeed}倍`, () => {
      s.battleSpeed = (s.battleSpeed === 3 ? 1 : ((s.battleSpeed + 1) as 1 | 2 | 3)); spd.setText(`戦闘演出速度: ${s.battleSpeed}倍`); app.persistSettings();
    }, { width: 520 }));
    const fps = row(() => new Button(this, cx, y, `フレームレート: ${s.targetFps}FPS`, () => {
      s.targetFps = s.targetFps === 60 ? 30 : 60; fps.setText(`フレームレート: ${s.targetFps}FPS`); app.persistSettings();
      this.game.loop.targetFps = s.targetFps;
    }, { width: 520 }));
    const low = row(() => new Button(this, cx, y, `軽量演出(省電力): ${s.lowEffects ? 'オン' : 'オフ'}`, () => {
      s.lowEffects = !s.lowEffects; low.setText(`軽量演出(省電力): ${s.lowEffects ? 'オン' : 'オフ'}`); app.persistSettings();
    }, { width: 520 }));
    const dev = row(() => new Button(this, cx, y, `開発者モード: ${s.devMode ? 'オン' : 'オフ'}`, () => {
      s.devMode = !s.devMode; dev.setText(`開発者モード: ${s.devMode ? 'オン' : 'オフ'}`); app.persistSettings();
    }, { width: 520 }));

    fm.set(buttons);
    fm.onCancel = () => this.back();
    this.add.text(20, this.scale.height - 30, `バージョン ${GAME_VERSION}`, { fontSize: '15px', color: COLORS.textDim });
  }
  private back(): void {
    this.scene.start(this.from);
  }
}
