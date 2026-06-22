# Deutsch 文法コンテンツ — 作成規約

ここは文法レッスンの**解説（Markdown）**を置く場所。ホームのリーダーが `#/grammar/<slug>` で整形表示する。
**練習問題は別アプリ** `apps/grammar-exercises/` にあり、解説とは分離する（リポジトリの「docs=リーダー / app=対話的」方針）。

> **文法は継続的に増える**。レッスン追加（解説＝ここ ＋ 練習＝`apps/grammar-exercises/`）は GitHub issue **#10**（文法コンテンツ継続追加トラッカー・close しない）で管理する。手順は下記「鉄則」に従い、足すたびに #10 のチェックリストを更新（PR に `Refs #10`・1レッスン = 1 PR を目安）。

## 鉄則：新しいレッスンは「解説＋問題＋登録＋相互リンク」を必ずセットで作る

1. **解説** `content/grammar/NN-name.md` … 解説のみ。**練習問題・解答を md に書かない**（過去の 01/02 から問題を撤去済み。`## ❌ よくある間違い` のような解説表は残してよい）。
2. **問題** `apps/grammar-exercises/data/NN.json` … 対応する md の**論点だけ**で構成（＝解説の復習になる）。
3. **登録**
   - `js/content.js` の `grammar` セクションに解説 doc を追加（`slug` / `title` / `path`）。
   - `apps/grammar-exercises/js/data.js` の `LESSONS` に `{ id:"NN", title:"…" }` を追加。
4. **相互リンク**
   - 解説 md の冒頭と末尾に練習リンク `> 🔗 **練習問題**: [...](apps/grammar-exercises/?lesson=NN)`（root 相対でよい＝リーダーは root 配信）。
   - 問題 JSON の `doc` に解説への戻りリンク `"../../#/grammar/<slug>"` を入れる。

## 問題 JSON の形式（6タイプ）

各問題は `rule`（解く前の短い法則紹介）＋ `explain`（解いた後・**正解／不正解どちらでも表示**・①②③の多論点）を持つ。
`fill` は複数ブランクで「1問でいろいろ学べる」状態にする。

- `choice` … `options:[]`, `answer:<index>`。`"instant": true` で**選んだ瞬間に即採点**（チェック不要・テンポ重視）。
- `match` … `pairs:[{left,right}]`。左の項目に右のトークンを**ドラッグ／タップ移動**で対応づけ、全部置いたら即採点（サクサク系）。
- `fill` … `blanks:[{accept:[…]}]`（`prompt` 内の `___` を順に対応）
- `table` … `columns:[]`, `rows:[{cells:[…]}]`（セルは文字列＝ラベル / `{accept:[]}`＝空欄）
- `transform` … `accept:[…]`（文全体・複数正解可）
- `free` … `answer:"…"`（自動採点せず模範解答を表示＝自己採点。和訳・自由作文向け）

### 出題順とボリューム（テンポ）
- 1レッスン **約20問**。**前半6〜8問は“サクサク”系**（`instant` 選択・`match`）を前に置いてテンポをつける → 中盤以降に table / 複数ブランク fill / transform / free を配置。
- 穴埋め記述（ライティング）を序盤に置かない。最初は「選ぶ／対応づける」で素早く正解できる流れにする。

詳細スキーマと設計根拠:
[apps/grammar-exercises/docs/plans/2026-06-22-grammar-exercises-design.md](../../apps/grammar-exercises/docs/plans/2026-06-22-grammar-exercises-design.md)

## 守ること

- 採点は `apps/grammar-exercises/js/grade.js`（純関数：正規化＋`ß↔ss`許容）。触ったら `cd apps/grammar-exercises && node --test` を green に。
- `data.test.js` の整合（**≥20問・序盤に instant 選択/match を含む・想定正解が自身の採点を通る**）を満たすこと。落ちたら問題側を直す（テストを緩めない）。
- ドイツ語は md（文法検証済み）から答えを導く。新しい語を出すなら md 側にも論点があること。
- a11y / デザイン（BMW corporate-automotive・emojiをUIアイコンにしない・横スクロール無し等）はルート規約を継承。
- トラッキングしない（localStorage 保存なし）。パスは相対。

## 現状

- `01`〜`05`（人称代名詞 / 動詞の現在人称変化 / 名詞の性 / 複数形 / 格変化）… すべて **解説＋練習**（`data/01.json`〜`data/05.json`）あり。各レッスン約20問・序盤はサクサク系（match / instant choice）。
- 新レッスン（`06-…`）は上記「鉄則」に従って追加する。`data.test.js` は `data/*.json` を**データ駆動**で検証するので、JSON を足せば自動でテスト対象になる（`data.js` の `LESSONS` 追加と md 相互リンクは忘れずに）。
