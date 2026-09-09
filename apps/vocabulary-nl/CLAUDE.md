# Nederlands 単語アプリ (オランダ語 A1/A2)

オフラインのオランダ語単語学習アプリ。忘却曲線(Leitner)＋ネイティブ音声(カラオケ)＋進捗トラッキング。素の HTML/CSS/JS、ビルド不要。ドイツ語版 `../vocabulary/` の複製で、UX は同等。**独語アプリ (`apps/vocabulary/`) には触れない。**

## よく使うコマンド
- 起動: ルート `sprachen-lernen/` の `./serve.sh` → `http://localhost:8000/apps/vocabulary-nl/`（この単語アプリ単体は `apps/vocabulary-nl/` 直下で `python3 -m http.server 8000` → `http://localhost:8000/`）。`file://` 直開きは不可（ES Modules/fetch のためサーバ必須）。以降のテスト/検証/音声生成コマンドは `apps/vocabulary-nl/` 直下で実行。
- テスト: `node --test`（`srs`・`stats`・`slug`・`build_seed`・`allowlist` の純関数）。
- データ検証: `node tools/validate_data.mjs A1`（A2 も同様。音声生成前は `--no-audio` を付けて audio/timing 必須を緩める）。
- 語彙スパイラル検証: `tools/.venv/bin/python tools/check_vocab.py A1`（A1→A1 語彙のみ、A2→A1∪A2 語彙のみ。spaCy `nl_core_news_sm`・venv・検証時のみ）。
- 例文音声生成: `tools/.venv/bin/python tools/tts_generate.py A1`（MP3＋単語タイミング）。
- 見出し語音声生成: `tools/.venv/bin/python tools/tts_lemma.py A1`。

## 語彙リストを公式ソースから再構築する
語彙の正本は `tools/raw/<level>.jsonl`（→ `node tools/build_seed.mjs <level> tools/raw/<level>.jsonl` で `data/<level>/words.json` を生成）。元データは公式 PDF から作れる:

```bash
# 1) 公式 PDF を取得（numo NT2 モジュール語彙＝主題別 / NT2 TaalMenu＝頻度順）
curl -sL -o /tmp/numo-a0a1.pdf https://assets.numo.nl/wp/Woordenlijst-nt2.pdf
curl -sL -o /tmp/numo-a1a2.pdf https://assets.numo.nl/wp/Woordenlijst-nt2-modules-A1-A2.pdf
curl -sL -o /tmp/nt2-freq.pdf  https://nt2taalmenu.nl/nt2/lijsten/engels_fre.pdf
# 2) テキスト化（poppler の pdftotext。-layout は必須＝表の列が崩れる）
pdftotext -layout /tmp/numo-a0a1.pdf /tmp/numo-a0a1.txt
pdftotext -layout /tmp/nt2-freq.pdf  /tmp/nt2-freq.txt
# 3) パース（lemma＋品詞 / lemma＋冠詞＋英訳＋頻度ランク）
node tools/parse_numo.mjs /tmp/numo-a0a1.txt > /tmp/numo_a0a1.json   # 766 lemmas
node tools/parse_freq.mjs /tmp/nt2-freq.txt  > /tmp/nt2_freq.json     # 2050 lemmas
```

**必ず2ソースを突き合わせること。** numo は**主題別（食べ物・体・衣類などの具体名詞中心）で高頻度コア語が抜ける**。A0–A1 リストは頻度上位100語のうち55語（`niet / en / goed / doen / komen / maken / kind / man / vrouw` 等）を欠いていた。A1–A2 リストも同様（`snel / naam / thuis / misschien`、さらに `vier` `vijf` すら無い）。**片方だけで作ると例文が不自然になる**（コア語を避けた言い回しを強いられる）。現行 A1=890語 = numo 766 ＋ 頻度リスト上位200帯の欠落124語。

## スタックと制約
- **素の HTML/CSS/JS（ES Modules）。ビルド無し・フレームワーク無し・localStorage・DB無し。** TypeScript は使わない（独語版で過去に導入→素JSへ戻した。再導入しない）。
- オフライン動作。**外部CDN/Webフォントを読み込まない**（Inter/Arial＋system フォールバック）。
- 音声は edge-tts で**事前生成**（`nl-NL-ColetteNeural`。男性版 `nl-NL-MaartenNeural`）。実行時は同梱MP3を再生、欠落時 Web Speech フォールバック（`nl-NL`）。
- 例文の語彙スパイラル検証にのみ spaCy `nl_core_news_sm`（Python venv・検証時のみ／アプリ非同梱）。
- 文法・語彙の天井は Taalprofielen（Nederlandse Taalunie）準拠（独語版が Goethe Prüfungsziele に依拠するのと同様）。
- デザイン: BMW corporate-automotive（正本は**リポジトリ直下** `../../docs/design/bmw-corporate-automotive.md`＝全アプリ共通）。白canvas / BMW blue `#1c69d4` / 0px矩形 / Inter 700・300 / **ドロップシャドウ禁止** / 暖色＝道標のみ。
- アクセシビリティ(Web Interface Guidelines): コントラスト4.5:1 / `:focus-visible` / タッチ44px / aria / `prefers-reduced-motion` / **emojiをアイコンにしない** / 横スクロール無し。

