# Monster Nexus（プロトタイプ）

完全オリジナルの **モンスター育成 × 4対4 ターン制バトルRPG**。スマホ縦画面（9:16）向けの
Web プロトタイプです。既存IPの名称・キャラクター・デザイン・文言は一切使用していません。

- 技術: **Phaser 4 + TypeScript(strict) + Vite**
- 形式: 縦画面・タッチ操作前提（PCのマウスでも操作可）
- 画像アセット不要（図形・グラデーション・テキストで現代スマホゲーム風UIを構築）

---

## セットアップ

```bash
npm install
```

## 起動

```bash
npm run dev        # http://localhost:5173 で起動
```

## スマホで確認する方法（同じWi‑Fi）

```bash
npm run dev:host   # ローカルネットワークに公開（Network: http://192.168.x.x:5173 が表示される）
```

表示された **Network のURL** をスマホのブラウザで開いてください（PCとスマホが同じWi‑Fiに接続されている必要があります）。
画面は自動で端末サイズにフィットします（縦画面推奨）。

## その他のスクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run build` | 型チェック + 本番ビルド（`dist/`） |
| `npm run preview` | ビルド成果物をローカル配信 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest（バトル/成長ロジックの単体テスト） |

---

## 実装済み機能（MVP）

- 画面遷移: **タイトル → ホーム → ステージ選択 → バトル → リザルト → ホーム**
- 9シーン: Boot / Preload / Title / Home / StageSelect / TeamEdit / MonsterDex / Battle / Result
- **4対4のターン制バトル**（味方最大4 / 敵最大4、素早さ順で行動）
  - コマンド: **攻撃 / スキル / 防御**、対象は敵/味方カードをタップして選択
  - スキルはMVPでは各モンスターの先頭スキルを自動使用（拡張しやすい構造）
  - 敵AIは「最もHPの低い相手を狙う」＋一定確率でスキル使用
  - 属性相性（火→草→水→火、光⇄闇、無は等倍）・弱点/耐性表示
  - HPバー、ダメージ数字、被弾シェイク、行動演出、バトルログ
- **編成**: 6体の初期所持から最大4体を選択（タップで入れ替え、即保存）
- **モンスター図鑑**: 所持モンスターのステータス一覧（縦スクロール）
- **ステージ 1〜5**: 敵パーティ・推奨戦力・報酬を `src/data/stages.ts` に定義
- **育成**: 勝利でコイン/EXP獲得、しきい値でレベルアップ（ステータス上昇）、一部ステージはモンスタードロップ
- **セーブ**: `localStorage` に所持モンスター・編成・コイン・クリア状況を自動保存

## バトル仕様の概要

- ステータス: `maxHp / hp / attack / defense / magic / speed / level / rarity / element / skills`
- 属性: `fire / water / grass / light / dark / neutral`
- 行動順: 生存している全モンスターを **speed 降順** に並べ、1ラウンドで各自1回行動
- ダメージ式（独自・README記載）:

  ```
  通常攻撃: max(1, round((attack - defense/2) * 乱数(0.85〜1.15) * 属性倍率 [* 防御0.5]))
  スキル:   max(1, round((skillPower + magic - defense/2) * 乱数 * 属性倍率 [* 防御0.5]))
  回復:     round(skillPower + magic * 0.6)
  属性倍率: 有利1.5 / 不利0.75 / それ以外1.0
  ```

- 勝敗: 敵全滅で勝利 / 味方全滅で敗北

---

## 主要ファイル構成

```
src/
  main.ts                  エントリーポイント（Phaser.Game生成）
  game/
    GameConfig.ts          Phaser設定（縦画面FITスケール・シーン登録）
    GameState.ts           進行状態＋localStorageセーブ（共有シングルトン）
    constants.ts           解像度・色・属性/レアリティ定義
  data/                    ★ゲームデータ（コードから分離）
    monsters.ts            モンスター種族テンプレ（9種）＋初期6体
    skills.ts              スキル定義（10種）
    stages.ts              ステージ定義（1〜5）
  systems/                 ★Phaser非依存の純ロジック
    BattleSystem.ts        4対4バトル進行（ラウンド解決）
    DamageCalculator.ts    ダメージ/回復/属性相性
    TurnOrderSystem.ts     素早さ順
    EnemyAI.ts             敵の行動選択
    ProgressionSystem.ts   経験値・レベルアップ・モンスター生成
  ui/                      ★再利用UIコンポーネント
    Button.ts  Card.ts  HpBar.ts  MonsterCard.ts  BottomNav.ts
  scenes/                  ★各画面（描画・入力のみ）
    BootScene / PreloadScene / TitleScene / HomeScene /
    StageSelectScene / TeamEditScene / MonsterDexScene /
    BattleScene / ResultScene
  types/                   型定義（Monster / Skill / Stage / Battle）
tests/
  battle.test.ts           バトル・属性・成長の単体テスト
```

設計方針: **戦闘・育成ロジック（systems）は Phaser に依存しない純TS**。Phaser（scenes/ui）は描画と入力のみ。
状態は `GameState` に集約。これにより将来の機能追加とテストが容易です。

---

## 今後追加しやすい機能（拡張ポイント）

- **捕獲**: バトル勝利時のドロップ枠を捕獲システムへ（`Stage.reward.dropTemplateId` / `ResultScene`）
- **配合**: `MonsterTemplate` 同士の組み合わせ→新種、`ProgressionSystem` に継承ロジック追加
- **スキル選択UI**: `BattleScene.onSkill` を複数スキルから選ぶメニューへ（型は対応済み `mpCost` も用意）
- **状態異常・バフ/デバフ**: `Skill.kind` に `buff/debuff` を用意済み、`BattleSystem` に効果フックを追加
- **装備**: `Monster` にスロットを追加し、`ProgressionSystem` のステータス計算へ反映
- **ガチャ / スタミナ / ランキング**: `data/` に確率テーブル等を追加、`GameState` に通貨/スタミナを拡張
- **アセット**: `PreloadScene.preload()` に画像/音声を追加（進捗バーは実装済み）

すべて「データ（data/）」「ロジック（systems/）」「画面（scenes/）」が分離されているため、
既存コードを壊さずに段階的に拡張できます。
