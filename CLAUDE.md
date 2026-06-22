# Deutsch — ドイツ語学習アプリ集（ルート）

Goethe A1/A2 学習の傘リポジトリ。トップに**ホーム（ランチャー）**、配下に 4 メニュー。素 HTML/CSS/JS・ビルド無し・オフライン。

## 起動 / テスト
- 配信: 直下で `./serve.sh`（→ ホーム `http://localhost:8000/`）。`file://` 不可（fetch/ES Modules）。
- テスト: 直下で `node --test tests/*.test.js`（Markdown レンダラ）。各アプリのテストは各フォルダ直下で `node --test`。

## 構成（どこに何があるか）
- `index.html` + `css/` + `js/` … ホーム＋ドキュメントリーダー。メニュー定義は `js/content.js`（`kind` で `docs`/`app` を分岐、`status:'wip'` で「開発中」バッジ）。
- `content/` … リーダーが `#/…` で整形表示する**資料**（Markdown のみ・画面遷移なし）。今は `content/exam-guide/`。
- `apps/` … ホームから**別ページへ遷移**する独立アプリ。`apps/pronunciation/`・`apps/vocabulary/`（各 `CLAUDE.md` 参照）。`apps/speaking/` は今は資料（リーダー表示）だが**アプリ化を準備中**なので `apps/` に置き、ホームでは「開発中」表示。
- `docs/design/bmw-corporate-automotive.md` … **デザイン正本（全アプリ共通）**。

## 制約（厳守）
- ビルド無し・フレームワーク無し・**外部CDN/Webフォント禁止**・オフライン動作。
- デザインは BMW corporate-automotive（白 canvas / blue `#1c69d4` / 0px 矩形 / Inter 700・300 / **ドロップシャドウ禁止**）。
- a11y（Web Interface Guidelines）: コントラスト4.5:1 / `:focus-visible` / タッチ44px / aria / `prefers-reduced-motion` / **emojiをアイコンにしない（SVG）** / 横スクロール無し。
- `js/markdown.js` は純関数。変更したら `node --test tests/*.test.js` を green に。
- パスは相対（絶対パスを書かない）。

## 落とし穴
- リーダーは fetch を使う → サーバ必須。資料間の `.md` リンクはリポジトリルート相対で解決される（`js/content.js` のマニフェストに載っている doc だけアプリ内遷移になる）。`content/` と `apps/` をまたぐリンク（例: `apps/speaking` → `content/exam-guide`）は `../../content/...` のように両方の階層を踏まえて書く。
