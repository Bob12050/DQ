# 設計書 — エコーズ・オブ・ビースト

## 0. リポジトリの状況と Web 版への移行方針

初期状態は `README.md`（"# DQ"）のみのほぼ空リポジトリでした。**既存の Godot 実装は
存在しません。** 当初指示は Godot/GDScript でしたが、後続の最重要変更により
**Web/PWA（TypeScript + Phaser 4）** が正となったため、本リポジトリは最初から Web 版として
構築しています（Godot のコードを継ぎ足す必要はありませんでした）。矛盾する指示は新仕様を優先。

味方・敵ともに最大4体、合計最大8体が**同一戦場に同時参加**する 4対4 を最初から前提に設計し、
1対1専用の戦闘実装は作っていません（`BattleTeam` / `BattleUnit` を全戦闘で共用）。

## 1. アーキテクチャ概要

**描画・入力・シーン管理は Phaser、ゲームルールは Phaser 非依存の純TSモジュール**として分離。
これにより戦闘・配合・セーブのロジックを Vitest でヘッドレス検証できます。

```
src/
  core/                     ← Phaser に依存しないゲームコア（テスト対象）
    rng.ts                  ← シード付き擬似乱数（mulberry32）
    types.ts                ← 全データ型（*Definition / *Instance を明確に分離）
    data/                   ← マスターデータ（TS定義: monsters/skills/traits/items/…）
    registry/               ← DataRegistry（参照） + validation（整合性検査）
    monster/                ← MonsterInstance, leveling（経験値・成長の唯一の集約点）
    battle/                 ← BattleController/State/Unit/Team, DamageCalculator,
                              TargetResolver, ActionQueueBuilder, ActionResolver,
                              StatusEffectService, TraitTriggerService,
                              ActionEvaluator(共有AI), EnemyAI, TacticsAI,
                              RecruitmentService
    services/               ← PartyService, InventoryService, FusionService
    state/                  ← GameState(直列化データ), GameSession(オーケストレータ)
    save/                   ← SaveData(版/検証/checksum), SaveRepository(IndexedDB),
                              SaveMigrationService, backup(JSON入出力)
  app/                      ← GameApp(シングルトン), Settings, config, fileTransfer
  audio/  AudioService.ts   ← WebAudio 合成音（ファイル不要）
  pwa/    PwaUpdateService  ← SW登録・更新通知（自動リロードしない）
  input/                    ← （Phaser入力で充足のため最小）
  game/                     ← Phaser 層
    PhaserGame.ts           ← Game生成 + Scale(FIT/CENTER) + scene登録
    scenes/                 ← Boot/Title/Town/Field/Battle/Result/Party/Storage/
                              MonsterDetail/Fusion/Shop/SaveLoad/Settings/Clear
    ui/                     ← BaseScene, widgets(Button/FocusManager), UnitPanel, MonsterIcon
  main.ts                   ← 起動 + SW登録 + visibilitychange オートセーブ
```

依存方向は `game → core`（一方向）。`core` は Phaser/DOM を import しません（save/audio/pwa の
ブラウザAPIは core 外）。循環依存はなし。UIノードにゲームルールを置かない方針。

### 主要クラスの責務

| クラス | 責務 |
| --- | --- |
| `DataRegistry` | マスターデータの読み込み・型付き参照・id検証付きアクセサ |
| `GameSession` | 進行状態の所有と、戦闘結果の永続化への反映（唯一の書き戻し点） |
| `BattleController` | 戦闘の状態機械を駆動。UIは命令を渡すだけ |
| `BattleState/Team/Unit` | 戦闘中の状態。`BattleUnit` は `MonsterInstance` のスナップショット |
| `ActionQueueBuilder` | 最大8体の行動を1つのキューに統合・整列 |
| `ActionResolver` | 1行動の解決（命中/会心/属性/状態異常/反撃/かばう/多段） |
| `TargetResolver` | 対象範囲ルールの一元化（スキル毎の if 分岐を作らない） |
| `DamageCalculator` | ダメージ・回復の計算式 |
| `ActionEvaluator` | 味方AI(作戦)・敵AIで**共有**する行動評価。MP不足は選ばない/重複回復を抑制 |
| `RecruitmentService` | 共鳴勧誘の貢献度・成功率（内部は実数、UIは段階表示） |
| `FusionService` | 配合結果（固定レシピ→系統/ランクのフォールバック）・継承・補正上限 |

