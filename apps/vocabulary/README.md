# Deutsch 単語アプリ（Goethe A1 / A2）

ゲーテ A1・A2 の単語を、忘却曲線（Leitner）＋ネイティブ音声（カラオケ・見出し語発音）で学ぶローカルアプリ。素の HTML / CSS / JS（ES Modules）。**ビルド不要・オフライン動作**。

## 起動

親フォルダ `deutsch/` の `./serve.sh` でまとめて配信 → **http://localhost:8000/apps/vocabulary/**（詳細は `deutsch/README.md`）。
単体だけなら `apps/vocabulary/` 直下で `python3 -m http.server 8000` → **http://localhost:8000/**。

> `file://` で直接開くのは不可（ES Modules / fetch のためサーバ経由が必須）。

## 使い方

- **レベル切替**: 画面上部で **A1 / A2** を切り替え（進捗・出題はレベルごとに独立）。
- **フラッシュカード**: 見出し語（＋発音 ▶）を見て思い出す → めくる → 「覚えてた / あやふや / 忘れた」（キーボード 1/2/3、Space めくる）。自己評価が Leitner（箱 1〜5、間隔 1/2/4/8/16 日）を動かす。
- **読むだけ**: 検索しながら、各語の意味（JA/EN）と全例文＋音声カラオケ ▶、見出し語の発音 ▶ を一覧で読める。
- **進捗**: 到達度（習得率＝箱5/総数）・箱分布・1日の目標（10〜100）・日次履歴・ストリーク。
- 学習進捗はブラウザの **localStorage** に保存（その端末・そのブラウザのみ。同期なし）。

## 構成

```
index.html              エントリ
css/styles.css          スタイル（BMW corporate デザイン）
js/*.js                 srs / storage / data / audio / reader / flashcard / session / stats / dashboard / main
data/A1/  data/A2/      words.json ＋ audio/*.mp3（例文）＋ audio/lemma/*.mp3（見出し語）
tools/                  音声生成・検証スクリプト（edge-tts）
docs/plans              実装計画・変更ログ（デザイン正本は ../../docs/design/）
tests/                  srs / stats の単体テスト
```

語数: A1 約786語・A2 約584語（A1 と重複しない新規語）。

## 開発

```
node --test                                      # srs / stats の単体テスト
tools/.venv/bin/python tools/tts_generate.py A1  # 例文音声＋タイミング再生成（A2 も）
tools/.venv/bin/python tools/tts_lemma.py A1     # 見出し語音声（A2 も）
```

開発の詳細・規約・落とし穴は `CLAUDE.md` を参照。
