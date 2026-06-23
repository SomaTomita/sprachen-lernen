# content — リーダー表示用の資料（Markdown）

ホームの**ドキュメントリーダー**が `#/<section>/<slug>` ルートで整形表示する資料置き場。**Markdown のみ・画面遷移なし**（別ページへ遷移する `apps/` の独立アプリとは別物）。

## 構成

- `exam-guide/` … Goethe A1/A2 の試験資料
  - `exam-info/` … 試験概要（`goethe-a1.md` / `goethe-a2.md`）
  - `question-types/` … 問題形式・公式模擬問題（`a1-*` / `a2-*`）
- `grammar/` … 文法レッスン解説 `NN-name.md`（01–05）。**練習問題は別アプリ** `apps/grammar-exercises/`。作成規約は [`grammar/CLAUDE.md`](grammar/CLAUDE.md)、継続追加は issue #10 で管理。

## 表示の仕組み

- メニュー・目次は `js/content.js` の `SECTIONS`（`kind: "docs"`）が正本。**`slug` / `title` / `path` を登録した md だけ**リーダーに出る。
- リーダーは `fetch` で md を読むので**サーバ必須**（直下で `./serve.sh`。`file://` 不可）。
- パスは相対。資料間の `.md` リンクは**リポジトリルート相対**で解決される（`content/` と `apps/` をまたぐ場合は `../../` のように両階層を踏まえて書く）。

## 資料を追加するとき

1. `content/<section>/…/NN-name.md` を置く（資料は Markdown のみ）。
2. `js/content.js` の該当セクションに `{ slug, title, path }` を追記。
3. 文法は `grammar/CLAUDE.md` の規約に従い、練習問題（`apps/grammar-exercises/data/NN.json`）と相互リンクもセットで（issue #10）。