## 2. データ定義方式と選定理由

マスターデータは **TypeScript のオブジェクトリテラル**（`src/core/data/*.ts`）で定義。

- **理由:** strict TS の型でデータ形を**コンパイル時に検査**でき、ID参照や enum をコードと
  共有できる。IDE 補完・リファクタが効く。JSON だと別途スキーマ検証が必要で、共有 enum も使えない。
- 一方で「データ駆動」を担保するため、戦闘/UI コードは**直接リテラルを読まず** `DataRegistry`
  経由でのみ参照します。差し替え（将来 JSON 化）も Registry の実装変更だけで可能。
- 起動時（`BootScene`）と Vitest で `validateData()` を実行し、**重複ID/未知のスキルID・
  モンスターID/不正な融合レシピ・出現データ/範囲外能力値/負のMP/0以下の最大HP** を検出します。

`MonsterDefinition`(種族) と `MonsterInstance`(所有個体) は別型。戦闘は `BattleUnit`
スナップショット上で行い、終了後 `BattleResult` 経由で経験値/HP/MP/加入/道具消費を反映するため、
戦闘処理がセーブデータを直接破壊しません。

## 3. 戦闘モデル（4対4）

最大8体の `BattleUnit` が1つの `BattleState` に共存。各ターンは明示的な状態機械:

```
BATTLE_START → TURN_START → PLAYER_COMMAND_SELECTION → ENEMY_COMMAND_SELECTION
→ ACTION_QUEUE_BUILD → ACTION_RESOLUTION → END_OF_TURN_EFFECTS
→ VICTORY_OR_DEFEAT_CHECK → TURN_END →(loop)／→ BATTLE_RESULT → BATTLE_END
```

UI状態と戦闘ルール状態は分離（UI は `BattleController.resolveTurn()` に命令を渡すのみ）。
戦闘結果は先に確定し、UI(`BattleScene`)が `state.log` を順に再生（早送り可）。

### 行動順

```
effectiveSpeed = agility(状態異常・特性込み) * 乱数(0.9〜1.1)
並び順: priority 降順 → effectiveSpeed 降順 → randomTieBreaker
priority: 防御=10, 道具=6, 先制技=5, 通常=0, 待機=-10
```

すべての乱数はシード付き `Rng` 経由 → 固定シードで素早さ順が再現（テスト済）。

### 行動解決ルール（抜粋）

- 行動前に生存/行動可能/MP/在庫/対象有効性を再確認。発動できなければ MP を消費しない。
- 単体攻撃の対象が既に戦闘不能 → 同陣営の有効対象から再選択。単体回復は対象が倒れていれば失敗。
  蘇生技は戦闘不能の対象のみ。全体技は発動時点の有効対象に適用。対象皆無なら行動失敗。
- 敵が全滅した時点で残りの攻撃は実行しない。多段攻撃は対象全滅で停止。
- **防御**は実行時点からターン終了まで有効（被ダメージ0.5倍）。**かばう**(echoGuard)・**反撃**(thornmail)
  などの特性をフックで解決。**2回行動**は1ターン上限付き（暴走防止）。

### ダメージ / 回復

```
物理/魔法:  core  = power * atk / (def * 0.5 + 5)      atk = 物理:攻撃 / 魔法:魔力, def = 防御
            final = core * 属性倍率 * 特性補正 * (防御中?0.5:1) * (会心?1.5:1) * 乱数(0.9〜1.1)
            damage = max(1, round(final))               ← 常に1以上・極端値を回避
会心率 6% / 会心倍率 1.5
回復:      heal  = max(1, round(power * (1 + 魔力/20)))
毒:        ターン終了時に 最大HP * 8%
```

