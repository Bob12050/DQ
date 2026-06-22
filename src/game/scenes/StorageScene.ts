import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';

const PAGE = 9;

export class StorageScene extends BaseScene {
  private page = 0;
  constructor() {
    super(SCENES.Storage);
  }
  init(data: { page?: number }): void {
    this.page = data?.page ?? 0;
  }
  create(): void {
    this.addBackground();
    this.addHeader(`保有モンスター (${app.session!.state.data.monsters.length}/50)`, () => this.scene.start(SCENES.Town));
    const session = app.session!;
    const all = session.state.data.monsters;
    const fm = new FocusManager(this);
    const buttons: Button[] = [];
    const start = this.page * PAGE;
    const slice = all.slice(start, start + PAGE);
    const inParty = new Set(session.state.data.partyUuids);

    slice.forEach((m, i) => {
      const def = session.reg.monster(m.speciesId);
      const col = i % 3;
      const rowI = Math.floor(i / 3);
      const x = 280 + col * 360;
      const y = 170 + rowI * 130;
      const tag = inParty.has(m.uuid) ? ' [編成中]' : '';
      const b = new Button(this, x, y, `${m.nickname}${tag}\n${def.name} Lv${m.level}`, () => {
        this.scene.start(SCENES.MonsterDetail, { uuid: m.uuid, from: SCENES.Storage });
      }, { width: 330, height: 100, fontSize: 17 });
      buttons.push(b);
    });

    const pages = Math.max(1, Math.ceil(all.length / PAGE));
    if (this.page > 0) buttons.push(new Button(this, 200, LOGICAL_HEIGHT - 60, '◀ 前', () => this.scene.restart({ page: this.page - 1 }), { width: 150, height: 50 }));
    if (start + PAGE < all.length) buttons.push(new Button(this, LOGICAL_WIDTH - 200, LOGICAL_HEIGHT - 60, '次 ▶', () => this.scene.restart({ page: this.page + 1 }), { width: 150, height: 50 }));
    this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 60, `${this.page + 1} / ${pages}`, { fontSize: '18px', color: COLORS.textDim }).setOrigin(0.5);

    fm.set(buttons);
    fm.onCancel = () => this.scene.start(SCENES.Town);
  }
}
