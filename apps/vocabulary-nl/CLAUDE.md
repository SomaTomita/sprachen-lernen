# Deutsch 単語アプリ (Goethe A1/A2)

オフラインのドイツ語単語学習アプリ。忘却曲線(Leitner)＋ネイティブ音声(カラオケ)＋進捗トラッキング。素の HTML/CSS/JS、ビルド不要。

## よく使うコマンド
リポジトリ直下で実行（コードもコマンドも相対パス＝フォルダ移動可）。
- 起動: 親 `deutsch/` の `./serve.sh` → `http://localhost:8000/apps/vocabulary/`（この単語アプリ単体は `apps/vocabulary/` 直下で `python3 -m http.server 8000` → `http://localhost:8000/`）。`file://` 直開きは不可（ES Modules/fetch のためサーバ必須）。以降のテスト/検証/音声生成コマンドは `apps/vocabulary/` 直下で実行
- テスト: `node --test`（`js/srs.js`・`js/stats.js` の純関数。現在30件）
- データ検証: `node tools/validate_data.mjs A1`（A2 も同様）
- 例文音声生成: `tools/.venv/bin/python tools/tts_generate.py A1`（MP3＋単語タイミング）
- 見出し語音声生成: `tools/.venv/bin/python tools/tts_lemma.py A1`

## スタックと制約
- **素の HTML/CSS/JS（ES Modules）。ビルド無し・フレームワーク無し・localStorage・DB無し。** TypeScript は使わない（過去に導入→素JSへ戻した。再導入しない）。
- オフライン動作。**外部CDN/Webフォントを読み込まない**（Inter/Arial＋system フォールバック）。
- 音声は edge-tts で**事前生成**。実行時は同梱MP3を再生、欠落時 Web Speech フォールバック。
- デザイン: BMW corporate-automotive（正本は**リポジトリ直下** `../../docs/design/bmw-corporate-automotive.md`＝全アプリ共通）。白canvas / BMW blue `#1c69d4` / 0px矩形 / Inter 700・300 / **ドロップシャドウ禁止** / 暖色＝道標のみ。
- アクセシビリティ(Web Interface Guidelines): コントラスト4.5:1 / `:focus-visible` / タッチ44px / aria / `prefers-reduced-motion` / **emojiをアイコンにしない** / 横スクロール無し。

## 構成
```
index.html              エントリ
css/styles.css          BMWトークン＋レイアウト
js/                     srs, storage, data, audio, reader, flashcard, session, stats, dashboard, main
data/A1, data/A2        words.json ＋ audio/*.mp3 ＋ audio/lemma/*.mp3
tools/                  edge-tts生成・検証スクリプト, .venv, sentence_pipeline.md
docs/plans            実装計画・変更ログ（デザイン正本は ../../docs/design/）
tests/                  srs.test.js, stats.test.js
```

## データモデル（words.json 1件）
```json
{ "id":"a1-haus", "lemma":"Haus", "pos":"noun", "article":"das", "plural":"Häuser",
  "level":"A1", "lemmaAudio":"audio/lemma/a1-haus.mp3",
  "meanings":[{"ja":"家","en":"house"}],
  "examples":[{"de":"Das Haus ist groß.","ja":"その家は大きい。","en":"The house is big.",
    "audio":"audio/a1-haus-1.mp3","timing":[{"w":"Das","s":0.0,"e":0.32}]}] }
```
- `id` = `a1-`/`a2-` + lemma の小文字ASCII化（ä→ae, ö→oe, ü→ue, ß→ss）。名詞は `article` 必須。例文音声 `audio/<id>-<n>.mp3`、見出し語 `audio/lemma/<id>.mp3`。

## localStorage（キー `deutsch-vocab-v1`）
```json
{ "cards": { "<id>": { "box":1, "dueDay":0, "lastReviewedDay":null, "timesSeen":0, "timesGood":0 } },
  "settings": { "level":"A1", "dailyGoal":20 },
  "history": { "YYYY-MM-DD": { "new":0, "review":0 } } }
```
- 構造変更時は読み込み時に既定値で補完（マイグレーション）。更新は `js/srs.js` の純関数でイミュータブルに。

## SRS / 進捗
- Leitner 5箱（間隔 1/2/4/8/16日）。good→箱+1 / fuzzy→据置 / forgot→箱1。
- セッション = 期日が来た復習を全部＋目標到達まで新規を補充（新規 = `max(0, dailyGoal − due数)`）。
- 到達度（見出し=習得率 箱5/総数、＋加重カバレッジ・学習開始率）・箱分布・日次履歴・1日の目標（10–100、新規＋復習の合計）。

## 例文の文法・語彙制約
- A1/A2 各レベルの**天井を超えない**（`tools/sentence_pipeline.md`）。LLM生成 →**独立した検証パス**で担保。A2 例文は A1 語彙も使用可（累計）。

## コードスタイル
- `srs.js`・`stats.js` は**純関数**（DOM・副作用なし）でテスト可能に保つ。
- 不変更新（スプレッド）。小さく焦点を絞ったファイル。
- 初期化は `main.js`、描画は各UIモジュール（flashcard/reader/dashboard）。

## 修正フロー
1. 大きな変更は `docs/plans/YYYY-MM-DD-<feature>.md` に計画を書く。
2. `docs/plans/changes-log.md` に1行追記。
3. 実装後 `node --test`（green 必須）＋ `node tools/validate_data.mjs <level>`。UI変更は a11y を確認（`/web-design-guidelines`）。
4. **git 使用**（コミット/ブランチは通常運用。グローバルの git-workflow に従う）。

## 落とし穴
- edge-tts は `boundary="WordBoundary"` 必須（無いと `timing` が空になりカラオケが壊れる）。
- `file://` では動かない（fetch/ES Modules）。必ず `python3 -m http.server`。
- `js/srs.js` を触ったら `node --test` を必ず green に。
- パスは相対（`data/A1/...`）。フォルダ移動でも動くよう絶対パスをコードに書かない。
