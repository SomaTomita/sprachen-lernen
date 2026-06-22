# Deutsch Aussprache 発音アプリ

Anna の自己紹介文（Vorstellung）を、全文・文・単語の単位で聞き分けながら音読練習するローカルアプリ。
いま発音している箇所がハイライトされ、発音ポイントを単語ごとに確認できる。
素の HTML / CSS / JS（ES Modules）。**ビルド不要・オフライン動作**。`vocabulary` と同設計。

## 起動

親フォルダ `deutsch/` の `serve.sh` でまとめて配信するのが基本（単語アプリと同居）。`deutsch/` 直下で:

```
./serve.sh
```

→ ブラウザで **http://localhost:8000/apps/pronunciation/** を開く（停止: `Ctrl+C`）。

この発音アプリ単体だけ動かすなら、`pronunciation/` 直下で:

```
python3 -m http.server 8000
```

→ **http://localhost:8000/** を開く。

> `index.html` を `file://` で直接開くのは不可（ES Modules と `fetch` のためサーバ経由が必須）。Python が無ければ `npx http-server -p 8000` でも可。

## 使い方

- **全文を再生**: ▶ で本文を頭から通し再生。いまの文が青帯、いまの単語が青反転でハイライトされ、自動スクロール。もう一度押すと停止。
- **文ごと**: 各文の左の ▶ で、その文だけをカラオケ再生。
- **単語ごと**: 単語をクリックすると単体の音声が鳴り、右の「発音のポイント」にその音の解説と文の意味が出る。点線の下線がある語は解説あり。
- **速度**: `速度 0.75x` でゆっくり再生。
- **意味**: `意味を表示` で各文の日本語訳を表示（既定は非表示・発音優先）。単語クリック時はパネルにも意味が出る。
- **発音のポイント**: 全 30 ルール（V=無声、ich/ach の ch、sch、ö/ü、語末 -er/-en、zw、sp/st…）の一覧。
- 設定（速度・意味表示）はブラウザの **localStorage** に保存（その端末・そのブラウザのみ）。

## 構成

```
index.html              エントリ
css/styles.css          スタイル（BMW コーポレート系トークン）
js/*.js                 アプリ本体（util / data / storage / player / tips / reader / main）
data/text.json          本文・発音ルール・文ごとの単語タイミング
data/audio/*.mp3        文ごとの音声（カラオケ用）
data/audio/words/*.mp3  単語ごとの音声（単体再生用）
tools/tts_generate.py   音声生成（edge-tts）
tools/validate_data.mjs データ整合チェック
tests/                  純粋ロジック / データの単体テスト
docs/                   実装計画・発音解説まとめ・デザイン仕様
```

## テスト

```
node --test                  # util + data
node tools/validate_data.mjs # text.json の整合（タイミング⇔トークン・ルール参照）
```

## 音声の再生成（任意）

```
python3 -m venv tools/.venv && tools/.venv/bin/pip install edge-tts
tools/.venv/bin/python tools/tts_generate.py
```

edge-tts（de-DE-KatjaNeural）で文の MP3 ＋ 単語タイミングと、単語ごとの MP3 を生成。
生成済みはスキップ＝再実行で途中再開可（ネットワーク必須）。
