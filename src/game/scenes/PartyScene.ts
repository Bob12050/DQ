import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';

export class PartyScene extends BaseScene {
  constructor() {
    super(SCENES.Party);
  }
  create(): void {
    this.addBackground();
    this.addHeader('パーティ編成', () => this.back());
    this.render();
  }
  private back(): void {
    void app.autosave('party');
    this.scene.start(SCENES.Town);
  }
  private render(): void {
    const session = app.session!;
    const fm = new FocusManager(this);
    const buttons: Button[] = [];

    this.add.text(330, 110, `パーティ (${session.state.party().length}/4)`, { fontSize: '22px', color: TXT.accent }).setOrigin(0.5);
    this.add.text(950, 110, `保有モンスター (${session.state.storage().length})`, { fontSize: '22px', color: TXT.accent }).setOrigin(0.5);

    let y = 160;
    for (const m of session.state.party()) {
      const def = session.reg.monster(m.speciesId);
      const b = new Button(this, 330, y, `${m.nickname} Lv${m.level} (${def.name})`, () => {
        const r = session.party.removeFromParty(m.uuid);
        if (!r.ok) this.toast(r.reason === 'party cannot be empty' ? 'パーティを空にはできません' : '外せません');
        else { app.audio.play('select'); this.refresh(); }
      }, { width: 540, height: 50, fontSize: 18 });
      buttons.push(b);
      y += 64;
    }

    let y2 = 160;
    const storage = session.state.storage();
    for (const m of storage.slice(0, 8)) {
      const def = session.reg.monster(m.speciesId);
      const b = new Button(this, 950, y2, `${m.nickname} Lv${m.level} (${def.name})`, () => {
        const r = session.party.addToParty(m.uuid);
        if (!r.ok) this.toast(r.reason === 'party full' ? 'パーティは満員です' : '追加できません');
        else { app.audio.play('confirm'); this.refresh(); }
      }, { width: 540, height: 50, fontSize: 18 });
      buttons.push(b);
      y2 += 64;
    }
    if (storage.length > 8) {
      this.add.text(950, y2, `…ほか ${storage.length - 8} 体（保有モンスター画面で管理）`, { fontSize: '15px', color: COLORS.textDim }).setOrigin(0.5);
    }

    this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 50, '左: タップで外す　／　右: タップで加える', { fontSize: '16px', color: COLORS.textDim }).setOrigin(0.5);
    fm.set(buttons);
    fm.onCancel = () => this.back();
  }
  private refresh(): void {
    this.scene.restart();
  }
}
