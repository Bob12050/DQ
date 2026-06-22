import Phaser from 'phaser';
import { SCENES } from './keys.ts';
import { BaseScene } from '../ui/BaseScene.ts';
import { Button, FocusManager } from '../ui/widgets.ts';
import { UnitPanel } from '../ui/UnitPanel.ts';
import { app } from '../../app/GameApp.ts';
import { COLORS, TXT, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../app/config.ts';
import { BattleController } from '../../core/battle/BattleController.ts';
import type { BattleUnit } from '../../core/battle/BattleUnit.ts';
import type { BattleCommand } from '../../core/battle/types.ts';
import { TargetResolver } from '../../core/battle/TargetResolver.ts';
import { TACTICS } from '../../core/data/tactics.ts';
import type { TacticsId, TargetRule } from '../../core/types.ts';

interface BattleInit {
  partyId: string;
  returnScene: string;
  returnArea: string;
}

export class BattleScene extends BaseScene {
  private ctrl!: BattleController;
  private init_!: BattleInit;
  private panels = new Map<string, UnitPanel>();
  private pending = new Map<string, BattleCommand>();
  private manualQueue: BattleUnit[] = [];
  private cursor = 0;
  private uiLayer!: Phaser.GameObjects.Container;
  private logText!: Phaser.GameObjects.Text;
  private logLines: string[] = [];
  private enemyPartyName = '';

  constructor() {
    super(SCENES.Battle);
  }

  init(data: BattleInit): void {
    this.init_ = data;
  }

  create(): void {
    this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, COLORS.bg);
    this.unlockAudio();

    const session = app.session!;
    const party = session.state.party();
    const enemyParty = session.reg.enemyParty(this.init_.partyId);
    this.enemyPartyName = enemyParty.name;
    this.ctrl = BattleController.create(session.reg, party, enemyParty, session.rng);

    this.layoutPanels();
    this.buildLogArea();
    this.uiLayer = this.add.container(0, 0).setDepth(20);

    this.refreshAllPanels();
    this.flushLog(0);
    this.startCommandPhase();
  }

  private unlockAudio(): void {
    this.input.once('pointerdown', () => app.audio.unlock());
    this.input.keyboard?.once('keydown', () => app.audio.unlock());
  }

  // --- Layout ---------------------------------------------------------------
  private layoutPanels(): void {
    const enemies = this.ctrl.state.enemy.units;
    const allies = this.ctrl.state.player.units;
    const spacing = 300;
    const startXE = LOGICAL_WIDTH / 2 - ((enemies.length - 1) * spacing) / 2;
    enemies.forEach((u, i) => {
      const p = new UnitPanel(this, startXE + i * spacing, 130, u, { enemy: true });
      this.panels.set(u.id, p);
    });
    const startXA = LOGICAL_WIDTH / 2 - ((allies.length - 1) * spacing) / 2;
    allies.forEach((u, i) => {
      const p = new UnitPanel(this, startXA + i * spacing, LOGICAL_HEIGHT - 230, u);
      this.panels.set(u.id, p);
    });
    this.add.text(LOGICAL_WIDTH / 2, 36, `${this.enemyPartyName} との戦い`, { fontSize: '22px', color: COLORS.text }).setOrigin(0.5);
  }

  private buildLogArea(): void {
    this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 10, 560, 150, COLORS.panel, 0.8).setStrokeStyle(2, COLORS.accent2);
    this.logText = this.add
      .text(LOGICAL_WIDTH / 2 - 270, LOGICAL_HEIGHT / 2 - 78, '', { fontSize: '17px', color: COLORS.text, wordWrap: { width: 540 }, lineSpacing: 4 })
      .setDepth(10);
  }

  private refreshAllPanels(): void {
    for (const p of this.panels.values()) p.refresh();
    this.drawPendingMarkers();
  }

  private drawPendingMarkers(): void {
    for (const u of this.ctrl.state.player.units) {
      const p = this.panels.get(u.id);
      if (p) p.highlight(false);
    }
  }

  // --- Command phase --------------------------------------------------------
  private startCommandPhase(): void {
    this.pending.clear();
    this.manualQueue = this.ctrl.manualUnits();
    this.cursor = 0;
    if (this.manualQueue.length === 0) {
      this.executeTurn();
      return;
    }
    this.promptCurrent();
  }

  private promptCurrent(): void {
    if (this.cursor >= this.manualQueue.length) {
      this.executeTurn();
      return;
    }
    const unit = this.manualQueue[this.cursor]!;
    this.highlightActor(unit);
    this.showCommandMenu(unit);
  }

  private highlightActor(unit: BattleUnit): void {
    for (const u of this.ctrl.state.player.units) this.panels.get(u.id)?.highlight(u.id === unit.id);
  }

  private clearUi(): void {
    this.uiLayer.removeAll(true);
  }

  private menuTitle(text: string): void {
    const t = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 360, text, { fontSize: '20px', color: TXT.accent }).setOrigin(0.5);
    this.uiLayer.add(t);
  }

  private showCommandMenu(unit: BattleUnit): void {
    this.clearUi();
    this.menuTitle(`${unit.name} の行動 （${this.cursor + 1}/${this.manualQueue.length}）`);
    const fm = new FocusManager(this);
    const baseX = LOGICAL_WIDTH - 230;
    let y = 250;
    const step = 60;
    const btns: Button[] = [];
    const add = (label: string, fn: () => void, enabled = true) => {
      const b = new Button(this, baseX, y, label, fn, { width: 360, height: 52, enabled });
      y += step;
      this.uiLayer.add(b);
      btns.push(b);
      return b;
    };
    add('通常攻撃', () => this.chooseTarget(unit, 'enemyOne', (ids) => this.setCommand(unit, { actorId: unit.id, actionType: 'attack', targetIds: ids, commandSource: 'manual' })));
    add('スキル', () => this.showSkillMenu(unit));
    add('防御', () => this.setCommand(unit, { actorId: unit.id, actionType: 'guard', targetIds: [unit.id], commandSource: 'manual' }));
    add('道具', () => this.showItemMenu(unit));
    add('共鳴勧誘（全員）', () => this.beginResonance());
    add('逃走（全員）', () => this.beginFlee(), this.ctrl.canFlee);
    add(`作戦: ${TACTICS[unit.tactics].name}`, () => this.cycleTactics(unit));
    if (this.cursor > 0) add('◀ 前のモンスターへ', () => this.goBack());
    fm.set(btns);
    fm.onCancel = () => { if (this.cursor > 0) this.goBack(); };
    this.refreshAllPanels();
  }

  private showSkillMenu(unit: BattleUnit): void {
    this.clearUi();
    this.menuTitle(`${unit.name} のスキル`);
    const fm = new FocusManager(this);
    const baseX = LOGICAL_WIDTH - 230;
    let y = 210;
    const btns: Button[] = [];
    for (const skillId of unit.skills) {
      const sk = app.session!.reg.skill(skillId);
      const affordable = sk.mpCost <= unit.mp;
      const b = new Button(this, baseX, y, `${sk.name}  MP${sk.mpCost}`, () => {
        this.chooseTarget(unit, sk.target, (ids) =>
          this.setCommand(unit, { actorId: unit.id, actionType: 'skill', skillId, targetIds: ids, commandSource: 'manual' }),
        );
      }, { width: 360, height: 48, fontSize: 18, enabled: affordable });
      y += 56;
      this.uiLayer.add(b);
      btns.push(b);
    }
    const back = new Button(this, baseX, y, '◀ もどる', () => this.showCommandMenu(unit), { width: 360, height: 48, fontSize: 18 });
    this.uiLayer.add(back);
    btns.push(back);
    fm.set(btns);
    fm.onCancel = () => this.showCommandMenu(unit);
  }

  private showItemMenu(unit: BattleUnit): void {
    this.clearUi();
    this.menuTitle('道具をつかう');
    const fm = new FocusManager(this);
    const baseX = LOGICAL_WIDTH - 230;
    let y = 210;
    const btns: Button[] = [];
    const items = app.session!.inventory.battleItems();
    if (items.length === 0) this.menuTitle('道具がない');
    for (const { itemId, count } of items) {
      const item = app.session!.reg.item(itemId);
      const b = new Button(this, baseX, y, `${item.name} ×${count}`, () => {
        this.chooseTarget(unit, item.target, (ids) =>
          this.setCommand(unit, { actorId: unit.id, actionType: 'item', itemId, targetIds: ids, commandSource: 'manual' }),
        );
      }, { width: 360, height: 48, fontSize: 18 });
      y += 56;
      this.uiLayer.add(b);
      btns.push(b);
    }
    const back = new Button(this, baseX, y, '◀ もどる', () => this.showCommandMenu(unit), { width: 360, height: 48, fontSize: 18 });
    this.uiLayer.add(back);
    btns.push(back);
    fm.set(btns);
    fm.onCancel = () => this.showCommandMenu(unit);
  }

  private cycleTactics(unit: BattleUnit): void {
    const ids = Object.keys(TACTICS) as TacticsId[];
    const next = ids[(ids.indexOf(unit.tactics) + 1) % ids.length]!;
    unit.tactics = next;
    const inst = app.session!.state.monster(unit.sourceUuid!);
    if (inst) inst.tactics = next; // persist for future battles
    if (TACTICS[next].manual) this.showCommandMenu(unit);
    else this.setCommand(unit, { actorId: unit.id, actionType: 'wait', targetIds: [], commandSource: 'tactics' }, true);
  }

  // --- Target selection -----------------------------------------------------
  private chooseTarget(actor: BattleUnit, rule: TargetRule, onDone: (ids: string[]) => void): void {
    if (!TargetResolver.needsManualPick(rule)) {
      const auto = TargetResolver.candidates(this.ctrl.state, actor, rule).map((u) => u.id);
      // For 'self' and group rules, ids may be empty/group; resolver re-derives at runtime.
      onDone(rule === 'self' ? [actor.id] : auto);
      return;
    }
    const candidates = TargetResolver.candidates(this.ctrl.state, actor, rule);
    if (candidates.length === 0) {
      this.toast('対象がいない');
      return;
    }
    this.clearUi();
    this.menuTitle('対象を選んでください');
    let idx = 0;
    const apply = () => candidates.forEach((u, i) => this.panels.get(u.id)?.highlight(i === idx));
    candidates.forEach((u) => {
      const panel = this.panels.get(u.id)!;
      panel.setSelectable(true, () => { idx = candidates.indexOf(u); confirm(); });
    });
    const confirm = () => {
      const chosen = candidates[idx]!;
      candidates.forEach((u) => { this.panels.get(u.id)!.setSelectable(false); this.panels.get(u.id)!.highlight(false); });
      this.input.keyboard?.off('keydown-LEFT', left);
      this.input.keyboard?.off('keydown-RIGHT', right);
      this.input.keyboard?.off('keydown-ENTER', confirm);
      onDone([chosen.id]);
    };
    const left = () => { idx = (idx - 1 + candidates.length) % candidates.length; apply(); app.audio.play('select'); };
    const right = () => { idx = (idx + 1) % candidates.length; apply(); app.audio.play('select'); };
    this.input.keyboard?.on('keydown-LEFT', left);
    this.input.keyboard?.on('keydown-RIGHT', right);
    this.input.keyboard?.on('keydown-ENTER', confirm);
    const cancel = new Button(this, LOGICAL_WIDTH - 230, LOGICAL_HEIGHT - 120, '◀ もどる', () => {
      candidates.forEach((u) => { this.panels.get(u.id)!.setSelectable(false); this.panels.get(u.id)!.highlight(false); });
      this.input.keyboard?.off('keydown-LEFT', left);
      this.input.keyboard?.off('keydown-RIGHT', right);
      this.input.keyboard?.off('keydown-ENTER', confirm);
      this.showCommandMenu(actor);
    }, { width: 360, height: 48 });
    this.uiLayer.add(cancel);
    apply();
  }

  private setCommand(unit: BattleUnit, cmd: BattleCommand, skipIfTactics = false): void {
    if (!skipIfTactics) this.pending.set(unit.id, cmd);
    this.cursor++;
    this.promptCurrent();
  }

  private goBack(): void {
    this.cursor = Math.max(0, this.cursor - 1);
    const prev = this.manualQueue[this.cursor];
    if (prev) this.pending.delete(prev.id);
    this.promptCurrent();
  }

  // --- Team actions ---------------------------------------------------------
  private beginResonance(): void {
    const targets = this.ctrl.state.enemy.livingUnits();
    if (targets.length === 0) return;
    this.clearUi();
    this.menuTitle('共鳴勧誘する敵を選ぶ');
    // Show recruit hint labels.
    targets.forEach((u) => {
      const hint = this.ctrl.recruitment.evaluate(this.ctrl.state, u, this.ctrl.state.recruitItemBonus);
      const panel = this.panels.get(u.id)!;
      const label = this.add.text(panel.x, panel.y - 70, hint.label, { fontSize: '14px', color: TXT.accent }).setOrigin(0.5).setDepth(30);
      this.uiLayer.add(label);
      panel.setSelectable(true, () => { this.cleanupSelectable(targets); this.executeTeamTurn({ type: 'resonate', targetId: u.id }); });
    });
    const cancel = new Button(this, LOGICAL_WIDTH - 230, LOGICAL_HEIGHT - 120, '◀ やめる', () => {
      this.cleanupSelectable(targets);
      this.promptCurrent();
    }, { width: 360, height: 48 });
    this.uiLayer.add(cancel);
  }

  private cleanupSelectable(units: BattleUnit[]): void {
    units.forEach((u) => { const p = this.panels.get(u.id); p?.setSelectable(false); p?.highlight(false); });
  }

  private beginFlee(): void {
    if (!this.ctrl.canFlee) { this.toast('ここからは逃げられない'); return; }
    this.executeTeamTurn({ type: 'flee' });
  }

  // --- Turn execution & animation ------------------------------------------
  private executeTurn(): void {
    const commands = [...this.pending.values()];
    const report = this.ctrl.resolveTurn({ type: 'commands', commands });
    this.animate(report.fromLogIndex);
  }

  private executeTeamTurn(input: { type: 'resonate'; targetId: string } | { type: 'flee' }): void {
    this.clearUi();
    const report = this.ctrl.resolveTurn(input);
    this.animate(report.fromLogIndex);
  }

  private animate(fromIndex: number): void {

    this.clearUi();
    const entries = this.ctrl.state.log.slice(fromIndex);
    const speed = app.settings.battleSpeed;
    const delay = 520 / speed;
    let i = 0;
    const step = () => {
      if (i >= entries.length) {

        this.afterTurn();
        return;
      }
      const e = entries[i++]!;
      this.appendLog(e.text);
      if (e.kind === 'damage') app.audio.play('hit');
      else if (e.kind === 'heal') app.audio.play('heal');
      else if (e.kind === 'faint') app.audio.play('faint');
      else if (e.kind === 'recruit') app.audio.play('recruit');
      if (e.targetId) {
        const p = this.panels.get(e.targetId);
        if (p) { p.refresh(); this.flash(p, e.kind === 'heal' ? 0x77ff99 : 0xff7777); }
      }
      this.refreshAllPanels();
      this.time.delayedCall(delay, step);
    };
    step();
    // Allow tap to fast-forward.
    this.uiLayer.add(new Button(this, LOGICAL_WIDTH - 130, LOGICAL_HEIGHT - 60, '▶▶ 早送り', () => {
      app.settings.battleSpeed = 3;
    }, { width: 220, height: 44, fontSize: 16 }));
  }

  private flash(panel: UnitPanel, color: number): void {
    if (app.settings.lowEffects) return;
    const fx = this.add.rectangle(panel.x, panel.y, 280, 104, color, 0.4).setDepth(15);
    this.tweens.add({ targets: fx, alpha: 0, duration: 250, onComplete: () => fx.destroy() });
  }

  private afterTurn(): void {
    if (this.ctrl.isOver) {
      this.endBattle();
      return;
    }
    this.startCommandPhase();
  }

  // --- Logging --------------------------------------------------------------
  private appendLog(text: string): void {
    this.logLines.push(text);
    if (this.logLines.length > 5) this.logLines.shift();
    this.logText.setText(this.logLines.join('\n'));
  }

  private flushLog(_from: number): void {
    this.logLines = ['戦闘開始！'];
    this.logText.setText(this.logLines.join('\n'));
  }

  // --- Resolution -----------------------------------------------------------
  private endBattle(): void {
    const session = app.session!;
    const summary = session.applyBattleResult(this.ctrl);
    const outcome = summary.outcome;
    const isBoss = this.init_.partyId === 'boss_dirgewarden';

    if (outcome === 'victory' || outcome === 'recruited_all') {
      app.audio.play('victory');
      if (isBoss) {
        session.state.data.bossesDefeated.push('boss_dirgewarden');
        void app.autosave('boss');
        this.scene.start(SCENES.Clear);
        return;
      }
      void app.autosave(summary.recruited.some((r) => r.accepted) ? 'recruit' : 'battle');
      this.scene.start(SCENES.Result, { summary, returnScene: this.init_.returnScene, returnArea: this.init_.returnArea });
      return;
    }
    if (outcome === 'fled') {
      this.scene.start(this.init_.returnScene, { area: this.init_.returnArea });
      return;
    }
    // Defeat: return to town and recover (no permanent data loss).
    session.healAll();
    this.scene.start(SCENES.Town);
  }
}
