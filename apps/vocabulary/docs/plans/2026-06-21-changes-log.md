# 変更記録ログ（A1 MVP 以降の大きな変更）

> 大きな変更はこのログに追記する（何を・なぜ・どう・影響ファイル）。個別の実装手順は `docs/plans/YYYY-MM-DD-<feature>.md` に分けて書く。
> 注: TypeScript 化→JS 巻き戻しの一件は確定済みのため本ログには含めない（現状は素の JS / ビルドなし）。

初期ビルド（A1 MVP）の設計・実装は次を参照:
- `docs/plans/2026-06-21-vocabulary-app-design.md`
- `docs/plans/2026-06-21-vocabulary-app-implementation.md`

---

## 2026-06-21 — データ配置を `data/` に集約
- **何を**: ルート直下の `A1/`・`A2/` を `data/A1`・`data/A2` に移動（レベル分けは維持）。
- **なぜ**: ルート整理。語彙データを1か所に。
- **どう / 影響**: 実行時パスを `data/${level}/words.json`・`data/${level}/${audio}` に変更（`js/data.js`・`js/audio.js`）。ツール（`tools/validate_data.mjs`・`merge_parts.cjs`・`precheck.cjs`・`tts_generate.py`）の参照も `data/` 配下へ。`data/A1` は本番データ、`data/A2` はフェーズ2用の空フォルダ。

## 2026-06-21 — UIデザインを BMW Corporate-Automotive に確定
- **何を**: UI 全体のデザイン言語を確定。当初 "Nintendo-2001 chrome" を適用したが、ユーザー要望で **BMW Corporate-Automotive** に全面差し替え。
- **なぜ**: 落ち着いた・可読性重視のコーポレート意匠を希望。
- **どう / 影響**: 仕様 `docs/design/bmw-corporate-automotive.md`（旧 nintendo 仕様はプロジェクトから除去）。`css/styles.css` 全面書き換え、`index.html`（top-nav＋footer）、`js/main.js`・`js/reader.js`・`js/flashcard.js` のマークアップを BMW 構造へ。白 canvas / BMW blue #1c69d4 / 矩形0px / Inter 700-300 / ネイビーヒーロー / ドロップシャドウ無し。Nintendo 由来語（periwinkle/halftone/carbon/chamfer 等）は grep 0 件で排除確認。

## 2026-06-21 — UX/HCI 刷新（クリック直感性・ランダム出題・状態表示）
- **何を**: ホーム（hero-band-dark＋model-card 2-up）、フラッシュカード（カード全体クリックでめくる／キーボード Space=めくる・1/2/3=評価／進捗 n/N／完了・空状態）、読むだけ（検索＋ヒット件数 aria-live＋空状態）。出題をランダム化。
- **なぜ**: 操作の直感性とアクセシビリティ向上。出題が毎回同じ（seed順）にならないように。
- **どう / 影響**: `js/srs.js` に純粋関数 `shuffle(array, rng=Math.random)`（Fisher–Yates・非破壊）を追加し、`selectSession(cards, today, newPerDay, rng=Math.random)` を「due 全件＋未学習からランダム newPerDay 件＋最終キューをシャッフル」に変更（due 判定・箱遷移は不変）。`tests/srs.test.js` を rng 注入の決定論テストに更新（12 件・全 green）。`js/main.js`・`js/flashcard.js`・`js/reader.js` の描画更新。

## 2026-06-21 — アクセシビリティ監査（Web Interface Guidelines）
- **何を**: Vercel Web Interface Guidelines に基づく監査と修正。
- **なぜ**: HCI/a11y ベストプラクティス準拠。
- **どう / 影響**: コントラスト不足の修正（`--success` を #15803d、placeholder を `--muted`、評価キーの減光除去）、emoji/グリフをアイコン使用していた箇所を排除（`📖`→テキスト、`🎉`削除、`☰`→CSS 3本線）、`:focus-visible` のスコープ化、`tabular-nums`・`text-wrap:balance`・`touch-action:manipulation` 追加。`css/styles.css`・`index.html`・`js/main.js`・`js/flashcard.js`。

## 2026-06-21 — 読むだけ刷新＋音声単一再生ロック＋見出し語発音（完了）
- 詳細は `docs/plans/2026-06-21-reader-audio-lemma.md`。
- 要点: 読むだけを「クリック不要で各語に意味＋全例文をインライン表示する読み物リスト」に（詳細が最下部に出る問題を解消）。音声は単一再生ロック（再生中は他の▶を無効化）。フラッシュカード表（めくる前）と読むだけで**見出し語単体の発音**を再生可能に（edge-tts で事前生成、無い場合 Web Speech フォールバック）。

