import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';
import { monsterIcon } from '../ui/MonsterIcon.ts';

export class TownScene extends BaseScene {
  constructor() {
    super(SCENES.Town);
  }

  create(): void {
    this.addBackground();
    this.addHeader('調律師の拠点');
    const session = app.session;
    if (!session) {
      this.scene.start(SCENES.Title);
      return;
    }

    // Rest: full heal when in town.
    session.healAll();

    const bossCleared = session.state.data.bossesDefeated.includes('boss_dirgewarden');

    const focus = new FocusManager(this);
    const col1X = 320;
    const col2X = 760;
    let y = 130;
    const step = 76;
    const mk = (x: number, yy: number, label: string, fn: () => void, enabled = true) =>
      new Button(this, x, yy, label, fn, { width: 360, height: 60, enabled });

    const buttons: Button[] = [
      mk(col1X, y, '🌿 草原を探索する', () => this.goField('meadow')),
      mk(col1X, (y += step), '🕳 洞窟を探索する', () => this.goField('cavern')),
      mk(col1X, (y += step), bossCleared ? '✦ 番人の間（撃破済）' : '👁 番人の間に挑む', () => this.goField('bossroom')),
      mk(col1X, (y += step), '🧬 共鳴融合', () => this.scene.start(SCENES.Fusion)),
      mk(col1X, (y += step), '🛒 道具屋', () => this.scene.start(SCENES.Shop)),
    ];

    let y2 = 130;
    buttons.push(
      mk(col2X, y2, '⚔ パーティ編成', () => this.scene.start(SCENES.Party)),
      mk(col2X, (y2 += step), '📦 保有モンスター', () => this.scene.start(SCENES.Storage)),
      mk(col2X, (y2 += step), '💾 セーブ / ロード', () => this.scene.start(SCENES.SaveLoad, { mode: 'save' })),
      mk(col2X, (y2 += step), '⚙ 設定', () => this.scene.start(SCENES.Settings, { from: SCENES.Town })),
    );
    focus.set(buttons);

    this.drawPartyStrip();
    void app.autosave('area');
  }

  private goField(area: 'meadow' | 'cavern' | 'bossroom'): void {
    app.session!.state.data.area = area === 'bossroom' ? 'bossroom' : area;
    this.scene.start(SCENES.Field, { area });
  }

  private drawPartyStrip(): void {
    const session = app.session!;
    const party = session.state.party();
    const y = LOGICAL_HEIGHT - 80;
    this.add.rectangle(LOGICAL_WIDTH / 2, y, LOGICAL_WIDTH, 130, COLORS.panel, 0.85);
    const startX = 160;
    party.forEach((m, i) => {
      const x = startX + i * 240;
      const def = session.reg.monster(m.speciesId);
      monsterIcon(this, x - 60, y, def, 28);
      const max = session.maxVitals(m.uuid);
      this.add.text(x - 20, y - 30, `${m.nickname}`, { fontSize: '18px', color: COLORS.text });
      this.add.text(x - 20, y - 8, `Lv${m.level}`, { fontSize: '16px', color: COLORS.textDim });
      this.add.text(x - 20, y + 14, `HP ${m.currentHp}/${max.hp}`, { fontSize: '15px', color: '#9fe6b0' });
    });
    this.add.text(LOGICAL_WIDTH - 220, y - 40, `所持金: ${session.state.data.gold}G`, { fontSize: '18px', color: TXT.accent });
    this.add.text(LOGICAL_WIDTH - 220, y - 12, `保有: ${session.state.data.monsters.length}/50`, { fontSize: '16px', color: COLORS.textDim });
  }
}
