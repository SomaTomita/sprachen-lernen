# Français 単語アプリ (フランス語 A1)

オフラインのフランス語単語学習アプリ。忘却曲線(Leitner)＋ネイティブ音声(カラオケ)＋進捗トラッキング。素の HTML/CSS/JS、ビルド不要。オランダ語版 `../vocabulary-nl/` の複製で、UX は同等。**独語アプリ (`apps/vocabulary/`) と蘭語アプリ (`apps/vocabulary-nl/`) には触れない。**

## よく使うコマンド
- 起動: ルート `study-deutsch/` の `./serve.sh` → `http://localhost:8000/apps/vocabulary-fr/`（単体は `apps/vocabulary-fr/` 直下で `python3 -m http.server 8000`）。`file://` 直開きは不可（ES Modules/fetch のためサーバ必須）。以降のコマンドは `apps/vocabulary-fr/` 直下で実行。
- テスト: `node --test`（`srs`・`stats`・`session`・`slug`・`elision`・`build_seed`・`allowlist` の純関数）。
- データ検証: `node tools/validate_data.mjs A1`（音声生成前は `--no-audio` で audio/timing 必須を緩める）。
- 語彙スパイラル検証: `tools/.venv/bin/python tools/check_vocab.py A1`（spaCy `fr_core_news_sm`・venv・検証時のみ）。
- 音声生成: `tools/.venv/bin/python tools/tts_lemma.py A1` → `tools/.venv/bin/python tools/tts_generate.py A1`。**両者が words.json を書くので必ず逐次実行**。長時間なのでデタッチ推奨。

## 語彙リストを公式ソースから再構築する
語彙の正本は `tools/raw/a1.jsonl`（→ `node tools/build_seed.mjs A1 tools/raw/a1.jsonl` で `data/A1/words.json` を生成）。

```bash
# 1) ソース取得（tools/sources/ は gitignore。再取得で再現できる）
curl -sL -o tools/sources/flelex.tsv \
  https://cental.uclouvain.be/cefrlex/static/resources/fr/FleLex_TT_Beacco.tsv
curl -sL -o tools/sources/Lexique383.tsv \
  http://www.lexique.org/databases/Lexique383/Lexique383.tsv
# 2) パース → 結合
node tools/parse_flelex.mjs tools/sources/flelex.tsv A1 > tools/raw/flelex_a1.json   # 1247 entries
node tools/parse_lexique.mjs tools/sources/Lexique383.tsv > tools/raw/lexique.json
node tools/build_wordlist.mjs tools/raw/flelex_a1.json tools/raw/lexique.json A1 > tools/raw/a1.jsonl
```

- **FLELex = レベルの正本**（CEFR 判定つき。A1=1247 / A2=679）。**蘭語の numo と違い機能語と基本動詞を最初から含む**ので、コア語欠落の穴は無い。
- **Lexique383 = 性(le/la)・複数形・頻度の正本。** A1 名詞 633 のうち **595 (94%) の性が自動で取れる**（蘭語では540名詞すべてを LLM 推定した）。
- **落とし穴3つ（実測済み）:**
  1. FLELex は **CRLF**。`\r` を除去しないと `level` 列が `"A1\r"` になり全件外れる。
  2. FLELex は**同形異義を品詞別の行で持つ**。`être` は NOM=B1 / VER=A1。`word` だけで1行に畳むと基本動詞が A1 から落ちる。**必ず (word, tag) 単位で扱う。**
  3. FLELex の品詞タグに誤りがある（`chère` `drôle` `gauche` `pauvre` `jeune` `nouvelle` は NOM だが実際は形容詞）。gloss パスで `pos` を訂正する。

