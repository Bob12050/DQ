# TASKS — 進捗と検証状況

凡例: ✅ 完了 / 🟡 一部 / ⬜ 未

## フェーズ0: リポジトリ調査・設計
- ✅ 既存ファイル確認（README のみ、Godot 実装なし）
- ✅ Web/PWA への移行方針を DESIGN.md に記載
- ✅ README.md / DESIGN.md / TASKS.md / ASSUMPTIONS.md 作成

## フェーズ1: Web・PWA 基盤
- ✅ Vite + TypeScript(strict) + Phaser 4.2.0 + vite-plugin-pwa + Vitest + Playwright
- ✅ Web App Manifest / Service Worker / オフラインキャッシュ / アイコン(192/512/maskable/apple-touch)
- ✅ iPhone viewport（viewport-fit=cover）+ safe-area + 横向き案内 + standalone/オンライン判定 + 更新通知
- ✅ Scale Manager(FIT/CENTER, 1280x720) / GitHub Pages 用 `base`(`BASE_PATH`)
- ✅ タイトル画面表示、`npm run build` で PWA 生成を確認

## フェーズ2: 4対4 戦闘の垂直スライス
- ✅ 最大8体 BattleUnit / 4体命令入力 / 4体敵AI / ActionQueue / TargetResolver / DamageCalculator
- ✅ 通常攻撃・単体/全体スキル・単体/全体回復・防御・状態異常・戦闘不能・勝敗・経験値・レベルアップ・戦闘ログ
- ✅ 1体専用実装なし（全戦闘で BattleTeam/BattleUnit 共用）
- ✅ Vitest: 1〜4体の各人数で戦闘成立を確認

## フェーズ3: 戦闘機能拡張
- ✅ 作戦7種 / 属性相性 / 耐性 / 状態異常3種(蝕み=毒/微睡み=睡眠/麻痺=行動不能)+強化弱体
- ✅ 特性12種 / 全体攻撃 / 多段攻撃 / 道具 / 蘇生 / 逃走 / ボスAI(作戦指定) / 演出速度
- ✅ 反撃・かばう・2回行動（1ターン上限）

## フェーズ4: 共鳴勧誘
- ✅ 全員参加の貢献度計算 / 対象選択 / 警戒度 / 加入処理 / 保有上限(50) / 戦闘継続・段階表示

## フェーズ5: 探索
- ✅ 拠点 / 草原 / 洞窟 / 番人の間、タップ移動＋探索ボタン＋キーボード移動、エンカウント、戦闘復帰

## フェーズ6: 育成と編成
- ✅ 最大4体編成 / 保有一覧(ページング) / レベルアップ / スキル習得 / 作戦設定 / 詳細(属性耐性・系譜表示)

## フェーズ7: 配合
- ✅ 親選択 / 結果計算 / 継承選択(最大2) / 結果確認 / 実行 / 系譜・世代保存 / 固定レシピ8 + 系統フォールバック

## フェーズ8: セーブと PWA 完成
- ✅ IndexedDB / オートセーブ(各契機 + visibilitychange) / バックアップ書出・復元(JSON, 検証) /
     破損検出・復旧 / スロット(オート+3) / 版・マイグレーション
- ✅ GitHub Actions（lint/typecheck/test/build → Pages デプロイ）/ base・scope 整合

## フェーズ9: ボスとクリア
- ✅ ボス戦(4体まで・専用作戦・逃走不可・加入不可) / 撃破フラグ / クリア画面 / エンディング

## コンテンツ
- ✅ モンスター14種 / スキル22種 / 特性12種 / 道具7種 / 融合レシピ8 / 作戦7

## 検証（このリポジトリで実行済み）
- ✅ `npx tsc --noEmit` → エラー0
- ✅ `npm run lint`（eslint）→ エラー0
- ✅ `npx vitest run` → **11ファイル / 52ケース 全合格**
- ✅ `npm run build`（tsc + vite build + PWA）→ 成功（`dist/sw.js`・`manifest.webmanifest` 生成）

## 既知の制約・未実施
- 🟡 **Playwright E2E は未実行**: 本作業環境はサンドボックスでブラウザバイナリを取得できず
  （`playwright install` がネットワーク制限で失敗、システムChromeも無し）。
  spec は `tests/e2e/smoke.spec.ts` に用意済み。**ブラウザのある環境 / CI で
  `npx playwright install --with-deps && npm run e2e` を実行して確認してください。**
- 🟡 ゲーム画面の目視確認は本環境では不可。代わりに型チェック・lint・52ユニットテスト・本番ビルド成功で
  ロジックと配線を検証。Phaser シーンの描画は実機/ブラウザでの確認が必要。
- ⬜ バンドルは Phaser を含むため約1.8MB（gzip 約417KB）。MVP では許容。将来コード分割の余地あり。
- ⬜ 戦闘中の控え交代は仕様通り未実装（MVP対象外）。BGM 楽曲は無し（効果音は合成音）。

## 改名方法
`src/app/config.ts` の `GAME_TITLE` / `GAME_TITLE_EN` を変更（仮タイトル前提の構造）。