## 2026-06-21 — 進捗トラッキング（到達度・1日の目標・日次履歴）
- 詳細は `docs/plans/2026-06-21-progress-tracking.md`。
- **何を**: A1 到達度（見出し=習得率 箱5/総数、＋加重カバレッジ・学習開始率・箱分布）、1日の学習目標（新規＋復習の合計、10〜100設定可）に対する達成、日付ごとの学習量履歴（コントリビューショングラフ＋一覧）、ストリームを進捗ダッシュボードで表示。
- **なぜ**: 学習者が現在地・基準達成・全体到達度・継続を把握できるように。
- **どう / 影響**: **DB不要・localStorage のみ**。`settings.dailyGoal` と `history{"YYYY-MM-DD":{new,review}}` を追加（後方互換）。集計は純関数 `js/stats.js`（＋ `tests/stats.test.js`）。セッションは「due 全件＋目標到達まで新規補充（新規=max(0, dailyGoal−due数)）」。`js/srs.js`・`tests/srs.test.js` は不変（12テスト維持）。`js/storage.js`・`js/main.js`(＋`js/dashboard.js`)・`js/flashcard.js`・`css/styles.css` を変更。

## 2026-06-21 —（軽微）評価コントロールのモダン化
- 大きな変更ではないが記録: フラッシュカードの「忘れた/あやふや/覚えてた」を、セマンティックaccent＋SVGアイコン＋kbd番号チップ＋hover/活性のタイルUIに刷新（別番号ヒント行は廃止）。`js/flashcard.js`・`css/styles.css`。機能・キーボード1/2/3・SRS不変。

## 2026-06-21 — A2 構築（A1と同パイプライン）
- **何を**: ゲーテ A2 を構築。公式 A2 Wortliste から **A1 と重複しない 584 語**を抽出 → A2 文法天井で意味(JA/EN)＋例文を生成（13バッチ並列）→ 独立検証パスで B1 違反を除去 → 例文音声＋単語タイミング(1286)・見出し語音声(584) を edge-tts 生成。
- **どう / 影響**: `data/A2/words.json`＋`data/A2/audio`（例文1286・lemma584）。`tools/a2_seed.json`、`tools/sentence_pipeline.md` に「A2 の天井」追記（全動詞Perfekt・Dativ全面・付加語格変化/比較級・従属節 dass/weil/wenn・再帰 解禁／関係文・受動・一般Präteritum叙述・一般Genitiv は禁止＝B1）。`validate_data.mjs A2` ✓584。検証で `Einkaufszentren` の複数形誤りなど修正。

## 2026-06-21 — A1/A2 レベル切替（進捗はレベル別スコープ）
- **何を**: 上部ナビに A1/A2 切替を追加。出題・到達度・箱分布・読むだけ件数を**現在レベルにスコープ**（分母 A1=786 / A2=584 が切替わる）。
- **どう / 影響**: `settings.level`（'A1'|'A2'）を永続。`js/main.js` で現在レベルの cards 集合に絞って dashboard/flashcard/home/reader に渡す（`srs.js`・`stats.js` は不変）。`history`・`dailyGoal` はグローバル。`index.html`・`css/styles.css` に切替UI（`category-tab` 風・aria・44px）。

## 2026-06-21 — A1 音声データの消失と復旧（事故・要再発防止）
- **何が**: A2 作業中に `merge_parts.cjs`（音声なし parts から `data/A1/words.json` を再生成）が走り、A1 の audio/timing/lemmaAudio フィールドが全消失（mp3 実体は無事）。
- **復旧**: 見出し語フィールドは即復元、例文の audio＋timing は `tts_generate.py A1` 再実行で再構築（timing は mp3 から復元不可のため）。`validate_data.mjs A1` ✓786 に回復。
- **再発防止**: `merge_parts.cjs` に「音声付き words.json を音声なし parts で上書きしない」ガードを追加（`--force` で明示override）。**教訓: parts は de/ja/en のみ。audio/timing/lemmaAudio は words.json 側にしか無いので、merge をうかつに再実行しない。**

## 2026-06-21 —（インフラ・ユーザー実施）deutsch/ モノレポ化
- 単語アプリは `deutsch/apps/vocabulary/` に intact で移動。デザイン正本は `deutsch/docs/design/`（全アプリ共通）。配信はリポジトリ直下の `deutsch/serve.sh`（→ `/apps/vocabulary/`・`/apps/pronunciation/`、ハブは `#/exam-guide` 等）。相対パス設計のためアプリ内コードは無改変で動作（`node --test` 30 pass・`validate` 786/584 を移動後に再確認済み）。
