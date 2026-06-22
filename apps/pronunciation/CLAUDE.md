# Deutsch 発音アプリ (Vorstellung)

オフラインのドイツ語発音練習アプリ。教材 Vorstellung（Anna の自己紹介・全3段落）を、全文・文・単語の単位で聞き分けながら音読する。いま発音している箇所をハイライトし、発音ポイントを単語ごとに表示。素の HTML/CSS/JS、ビルド不要。`vocabulary` と同設計。

## よく使うコマンド
`pronunciation/` 直下で実行（コードもコマンドも相対パス＝フォルダ移動可）。
- 起動: 親 `deutsch/` の `./serve.sh`（単語アプリと同時配信。`http://localhost:8000/apps/pronunciation/`・`/apps/vocabulary/`）。発音アプリ単体は `apps/pronunciation/` で `python3 -m http.server 8000`（→ `http://localhost:8000/`）。`file://` 直開きは不可（ES Modules/fetch のためサーバ必須）
- テスト: `node --test`（`js/util.js` の純関数＋`data/text.json` の整合。現在7件）
- データ検証: `node tools/validate_data.mjs`（タイミング⇔トークン件数・ルールID参照を担保）
- 音声生成: `tools/.venv/bin/python tools/tts_generate.py`（文MP3＋単語タイミング＋単語MP3）。venv は `python3 -m venv tools/.venv && tools/.venv/bin/pip install edge-tts` で用意、または `vocabulary` の venv を流用

## スタックと制約
- **素の HTML/CSS/JS（ES Modules）。ビルド無し・フレームワーク無し・DB無し。localStorage は設定保存のみ。** TypeScript は使わない。
- オフライン動作。**外部CDN/Webフォントを読み込まない**（Inter＋system フォールバック）。
- 音声は edge-tts（`de-DE-KatjaNeural`）で**事前生成**。実行時は同梱MP3を再生、欠落時 Web Speech フォールバック（`js/player.js` の `playWord`/`speakFallback`）。
- デザイン: BMW corporate-automotive（正本は**リポジトリ直下** `../../docs/design/bmw-corporate-automotive.md`＝全アプリ共通）。`css/styles.css` は vocabulary からコピー＋末尾に発音用を追記。白canvas / BMW blue `#1c69d4` / 0px矩形 / Inter 700・300 / **ドロップシャドウ禁止**。
- アクセシビリティ(Web Interface Guidelines): コントラスト4.5:1 / `:focus-visible` / タッチ44px / aria / `prefers-reduced-motion` / **emojiをアイコンにしない（SVGを使う）** / 横スクロール無し。

## 構成
```
index.html              エントリ
css/styles.css          BMWトークン＋発音用レイアウト
js/                     util, data, storage, player, tips, reader, main
data/text.json          本文・発音ルール・文ごとの単語タイミング
data/audio/*.mp3        文ごと音声（カラオケ用、p1-s1.mp3 …）
data/audio/words/*.mp3  単語ごと音声（単体再生用、<slug>.mp3）
tools/                  tts_generate.py（edge-tts生成）, validate_data.mjs（.venv は音声生成時に作成 or vocabulary を流用）
docs/                   plans（実装計画）, aussprache-erklaerung.md（発音解説まとめ）。デザイン正本は ../../docs/design/
tests/                  util.test.js, data.test.js, text-content.test.js
```
> ローカルサーバは親 `deutsch/serve.sh`（両アプリ配信）。発音単体は `python3 -m http.server`。

## データモデル（`data/text.json`）
```jsonc
{
  "id": "vorstellung", "title": "...", "title_ja": "...", "voice": "de-DE-KatjaNeural",
  "source": "...", "note": "...",
  "rules": [ { "id": "ich-laut", "label": "...", "detail": "...", "examples": ["ich"] } ],
  "paragraphs": [ { "id": "p1", "sentences": [ {
    "id": "p1-s1", "de": "Mein Name ist Anna.", "ja": "私の名前はアンナです。",
    "audio": "audio/p1-s1.mp3",
    "timing": [ { "w": "Mein", "s": 0.1, "e": 0.4 } ],   // edge-tts WordBoundary（秒）
    "tokens": [ { "t": "Anna.", "word": "Anna", "r": ["accent-first"] } ]
  } ] } ]
}
```
- `rules` は再利用可能な発音ルール（DRY）。`tokens[].r` が id で参照。`rules` とアプリの「発音のポイント」一覧・`docs/aussprache-erklaerung.md` は一致させる。
- `tokens[].t` = 画面表示（句読点込み）。`tokens[].word` = 単語音声・slug 算出用（省略時は `t` から句読点除去）。
- **文分割は意味のまとまり（息継ぎ単位）**。文末・コロン・コンマで区切る。連結すると教材原文どおりになる。
- **`tokens` の件数 == `timing` の件数**（句読点単独の WordBoundary は生成時に除外）。`validate_data.mjs` が担保。
- 単語音声ファイル名 = `slugify(word)`（小文字化, ä→ae ö→oe ü→ue ß→ss, 非英数→`-`）。`js/util.js` と `tools/tts_generate.py` で同一規則。
- **数詞**は `t` に数字（"15"）、`word`・`de` に読み（"fünfzehn"）。理由 → 落とし穴参照。