## 構成
```
index.html              エントリ
css/styles.css          BMWトークン＋レイアウト
js/                     srs, storage, data, audio, reader, flashcard, session, stats, dashboard, main
data/A1, data/A2        words.json ＋ audio/*.mp3 ＋ audio/lemma/*.mp3
tools/                  edge-tts生成・スキーマ検証・語彙スパイラル検証, .venv, sentence_pipeline.md
docs/plans              実装計画・変更ログ（デザイン正本は ../../docs/design/）
tests/                  srs.test.js, stats.test.js, slug.test.js, build_seed.test.js, allowlist.test.js
```

## データモデル（words.json 1件）
```json
{ "id":"a1-huis", "lemma":"huis", "pos":"noun", "article":"het", "plural":"huizen",
  "level":"A1", "lemmaAudio":"audio/lemma/a1-huis.mp3",
  "meanings":[{"ja":"家","en":"house"}],
  "examples":[{"nl":"Het huis is groot.","ja":"その家は大きい。","en":"The house is big.",
    "audio":"audio/a1-huis-1.mp3","timing":[{"w":"Het","s":0.0,"e":0.30}]}] }
```
- **独語版との構造差は 1 点のみ:** 例文の文フィールドが `de` ではなく **`nl`**。
- `id` = `a1-`/`a2-` + `slug(lemma)`。スラッグは **Unicode NFD で結合記号を除去**（`café→cafe` / `één→een` / `coördinatie→coordinatie`）→ 小文字化 → `a-z0-9` 以外を `-` に → 連続 `-` を畳む → 端 `-` 除去。**独語の `ä→ae` 展開は使わない。**
- 名詞は `article`（**`de` か `het`**）必須。名詞以外は `article` を持たない。`plural` は任意。
- 例文音声 `audio/<id>-<n>.mp3`、見出し語 `audio/lemma/<id>.mp3`。

## localStorage（キー `nederlands-vocab-v1`）
```json
{ "cards": { "<id>": { "box":1, "dueDay":0, "lastReviewedDay":null, "timesSeen":0, "timesGood":0 } },
  "settings": { "level":"A1", "dailyGoal":30 },
  "history": { "YYYY-MM-DD": { "new":0, "review":0 } } }
```
- 独語アプリの `deutsch-vocab-v1` と**衝突させない**（別名前空間）。
- 構造変更時は読み込み時に既定値で補完（マイグレーション）。更新は `js/srs.js` の純関数でイミュータブルに。

## SRS / 進捗
- Leitner 5箱（間隔 1/2/4/8/16日）。good→箱+1 / fuzzy→据置 / forgot→箱1。
- セッション = 期日が来た復習を全部＋目標到達まで新規を補充（新規 = `max(0, dailyGoal − due数)`）。
- 到達度（見出し=習得率 箱5/総数、＋加重カバレッジ・学習開始率）・箱分布・日次履歴・1日の目標（10–100、新規＋復習の合計）。

## 例文の文法・語彙制約（スパイラルラーニング）
- A1/A2 各レベルの**天井を超えない**（`tools/sentence_pipeline.md`）。LLM生成 →**独立した検証パス**で担保。
- **語彙スパイラル**: A1 例文は A1 語彙のみ、A2 例文は A1∪A2 語彙（累計）。LLM の文法検証（Task 13 相当）と spaCy による決定的な語彙メンバーシップ検証（`tools/check_vocab.py` + `tools/function_words_nl.txt`）の**二段でゲート**する。どちらも 0 違反が条件。

## コードスタイル
- `srs.js`・`stats.js` は**純関数**（DOM・副作用なし）でテスト可能に保つ。
- 不変更新（スプレッド）。小さく焦点を絞ったファイル。
- 初期化は `main.js`、描画は各UIモジュール（flashcard/reader/dashboard）。

## 修正フロー
1. 大きな変更は `docs/plans/YYYY-MM-DD-<feature>.md` に計画を書く。
2. `docs/plans/changes-log.md` に1行追記。
3. 実装後 `node --test`（green 必須）＋ `node tools/validate_data.mjs <level>`＋ `check_vocab.py`。UI変更は a11y を確認（`/web-design-guidelines`）。
4. **git 使用**（コミット/ブランチは通常運用。グローバルの git-workflow に従う）。

## 落とし穴
- **現状 A1 のみ。** `js/storage.js` の `LEVELS` は**データが存在するレベルだけ**を並べる（今は `['A1']`）。`LEVELS` に載せるとレベルタブが描画されるので、`data/A2/words.json` が無い状態で `'A2'` を載せると読込エラー画面になる。A2 を作ったら `LEVELS` に追加し、ホームの tagline（リポジトリ直下 `js/content.js`）も A1/A2 表記に戻す。
- **独語アプリ (`apps/vocabulary/`) には触れない。** コアロジック（srs/session/stats/dashboard）は独語版のコピーで、共通バグ修正は両アプリに適用が必要（changes-log に注記する）。
- edge-tts は `boundary="WordBoundary"` 必須（無いと `timing` が空になりカラオケが壊れる）。
- `file://` では動かない（fetch/ES Modules）。必ず `python3 -m http.server`。
- `js/srs.js` を触ったら `node --test` を必ず green に。
- パスは相対（`data/A1/...`）。フォルダ移動でも動くよう絶対パスをコードに書かない。
