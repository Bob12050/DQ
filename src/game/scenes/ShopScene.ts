import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, LOGICAL_WIDTH } from '../../app/config.ts';

export class ShopScene extends BaseScene {
  private goldText!: Phaser.GameObjects.Text;
  constructor() {
    super(SCENES.Shop);
  }
  create(): void {
    this.addBackground();
    this.addHeader('道具屋', () => this.back());
    const session = app.session!;
    this.goldText = this.add.text(LOGICAL_WIDTH - 260, 90, '', { fontSize: '22px', color: TXT.accent });
    this.updateGold();

    const fm = new FocusManager(this);
    const buttons: Button[] = [];
    let y = 150;
    for (const item of Object.values(session.reg.items)) {
      const owned = session.inventory.count(item.id);
      const b = new Button(this, LOGICAL_WIDTH / 2, y, `${item.name}  ${item.price}G  (所持 ${owned})`, () => {
        if (session.inventory.buy(item.id, 1)) {
          this.updateGold();
          b.setText(`${item.name}  ${item.price}G  (所持 ${session.inventory.count(item.id)})`);
          app.audio.play('confirm');
        } else {
          this.toast('所持金が足りません');
        }
      }, { width: 640, height: 52, fontSize: 18 });
      this.add.text(LOGICAL_WIDTH / 2 - 300, y + 28, item.description, { fontSize: '13px', color: COLORS.textDim }).setOrigin(0, 0.5).setDepth(1);
      buttons.push(b);
      y += 78;
    }
    fm.set(buttons);
    fm.onCancel = () => this.back();
  }
  private updateGold(): void {
    this.goldText.setText(`所持金: ${app.session!.state.data.gold}G`);
  }
  private back(): void {
    void app.autosave('shop');
    this.scene.start(SCENES.Town);
  }
}
