import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';
import { AUTOSAVE_SLOT } from '../../core/save/SaveRepository.ts';
import { exportToJson, importFromJson } from '../../core/save/backup.ts';
import { shareOrDownload, pickTextFile } from '../../app/fileTransfer.ts';
import { GameSession } from '../../core/state/GameSession.ts';
import { Rng } from '../../core/rng.ts';

export class SaveLoadScene extends BaseScene {
  private mode: 'save' | 'load' = 'save';
  constructor() {
    super(SCENES.SaveLoad);
  }
  init(data: { mode?: 'save' | 'load' }): void {
    this.mode = data?.mode ?? 'save';
  }

  create(): void {
    this.addBackground();
    this.addHeader(this.mode === 'save' ? 'セーブ / ロード' : 'ロード', () => this.back());
    void this.render();
  }

  private back(): void {
    this.scene.start(app.session ? SCENES.Town : SCENES.Title);
  }

  private async render(): Promise<void> {
    const infos = await app.slotInfos();
    const infoBySlot = new Map(infos.map((i) => [i.slot, i]));
    const fm = new FocusManager(this);
    const buttons: Button[] = [];
    const cx = LOGICAL_WIDTH / 2;
    let y = 150;

    const slots: { slot: number; label: string }[] = [
      { slot: AUTOSAVE_SLOT, label: 'オート' },
      { slot: 1, label: 'スロット1' },
      { slot: 2, label: 'スロット2' },
      { slot: 3, label: 'スロット3' },
    ];

    for (const { slot, label } of slots) {
      const info = infoBySlot.get(slot);
      const date = info ? new Date(info.savedAt).toLocaleString('ja-JP') : '空き';
      const title = info ? (info.corrupt ? '（破損データ）' : info.title) : '― 空き ―';
      const text = `${label}  ${title}\n${date}`;
      const isAuto = slot === AUTOSAVE_SLOT;
      const canSave = this.mode === 'save' && !isAuto && !!app.session;
      const canLoad = !!info && !info.corrupt;
      const b = new Button(this, cx - 180, y, text, () => {
        if (this.mode === 'save' && canSave) this.doSave(slot);
        else if (canLoad) this.doLoad(slot);
        else this.toast(this.mode === 'save' ? 'オートスロットへは手動保存できません' : 'このスロットは読み込めません');
      }, { width: 700, height: 64, fontSize: 17, enabled: canSave || canLoad });
      buttons.push(b);

      if (info && !info.corrupt) {
        const del = new Button(this, cx + 250, y, '削除', () => this.doDelete(slot), { width: 120, height: 56, fontSize: 16, fill: COLORS.enemy });
        buttons.push(del);
      }
      y += 80;
    }

    // Backup / restore.
    const exportBtn = new Button(this, cx - 180, LOGICAL_HEIGHT - 90, 'バックアップ書き出し', () => this.doExport(), { width: 320, height: 56, enabled: !!app.session });
    const importBtn = new Button(this, cx + 180, LOGICAL_HEIGHT - 90, 'バックアップ復元', () => this.doImport(), { width: 320, height: 56 });
    buttons.push(exportBtn, importBtn);

    fm.set(buttons);
    fm.onCancel = () => this.back();
  }

  private async doSave(slot: number): Promise<void> {
    await app.saveToSlot(slot, 'background');
    this.toast('セーブしました');
    this.scene.restart({ mode: this.mode });
  }

  private async doLoad(slot: number): Promise<void> {
    try {
      const session = await app.loadSlot(slot);
      if (!session) { this.toast('読み込めませんでした'); return; }
      this.scene.start(SCENES.Town);
    } catch (err) {
      this.toast(`ロード失敗: ${(err as Error).message}`);
    }
  }

  private async doDelete(slot: number): Promise<void> {
    await app.save.delete(slot);
    this.toast('削除しました');
    this.scene.restart({ mode: this.mode });
  }

  private async doExport(): Promise<void> {
    if (!app.session) return;
    const json = exportToJson(app.session.state.data);
    await shareOrDownload(`echoes-of-beast-${Date.now()}.json`, json);
    this.toast('バックアップを書き出しました');
  }

  private async doImport(): Promise<void> {
    const text = await pickTextFile();
    if (!text) return;
    try {
      const payload = importFromJson(text);
      app.session = new GameSession(payload, new Rng());
      await app.autosave('background');
      this.toast('復元しました');
      this.scene.start(SCENES.Town);
    } catch (err) {
      this.toast(`復元失敗: ${(err as Error).message}`);
    }
  }
}