## localStorage（キー `deutsch-aussprache-v1`）
```json
{ "rate": 1, "showMeaning": false }
```
- `rate`: 1 / 0.75（再生速度）。`showMeaning`: 文の日本語訳キャプションの表示（既定OFF＝発音優先）。
- 構造変更時は読み込み時に既定値で補完（`js/storage.js`）。

## 再生・ハイライト / UI
- **全文再生**（`player.js` `playAll`）: 文を順に再生。いまの文＝`.sentence.is-playing`、いまの語＝`.kw.active`（青反転）をハイライトし自動スクロール。
- **文ごと**: 各文の ▶（`.sentence-play`）でその文のみカラオケ。
- **単語**: クリックで単体音声＋「発音のポイント」（該当 `rules`）と文の意味をパネル表示。ポイントのある語は点線下線（`.kw.has-tip`）。
- **速度トグル**（1.0x/0.75x）・**意味トグル**（控えめ・既定OFF）・**発音のポイント一覧**ビュー。
- カラオケ中核 = `player.js` `playSentence` の `requestAnimationFrame` ループ。`util.js` `activeIndexAt(timing, audio.currentTime)` で active 語を切替（vocabulary `audio.js` `playKaraoke` の移植）。

## コンテンツ（テキスト・発音ルール）
- テキストは教材 Vorstellung（Anna の自己紹介、全3段落）。第1〜3段落ともユーザー提供のスクリーンショット原文に一致（`text.json` の `note` 参照）。
- 発音ルールは YouTube 日本独文学会『音読トレーニング』解説に対応（`docs/aussprache-erklaerung.md` に段落別ポイント＋早見表）。
- 語を追加・変更したら: 該当 `tokens` に `r`（ルール）付与 → 音声再生成 → `node tools/validate_data.mjs` と `node --test` を green に。

## コードスタイル
- `js/util.js` は**純関数**（`slugify` / `activeIndexAt` / `flattenSentences`）でテスト可能に保つ。DOM・副作用なし。
- 不変更新（スプレッド）。小さく焦点を絞ったファイル。初期化は `main.js`、描画は `reader.js`/`tips.js`、音声は `player.js`。

## 修正フロー
1. 大きな変更は `docs/plans/YYYY-MM-DD-<feature>.md` に計画を書く。
2. `text.json` 変更後 → `node --test`（green 必須）＋ `node tools/validate_data.mjs`。音声が変わる文は該当 `data/audio/*.mp3` を削除して再生成（スクリプトは生成済みをスキップ＝途中再開可）。
3. UI 変更は a11y を確認（`/web-design-guidelines`、`/ui-ux-pro-max`）。
4. git は親 `deutsch/` のグローバル方針に従う（`.gitignore` 済み。`data/audio/**/*.mp3` はオフライン再生のため**コミット対象**＝無視しない）。

## 落とし穴
- edge-tts は `boundary="WordBoundary"` 必須（無いと `timing` が空になりカラオケが壊れる）。
- **数字（"15" 等）は WordBoundary を出さない** → `de` は読み下し（"fünfzehn"）にして件数を合わせ、`tokens[].t` は表示用に数字、`word` に読みを置く。
- `tokens` 件数 ≠ `timing` 件数になるとカラオケがずれる → `validate_data.mjs` が検出。直したら音声を再生成。
- `file://` では動かない（fetch/ES Modules）。必ずサーバ経由（親 `deutsch/serve.sh` か `python3 -m http.server`）。
- パスは相対（`data/...`, `data/audio/words/...`）。フォルダ移動でも動くよう絶対パスを書かない。
- 単語音声が無い slug はクリック時に Web Speech へフォールバック（音色は変わる）。
