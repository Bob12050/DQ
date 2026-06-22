import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, LOGICAL_HEIGHT } from '../../app/config.ts';
import { instanceStats } from '../../core/monster/MonsterInstance.ts';
import { monsterIcon } from '../ui/MonsterIcon.ts';
import { TACTICS } from '../../core/data/tactics.ts';
import { ELEMENTS } from '../../core/types.ts';
import type { Element, TacticsId } from '../../core/types.ts';

export class MonsterDetailScene extends BaseScene {
  private uuid = '';
  private from: string = SCENES.Storage;
  constructor() {
    super(SCENES.MonsterDetail);
  }
  init(data: { uuid: string; from?: string }): void {
    this.uuid = data.uuid;
    this.from = (data?.from as string) ?? SCENES.Storage;
  }
  create(): void {
    this.addBackground();
    const session = app.session!;
    const inst = session.state.monster(this.uuid);
    if (!inst) { this.scene.start(this.from); return; }
    const def = session.reg.monster(inst.speciesId);
    this.addHeader(`${inst.nickname}（${def.name}）`, () => this.scene.start(this.from));

    monsterIcon(this, 150, 200, def, 60);
    this.add.text(150, 290, `Lv ${inst.level} / 第${inst.generation}世代`, { fontSize: '18px', color: COLORS.text }).setOrigin(0.5);
    this.add.text(150, 320, `系統:${familyName(def.family)} 属性:${elementName(def.element)}`, { fontSize: '16px', color: COLORS.textDim }).setOrigin(0.5);
    this.add.text(150, 348, `ランク:${def.rank}`, { fontSize: '15px', color: COLORS.textDim }).setOrigin(0.5);

    const stats = instanceStats(session.reg, inst);
    const lines = [
      `HP  ${inst.currentHp}/${stats.hp}`,
      `MP  ${inst.currentMp}/${stats.mp}`,
      `攻撃 ${stats.attack}`,
      `防御 ${stats.defense}`,
      `魔力 ${stats.magic}`,
      `素早 ${stats.agility}`,
    ];
    this.add.text(330, 150, lines.join('\n'), { fontSize: '20px', color: COLORS.text, lineSpacing: 8 });

    // Skills.
    const skillNames = inst.skills.map((s) => session.reg.skill(s).name).join('、');
    this.add.text(560, 150, 'スキル', { fontSize: '18px', color: TXT.accent });
    this.add.text(560, 180, skillNames || '―', { fontSize: '16px', color: COLORS.text, wordWrap: { width: 640 } });

    // Traits.
    const traitNames = def.traits.map((t) => session.reg.trait(t).name).join('、');
    this.add.text(560, 280, '特性', { fontSize: '18px', color: TXT.accent });
    this.add.text(560, 310, traitNames || '―', { fontSize: '16px', color: COLORS.text, wordWrap: { width: 640 } });

    // Element resistances (coarse labels).
    this.add.text(560, 380, '属性耐性', { fontSize: '18px', color: TXT.accent });
    const resistText = ELEMENTS.map((e) => `${elementName(e)}:${resistLabel(def.elementResist[e] ?? 1)}`).join('  ');
    this.add.text(560, 410, resistText, { fontSize: '15px', color: COLORS.text, wordWrap: { width: 660 } });

    // Lineage.
    if (inst.parents.length) {
      const parents = inst.parents.map((p) => p.nickname).join(' × ');
      this.add.text(560, 470, `系譜: ${parents} （配合${inst.fusionCount}回）`, { fontSize: '15px', color: COLORS.textDim });
    }

    if (app.settings.devMode) {
      this.add.text(330, 470, `uuid:${inst.uuid}\nexp:${inst.exp} bonus:${JSON.stringify(inst.fusionBonus)}`, { fontSize: '12px', color: '#88ccff' });
    }

    // Tactics control + party toggle.
    const fm = new FocusManager(this);
    const tacticsBtn = new Button(this, 330, LOGICAL_HEIGHT - 130, `作戦: ${TACTICS[inst.tactics].name}`, () => {
      const ids = Object.keys(TACTICS) as TacticsId[];
      inst.tactics = ids[(ids.indexOf(inst.tactics) + 1) % ids.length]!;
      tacticsBtn.setText(`作戦: ${TACTICS[inst.tactics].name}`);
      this.add.text(330, LOGICAL_HEIGHT - 90, TACTICS[inst.tactics].description, { fontSize: '14px', color: COLORS.textDim }).setOrigin(0.5).setDepth(50);
      void app.autosave('party');
    }, { width: 380, height: 54 });

    const inParty = session.state.data.partyUuids.includes(inst.uuid);
    const partyBtn = new Button(this, 760, LOGICAL_HEIGHT - 130, inParty ? 'パーティから外す' : 'パーティに入れる', () => {
      const r = inParty ? session.party.removeFromParty(inst.uuid) : session.party.addToParty(inst.uuid);
      if (!r.ok) this.toast(r.reason ?? '不可');
      else { void app.autosave('party'); this.scene.restart({ uuid: this.uuid, from: this.from }); }
    }, { width: 360, height: 54 });

    fm.set([tacticsBtn, partyBtn]);
    fm.onCancel = () => this.scene.start(this.from);
  }
}

function familyName(f: string): string {
  return { beast: '獣', spirit: '精霊', plant: '植物', stone: '岩石', phantom: '幻影' }[f] ?? f;
}
function elementName(e: Element): string {
  return { neutral: '無', fire: '火', water: '水', wind: '風', earth: '地', light: '光', shadow: '影' }[e];
}
function resistLabel(mult: number): string {
  if (mult <= 0) return '無効';
  if (mult < 0.85) return '耐';
  if (mult < 1.1) return '−';
  if (mult < 1.4) return '弱';
  return '大弱';
}
