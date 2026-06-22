import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';
import type { MonsterInstance } from '../../core/monster/MonsterInstance.ts';
import type { FusionPreview } from '../../core/services/FusionService.ts';

type Step = 'pickA' | 'pickB' | 'preview';

export class FusionScene extends BaseScene {
  private step: Step = 'pickA';
  private a?: MonsterInstance;
  private b?: MonsterInstance;
  private chosen = new Set<string>();
  private page = 0;

  constructor() {
    super(SCENES.Fusion);
  }

  create(): void {
    this.step = 'pickA';
    this.a = undefined;
    this.b = undefined;
    this.chosen.clear();
    this.render();
  }

  private render(): void {
    this.children.removeAll();
    this.addBackground();
    if (this.step === 'preview') this.renderPreview();
    else this.renderPicker();
  }

  private renderPicker(): void {
    const isA = this.step === 'pickA';
    this.addHeader(isA ? '配合する1体目を選ぶ' : '配合する2体目を選ぶ', () => {
      if (isA) this.scene.start(SCENES.Town);
      else { this.step = 'pickA'; this.page = 0; this.render(); }
    });
    const session = app.session!;
    if (session.state.data.monsters.length <= 2) {
      this.add.text(LOGICAL_WIDTH / 2, 300, 'モンスターが少なすぎて配合できません（最低3体必要）。', { fontSize: '20px', color: TXT.danger }).setOrigin(0.5);
      return;
    }
    const pool = session.state.data.monsters.filter((m) => !this.a || m.uuid !== this.a.uuid);
    const inParty = new Set(session.state.data.partyUuids);
    const fm = new FocusManager(this);
    const buttons: Button[] = [];
    const PER = 9;
    const slice = pool.slice(this.page * PER, this.page * PER + PER);
    slice.forEach((m, i) => {
      const def = session.reg.monster(m.speciesId);
      const x = 280 + (i % 3) * 360;
      const y = 170 + Math.floor(i / 3) * 120;
      const tag = inParty.has(m.uuid) ? ' [編成]' : '';
      const b = new Button(this, x, y, `${m.nickname}${tag}\n${def.name} Lv${m.level}`, () => {
        if (isA) { this.a = m; this.step = 'pickB'; this.page = 0; }
        else { this.b = m; this.step = 'preview'; }
        this.render();
      }, { width: 330, height: 96, fontSize: 16 });
      buttons.push(b);
    });
    if (this.page > 0) buttons.push(new Button(this, 200, LOGICAL_HEIGHT - 60, '◀ 前', () => { this.page--; this.render(); }, { width: 140, height: 50 }));
    if ((this.page + 1) * PER < pool.length) buttons.push(new Button(this, LOGICAL_WIDTH - 200, LOGICAL_HEIGHT - 60, '次 ▶', () => { this.page++; this.render(); }, { width: 140, height: 50 }));
    fm.set(buttons);
  }

  private renderPreview(): void {
    const session = app.session!;
    const a = this.a!;
    const b = this.b!;
    let preview: FusionPreview;
    try {
      preview = session.fusion.preview(a, b);
    } catch (err) {
      this.toast((err as Error).message);
      this.step = 'pickA';
      this.render();
      return;
    }
    const childDef = session.reg.monster(preview.resultSpeciesId);
    this.addHeader('配合の結果', () => { this.step = 'pickB'; this.render(); });

    this.add.text(LOGICAL_WIDTH / 2, 120, `${a.nickname} ＋ ${b.nickname}`, { fontSize: '24px', color: COLORS.text }).setOrigin(0.5);
    this.add.text(LOGICAL_WIDTH / 2, 160, '↓', { fontSize: '28px', color: TXT.accent }).setOrigin(0.5);
    this.add.text(LOGICAL_WIDTH / 2, 200, `${childDef.name}（第${preview.generation}世代・Lv1）`, { fontSize: '28px', color: TXT.accent, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(LOGICAL_WIDTH / 2, 236, preview.fixedRecipe ? '※ 固定レシピ' : '※ 系統配合', { fontSize: '16px', color: COLORS.textDim }).setOrigin(0.5);

    const inParty = new Set(session.state.data.partyUuids);
    if (inParty.has(a.uuid) || inParty.has(b.uuid)) {
      this.add.text(LOGICAL_WIDTH / 2, 264, '⚠ 編成中のモンスターが含まれています', { fontSize: '16px', color: TXT.danger }).setOrigin(0.5);
    }

    // Inheritance selection.
    this.add.text(LOGICAL_WIDTH / 2, 300, `継承するスキルを選ぶ（最大${preview.maxInherit}）`, { fontSize: '18px', color: COLORS.text }).setOrigin(0.5);
    const fm = new FocusManager(this);
    const buttons: Button[] = [];
    let y = 340;
    for (const skillId of preview.inheritableSkills.slice(0, 8)) {
      const sk = session.reg.skill(skillId);
      const b2 = new Button(this, LOGICAL_WIDTH / 2, y, this.skillLabel(skillId, sk.name), () => {
        if (this.chosen.has(skillId)) this.chosen.delete(skillId);
        else {
          if (this.chosen.size >= preview.maxInherit) { this.toast(`継承は${preview.maxInherit}個までです`); return; }
          this.chosen.add(skillId);
        }
        b2.setText(this.skillLabel(skillId, sk.name));
      }, { width: 520, height: 46, fontSize: 17 });
      buttons.push(b2);
      y += 54;
    }
    if (preview.inheritableSkills.length === 0) {
      this.add.text(LOGICAL_WIDTH / 2, y, '継承できるスキルはありません。', { fontSize: '16px', color: COLORS.textDim }).setOrigin(0.5);
    }

    this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 150, `固有スキル: ${preview.innateSkills.map((s) => session.reg.skill(s).name).join('、')}`, { fontSize: '15px', color: COLORS.textDim }).setOrigin(0.5);

    const confirm = new Button(this, LOGICAL_WIDTH / 2 - 170, LOGICAL_HEIGHT - 80, '配合する', () => this.doFuse(), { width: 300, height: 56 });
    const cancel = new Button(this, LOGICAL_WIDTH / 2 + 170, LOGICAL_HEIGHT - 80, 'やめる', () => { this.step = 'pickB'; this.chosen.clear(); this.render(); }, { width: 300, height: 56 });
    buttons.push(confirm, cancel);
    fm.set(buttons);
  }

  private skillLabel(id: string, name: string): string {
    return `${this.chosen.has(id) ? '☑' : '☐'} ${name}`;
  }

  private doFuse(): void {
    const session = app.session!;
    try {
      const child = session.executeFusion(this.a!.uuid, this.b!.uuid, [...this.chosen]);
      void app.autosave('fusion');
      app.audio.play('recruit');
      this.confirmResult(child.nickname);
    } catch (err) {
      this.toast((err as Error).message);
    }
  }

  private confirmResult(name: string): void {
    this.children.removeAll();
    this.addBackground();
    this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 40, `${name} が誕生した！`, { fontSize: '34px', color: TXT.accent, fontStyle: 'bold' }).setOrigin(0.5);
    const fm = new FocusManager(this);
    const ok = new Button(this, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 60, '拠点へ戻る', () => this.scene.start(SCENES.Town), { width: 300, height: 60 });
    fm.set([ok]);
  }
}