## スタックと制約
- **素の HTML/CSS/JS（ES Modules）。ビルド無し・フレームワーク無し・localStorage・DB無し。** TypeScript は使わない。
- オフライン動作。**外部CDN/Webフォントを読み込まない**。
- 音声は edge-tts で**事前生成**（`fr-FR-DeniseNeural`。男性版 `fr-FR-HenriNeural`）。実行時は同梱MP3を再生、欠落時 Web Speech フォールバック（`fr-FR`）。
- 語彙スパイラル検証にのみ spaCy `fr_core_news_sm`（venv・検証時のみ／アプリ非同梱）。
- 文法・語彙の天井は **Référentiel A1 / DELF A1** 準拠（独版 Goethe・蘭版 Taalprofielen に対応）。
- デザイン: BMW corporate-automotive（正本は `../../docs/design/bmw-corporate-automotive.md`）。白canvas / BMW blue `#1c69d4` / 0px矩形 / Inter 700・300 / **ドロップシャドウ禁止**。
- a11y: コントラスト4.5:1 / `:focus-visible` / 44px / aria / `prefers-reduced-motion` / **emojiをアイコンにしない** / 横スクロール無し。

## データモデル（words.json 1件）
```json
{ "id":"a1-maison", "lemma":"maison", "pos":"noun", "article":"la", "plural":"maisons",
  "level":"A1", "lemmaAudio":"audio/lemma/a1-maison.mp3",
  "meanings":[{"ja":"家","en":"house"}],
  "examples":[{"fr":"La maison est grande.","ja":"その家は大きい。","en":"The house is big.",
    "audio":"audio/a1-maison-1.mp3","timing":[{"w":"La","s":0.0,"e":0.22}]}] }
```
- 例文の文フィールドは **`fr`**（独版 `de` / 蘭版 `nl`）。
- 名詞は `article` = **`le`** か **`la`**（文法性）。**`l'` は保存しない** — 表示形は `displayHeadword()` で算出する（下記エリジオン）。
- `id` = `a1-` + `slug(lemma)`。スラッグは **合字 œ/æ を展開してから** NFD で結合記号除去（`sœur→soeur` / `café→cafe` / `être→etre`）。**合字は NFD で分解されないので展開が必須**（怠ると `sœur→s-ur` になる）。
- `plural` は任意。不規則あり（`journal→journaux` / `œil→yeux` / `cheval→chevaux`）。

## エリジオン（フランス語固有）
`le`/`la` は母音・無音 h の前で `l'` に縮約する。**表示形は保存せず純関数で算出**する。
- 実装: `tools/elision.mjs`（Node 用）と `js/elision.js`（ブラウザ用）の**同内容2ファイル**。ビルドが無いため共有せず複製し、**同期テストで差異を検出**している（`tests/elision.test.js`）。片方を直したら必ず両方直す。
- 有音 h（`le héros`）は縮約しないので `HARD_H` 例外集合で除外する。A1 に該当語が増えたらここに追加。

## localStorage（キー `francais-vocab-v1`）
独語 `deutsch-vocab-v1` / 蘭語 `nederlands-vocab-v1` と**衝突させない**。構造は蘭語版と同じ（cards / settings / history）。

## 例文の文法・語彙制約（スパイラルラーニング）
- A1 の天井を超えない（`tools/sentence_pipeline.md`）。LLM生成 → **独立した検証パス**で担保。
- **語彙スパイラル**: A1 例文は A1 語彙のみ。LLM の文法検証と spaCy による決定的な語彙メンバーシップ検証（`check_vocab.py` + `tools/function_words_fr.txt`）の**二段でゲート**。どちらも 0 違反が条件。
- **日本語訳は常体で統一**（〜する / 〜だ）。生成プロンプトに焼き込む。

## 落とし穴
- **現状 A1 のみ。** `js/storage.js` の `LEVELS` は**データが存在するレベルだけ**を並べる（今は `['A1']`）。`data/A2/words.json` が無い状態で `'A2'` を載せると**タブが 404 エラー画面を出す**（蘭語版で実際にやった）。
- **独語・蘭語アプリには触れない。** コアロジック（srs/session/stats/dashboard）は蘭語版のコピー＝**3コピー目**。共通バグ修正は3アプリに適用が必要（changes-log に注記する）。
- edge-tts は `boundary="WordBoundary"` 必須（無いと `timing` が空になりカラオケが壊れる）。
- `tts_lemma.py` と `tts_generate.py` は**同時実行不可**（両者が words.json を書く）。
- `file://` では動かない。必ず HTTP サーバ経由。
- パスは相対（`data/A1/...`）。絶対パスをコードに書かない。
