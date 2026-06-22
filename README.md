# Deutsch — ドイツ語学習アプリ集

Goethe A1 / A2 向けの学習教材とアプリを 1 つのフォルダにまとめたもの。
ビルド不要・オフライン動作の素の HTML / CSS / JS。トップに**ホーム（ランチャー）**があり、4 つのメニューを切り替えて使う。

## 起動

`deutsch/` 直下で:

```
./serve.sh 8000      # ポート省略時は 8000
```

ターミナルにリンクが表示される。**ホーム** をブラウザで開けば、そこから全メニューに移動できる:

```
  ホーム        →  http://localhost:8000/
  ├ 基礎ドキュ  →  http://localhost:8000/#/exam-guide
  ├ スピーキング→  http://localhost:8000/#/speaking          （アプリ化を開発中）
  ├ 発音アプリ  →  http://localhost:8000/apps/pronunciation/
  └ 単語アプリ  →  http://localhost:8000/apps/vocabulary/
```

`serve.sh` は `deutsch/` 全体を `python3 -m http.server` で配信するラッパー。1 つのサーバで全メニューにアクセスできる。

> `index.html` を `file://` で直接開くのは不可（ES Modules / fetch のためサーバ経由が必須）。
> `python3 -m http.server 8000` を直接実行しても配信できるが、その場合ターミナルにリンクは出ない。

## メニュー

| メニュー | 種別 | 置き場所 | 内容 |
|---|---|---|---|
| **基礎ドキュメント** | 資料 | `content/exam-guide/` | A1 / A2 の試験概要・問題形式・公式模擬問題。ホーム内のリーダーで整形表示。 |
| **スピーキング** | 資料（開発中） | `apps/speaking/` | A2 口述（Sprechen）の丸暗記＆音読教材。現在はホーム内のリーダーで整形表示。独立アプリ化を準備中。 |
| **発音** | アプリ | `apps/pronunciation/` | Anna の自己紹介を全文・文・単語単位で音読。ハイライト＋発音ポイント＋カラオケ音声。 |
| **単語** | アプリ | `apps/vocabulary/` | Goethe A1/A2 単語のフラッシュカード（Leitner）＋ネイティブ音声＋進捗トラッキング。 |

- **資料**（`content/`）は Markdown。ホームの**ドキュメントリーダー**が `#/…` ルートで整形表示する（画面遷移なし・サイドバー目次つき）。
- **アプリ**（`apps/`）はそれぞれ独立した HTML/CSS/JS アプリで、ホームから別ページへ遷移して開く。詳細は各 `README.md`。
- **スピーキング**は今は資料（リーダー表示）だが、独立アプリへ作り変える計画のため `apps/` に置き、ホームでは「開発中」と表示している。

## 構成

```
index.html              ホーム（ランチャー）＋ドキュメントリーダーのシェル
css/styles.css          BMW デザイントークン＋ホーム/リーダーのレイアウト
js/                      content（メニュー定義）, router, home, reader, markdown（自前レンダラ）, main
tests/markdown.test.js   Markdown レンダラの単体テスト（node --test）
docs/design/             デザインキットの正本（全アプリ共通）
content/                 ホームのリーダーが表示する資料（Markdown のみ・画面遷移なし）
  exam-guide/            A1/A2 試験ドキュメント
apps/                    ホームから別ページへ遷移する独立アプリ
  pronunciation/         発音アプリ（独立）
  vocabulary/            単語アプリ（独立）
  speaking/              A2 口述教材。今は資料（リーダー表示）、アプリ化を準備中
serve.sh                 まとめて配信するラッパー
CLAUDE.md                このリポジトリの作業ガイド（簡潔版）
```

## デザイン

全メニューは BMW corporate-automotive デザインキットで統一。正本は **[`docs/design/bmw-corporate-automotive.md`](docs/design/bmw-corporate-automotive.md)**（白 canvas / BMW blue `#1c69d4` / 0px 矩形 / Inter 700・300 / ドロップシャドウ禁止）。各アプリの `css/styles.css` はこのトークンを共有する。

## テスト

```
node --test tests/*.test.js   # ホームの Markdown レンダラ（リポジトリ直下）
```

各アプリのテストはそれぞれのフォルダ直下で `node --test`。