属性倍率は攻撃側相性表 × 防御側 `elementResist`（0.0=無効, 0.5/0.75/0.8=耐性, 1.0=通常,
1.25/1.5=弱点, 吸収用の負値も型上可）。UIは「無効/耐性/通常/弱点/大弱点」の段階表示のみ。

## 4. 共鳴勧誘（リクルート）

味方全員が参加するチーム行動（全員の通常行動を消費、敵は通常通り行動）。

```
contribution(味方) = levelFactor + attackFactor + magicFactor + affinityFactor + conditionFactor
teamPower = Σ contribution
成功率 = baseRecruitRate
       + (1 - 対象HP割合) * 0.45
       + teamPower / (teamPower + 対象耐性) * 0.40        対象耐性 = lv*2.5 + ランク*8 + maxHP*0.05
       + 専用アイテム補正 + エリア補正
       - ランクペナルティ - 警戒度 * 0.15
       → clamp 0〜0.95（加入不可フラグ/ボスは 0）
```

UIは段階表示（反応がない/かすかに/共鳴が生まれている/強く/非常に強く）。開発者モードで実数表示。
成功で対象のみ離脱、残敵がいれば戦闘継続、最後の1体なら勝利。失敗で警戒度上昇。保有上限50体、
満杯時は加入を逃がし結果画面に表示。

## 5. 配合（共鳴融合）

- **固定レシピ8種**（順不同）を優先。なければ**系統＋ランク**でフォールバック
  （子系統＝基礎合計の高い親、ランク＝強い親の1段上を `epic` で上限、`boss` は生成しない）。
- 子は **Lv1**。種族固有スキルは必ず保持。親スキルから**最大2個**を選んで継承（重複は統合）。
- 融合補正は親の補正と合算レベルから算出し、**1ステータス上限+12**で累積暴走を防止。
- `generation`／`fusionCount`／親 UUID・種族を**系譜**として保存。最後の1体になる融合・同一個体の
  両親選択は不可。編成中個体には警告表示。最終確認するまで実行しない（実行は取り消し不可）。

## 6. セーブ / PWA

- IndexedDB（`SaveRepository`）。保存は「直前の正常mainをbackupへ退避→新mainを書込」。
  読み込みは main 検証失敗時に backup へフォールバック。`checksum`(djb2)で破損検出。`version`+
  `SaveMigrationService` で将来のマイグレーション。JSON 入出力は検証付き（`backup.ts`）。
- PWA: `vite-plugin-pwa`（`registerType: 'prompt'`, `skipWaiting:false`, `clientsClaim:false`）で
  **戦闘/セーブ中に勝手にリロードしない**。更新は通知のみ、タイトルで適用。`manifest` は standalone/
  landscape/theme/background/start_url/scope を設定。`index.html` に `viewport-fit=cover`、
  `apple-touch-icon`、safe-area パディング。`visibilitychange` で非表示時に best-effort オートセーブ＆
  音声/描画停止。

## 7. パフォーマンス方針

戦闘ログ保持上限（200件）、`lowEffects`/30FPS 設定、非表示時に `game.loop.sleep()`、
プレースホルダー描画（巨大画像なし）。毎フレームの重い配列生成や DOM 更新は避ける構成。

## 8. テスト戦略

`core` は純TSなので Vitest で網羅（4対4の生成/キュー統合/戦闘不能スキップ/対象再選択/全体技/
多段停止/状態異常ターン/毒全滅敗北/素早さ再現/AIのMP・重複回復/共鳴の全員消費と離脱/1〜4体の各人数/
セーブ往復・JSON一致・破損検出/データ検証）。乱数は固定シードで再現。E2E(Playwright)は実ブラウザで
各 iPhone ビューポートとオフライン起動を検証（CI では `playwright install` 後に実行）。
