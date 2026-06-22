# 文法練習アプリ (apps/grammar-exercises) 実装計画

> **For Claude:** REQUIRED SUB-SKILL: 実装は superpowers:executing-plans（無ければ subagent-driven で1タスクずつ）で進める。

**Goal:** `content/grammar/` の各レッスンに準拠した、トラッキング無し・即時採点・解説つきの文法練習アプリを `apps/grammar-exercises/` に作る。

**Architecture:** 素HTML/CSS/JS（ES Modules）の独立アプリ。解説はリーダー（`content/grammar/*.md`）に残し、問題は `apps/grammar-exercises/data/<lesson>.json` から fetch して描画。採点ロジックは純関数 `grade.js`（`node --test`）。リーダー側コード（markdown.js/router.js/reader.js）は無改変。

**Tech Stack:** Vanilla JS (ES Modules), `node --test`, fetch, BMW corporate-automotive CSS トークン。ビルド・依存・外部CDN無し（[[no-npm-deps]]）。

**設計根拠:** [2026-06-22-grammar-grammar-exercises-design.md](./2026-06-22-grammar-grammar-exercises-design.md)

**コミットについて:** 各タスクに commit ステップを書くが、実際のコミットはリポジトリ所有者の方針（依頼時のみ）に従う。まとめてでも可。

---

## 用語と不変条件（最初に読む）

- 採点正規化ルール（`grade.js`）: trim → 小文字化 → 連続空白を1つに → `ß`→`ss` → 末尾の `.` を1つ除去。`?`/`!` と母音 ä/ö/ü は保持（学習上意味があるため）。
- 各問題は `rule`（解く前の短い法則）と `explain`（解いた後・正解/不正解どちらでも表示・①②③の多論点）を持つ。
- トラッキング禁止: localStorage 等への保存はしない。スコアはセッション内表示のみ。
- a11y: 色のみで正誤を示さない（SVG＋テキスト）、`aria-live`、44px、`:focus-visible`、`prefers-reduced-motion`、横スクロール無し。
- パスは相対。絶対パス禁止。

---

## Task 1: アプリ骨組みとホーム登録

**Files:**
- Create: `apps/grammar-exercises/index.html`
- Create: `apps/grammar-exercises/js/main.js`（空のエントリで可・後タスクで実装）
- Modify: `js/content.js`（ホームに「文法練習」カード追加）

**Step 1: index.html を作る**

最小の足場。CSS と main.js を読み込む。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>文法練習 · Deutsch</title>
    <link rel="icon" href="../../favicon.svg" />
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body>
    <main id="app" class="app">読み込み中…</main>
    <script type="module" src="js/main.js"></script>
  </body>
</html>
```

**Step 2: js/main.js をプレースホルダで作る**

```js
// main.js — エントリ。後タスクで data 読み込み・描画を実装する。
const app = document.getElementById("app");
app.textContent = "準備中";
```

**Step 3: js/content.js にホームカードを追加**

`SECTIONS` 配列の `vocabulary` の後ろに追加（`apps/vocabulary` カードの直後）:

```js
  {
    id: "grammar-exercises",
    label: "文法練習",
    kind: "app",
    href: "apps/grammar-exercises/",
    tagline:
      "文法レッスン(01・02)の練習問題。穴埋め・表埋め・選択・書き換えを即時採点＋解説。",
  },
```

**Step 4: 動作確認**

Run: リポジトリ直下で `./serve.sh` → ブラウザで `http://localhost:8000/`
Expected: ホームに「文法練習」カードが出る。クリックで `http://localhost:8000/apps/grammar-exercises/` に遷移し「準備中」が表示。

**Step 5: Commit**

```bash
git add apps/grammar-exercises/index.html apps/grammar-exercises/js/main.js js/content.js
git commit -m "feat(grammar-exercises): scaffold grammar practice app + home card"
```

---

## Task 2: grade.js（採点純関数・TDD）

**Files:**
- Create: `apps/grammar-exercises/js/grade.js`
- Test: `apps/grammar-exercises/tests/grade.test.js`

**Step 1: 失敗するテストを書く**

`apps/grammar-exercises/tests/grade.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, isCorrect } from "../js/grade.js";

test("normalize: trim/小文字/空白圧縮", () => {
  assert.equal(normalize("  Ich   BIN  "), "ich bin");
});

test("normalize: ß を ss に、末尾ピリオド除去", () => {
  assert.equal(normalize("Ich heiße."), "ich heisse");
});

test("normalize: ? は保持、母音ウムラウトは保持", () => {
  assert.equal(normalize("Wie alt bist du?"), "wie alt bist du?");
  assert.equal(normalize("fährst"), "fährst");
});

test("isCorrect: 受理リストのいずれかに一致", () => {
  assert.equal(isCorrect("bist", ["bist"]), true);
  assert.equal(isCorrect("BIST", ["bist"]), true);
  assert.equal(isCorrect("ist", ["bist"]), false);
});

test("isCorrect: ß/ss と末尾ピリオドの揺れを吸収", () => {
  assert.equal(isCorrect("Ich heisse Anna", ["Ich heiße Anna."]), true);
});

test("isCorrect: 文全体（書き換え）", () => {
  assert.equal(isCorrect("bist du student?", ["Bist du Student?"]), true);
});

test("isCorrect: 空入力は不正解", () => {
  assert.equal(isCorrect("   ", ["bin"]), false);
});
```

**Step 2: テストが落ちることを確認**

Run: `cd apps/grammar-exercises && node --test`
Expected: FAIL（`grade.js` が無い / 関数未定義）

**Step 3: grade.js を実装**

```js
// grade.js — 採点の純関数。DOM・副作用なし。node --test で担保。
export function normalize(s) {
  return String(s == null ? "" : s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ß/g, "ss")
    .replace(/\.$/, "");
}

// input が受理リスト accept のいずれかと（正規化後に）一致すれば true。
export function isCorrect(input, accept) {
  const n = normalize(input);
  if (n === "") return false;
  return (accept || []).some((a) => normalize(a) === n);
}
```

**Step 4: テストが通ることを確認**

Run: `cd apps/grammar-exercises && node --test`
Expected: PASS（全テスト green）

**Step 5: Commit**

```bash
git add apps/grammar-exercises/js/grade.js apps/grammar-exercises/tests/grade.test.js
git commit -m "feat(grammar-exercises): add pure grading helpers with tests"
```

---

## Task 3: 問題データ 01.json / 02.json（md準拠）＋ 整合テスト

**Files:**
- Create: `apps/grammar-exercises/data/01.json`
- Create: `apps/grammar-exercises/data/02.json`
- Test: `apps/grammar-exercises/tests/data.test.js`

**カバレッジ要件（各論点に最低1問。タイプは混在。各レッスン 12〜16 問目安）**

01（`content/grammar/01-personalpronomen-sein.md` の論点）:
- 人称代名詞6つ（ich/du/er-sie-es/wir/ihr/sie）
- sein 活用（表埋め type:table 必須）
- 同音の3つの sie（sie彼女/sie彼ら/Sie敬称、動詞で見分け）
- 人称代名詞は主語専用
- 語順: 平叙文V2 / Ja-Nein疑問文（type:transform で平叙→疑問）/ W-Fragen
- よくある間違い（ihr seid / du bist など）

02（`content/grammar/02-verben-praesens.md` の論点）:
- 規則語尾 e-st-t-en-t-en（表埋め）
- 語幹 -t/-d で e を挟む（arbeitest）
- 語幹 -s/-ß/-z で du=er（heißt/liest/isst）
- 分離動詞（einkaufen → kaufe … ein、書き換え/穴埋め）
- 不規則 a→ä（fährst）/ e→i（sprichst, isst, gibst）/ e→ie（liest, siehst）
- よくある間違い（er fahrt / du heißst / ihr sieht / wir sprichen）

**Step 1: 01.json を作る**

形式は設計docの例に従う。先頭メタ＋ `exercises` 配列。冒頭の確定部分（残りは上記カバレッジを満たすよう同パターンで追加）:

```json
{
  "lesson": "01",
  "title": "01 人称代名詞と sein",
  "doc": "../../#/grammar/personalpronomen",
  "intro": "人称代名詞 × sein の練習。1問ずつチェックして、その場で答え合わせ。",
  "exercises": [
    {
      "type": "table",
      "prompt": "sein の活用を埋めよう",
      "rule": "sein は不規則。sind は wir / sie(彼ら) / Sie(敬称) で共通。",
      "columns": ["人称", "sein"],
      "rows": [
        { "cells": ["ich", { "accept": ["bin"] }] },
        { "cells": ["du", { "accept": ["bist"] }] },
        { "cells": ["er/sie/es", { "accept": ["ist"] }] },
        { "cells": ["wir", { "accept": ["sind"] }] },
        { "cells": ["ihr", { "accept": ["seid"] }] },
        { "cells": ["sie/Sie", { "accept": ["sind"] }] }
      ],
      "explain": "① bin/bist/ist/sind/seid/sind。② wir・sie(彼ら)・Sie はすべて sind。③ ihr だけ seid（混同注意）。"
    },
    {
      "type": "fill",
      "prompt": "___ ___ Student?   (君は学生?)",
      "rule": "Ja/Nein疑問文は〈動詞 → 主語〉の語順。",
      "blanks": [{ "accept": ["Bist"] }, { "accept": ["du"] }],
      "explain": "① 疑問文は動詞 bist が文頭。② du 専用形は bist（×ist/×bin）。③ 文頭なので大文字 Bist。"
    },
    {
      "type": "choice",
      "prompt": "下線部の sie が「彼女は」になるのはどれ?",
      "rule": "sie は動詞で見分ける: ist→彼女 / sind→彼ら・あなた。",
      "options": ["Sie ist nett.", "Sie sind nett.", "Sind sie Studenten?"],
      "answer": 0,
      "explain": "① ist は3人称単数 → 彼女。② sind は彼ら/敬称で未確定。③ 複数名詞 Studenten があれば彼ら。"
    },
    {
      "type": "transform",
      "prompt": "Ja/Nein疑問文に: Du bist Student.",
      "rule": "平叙文(動詞2番目)→疑問文は動詞を文頭へ。",
      "accept": ["Bist du Student?"],
      "explain": "① 動詞 bist を文頭へ。② 主語 du が続く。③ 文末は ? 。"
    },
    {
      "type": "free",
      "prompt": "和訳: 私はアンナです。",
      "rule": "名乗りは〈主語 + sein + 名前〉。",
      "answer": "Ich bin Anna.",
      "explain": "① ich の sein は bin。② 名前 Anna は大文字。自動採点せず模範解答で自己採点。"
    }
  ]
}
```

残りの問題（W-Fragen、主語専用、人称代名詞の穴埋め、よくある間違いの誤り直し＝type:transform/fill 等）を上のカバレッジ要件を満たすまで追加する。

**Step 2: 02.json を作る**

同形式。`"lesson":"02"`, `"title":"02 動詞の現在人称変化"`, `"doc":"../../#/grammar/verben-praesens"`。確定の先頭2問:

```json
{
  "type": "table",
  "prompt": "lernen(規則変化)を埋めよう",
  "rule": "規則語尾は e‐st‐t‐en‐t‐en。wir と sie/Sie は不定詞と同じ -en。",
  "columns": ["人称", "lernen"],
  "rows": [
    { "cells": ["ich", { "accept": ["lerne"] }] },
    { "cells": ["du", { "accept": ["lernst"] }] },
    { "cells": ["er/sie/es", { "accept": ["lernt"] }] },
    { "cells": ["wir", { "accept": ["lernen"] }] },
    { "cells": ["ihr", { "accept": ["lernt"] }] },
    { "cells": ["sie/Sie", { "accept": ["lernen"] }] }
  ],
  "explain": "① 語尾 e/st/t/en/t/en。② 語幹 lern は変わらない。③ wir=sie/Sie=lernen。"
}
```
```json
{
  "type": "fill",
  "prompt": "Er ___ nach Berlin. (fahren)",
  "rule": "不規則 a→ä は du と er/sie/es だけ。",
  "blanks": [{ "accept": ["fährt"] }],
  "explain": "① fahren は a→ä。② 変わるのは du(fährst)/er(fährt) のみ。③ ihr は fahrt（変化なし）。"
}
```
残りをカバレッジ要件まで追加（arbeitest、heißt、einkaufen 書き換え、sprichst、liest、誤り直し er fahrt→fährt 等）。

**Step 3: 整合テストを書く（先に書いて落ちるのを確認）**

`apps/grammar-exercises/tests/data.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isCorrect } from "../js/grade.js";

const lessons = ["01", "02"];

for (const id of lessons) {
  const data = JSON.parse(
    readFileSync(new URL(`../data/${id}.json`, import.meta.url)),
  );

  test(`${id}: トップ構造`, () => {
    assert.equal(data.lesson, id);
    assert.ok(typeof data.title === "string" && data.title.length > 0);
    assert.ok(Array.isArray(data.exercises) && data.exercises.length >= 12);
  });

  test(`${id}: 各問題が型ごとの必須項目と explain を持つ`, () => {
    for (const ex of data.exercises) {
      assert.ok(ex.prompt, "prompt 必須");
      assert.ok(ex.explain, "explain 必須");
      if (ex.type === "fill") {
        assert.ok(ex.blanks.every((b) => b.accept && b.accept.length));
      } else if (ex.type === "table") {
        const cells = ex.rows.flatMap((r) => r.cells);
        const blanks = cells.filter((c) => typeof c === "object");
        assert.ok(blanks.length >= 1);
        assert.ok(blanks.every((c) => c.accept && c.accept.length));
      } else if (ex.type === "choice") {
        assert.ok(Array.isArray(ex.options) && ex.options.length >= 2);
        assert.ok(ex.answer >= 0 && ex.answer < ex.options.length);
      } else if (ex.type === "transform") {
        assert.ok(ex.accept && ex.accept.length);
      } else if (ex.type === "free") {
        assert.ok(typeof ex.answer === "string" && ex.answer.length > 0);
      } else {
        assert.fail(`未知の type: ${ex.type}`);
      }
    }
  });

  test(`${id}: 自動採点タイプは「想定正解」が自身の採点を通る`, () => {
    for (const ex of data.exercises) {
      if (ex.type === "fill") {
        for (const b of ex.blanks) {
          assert.ok(isCorrect(b.accept[0], b.accept));
        }
      } else if (ex.type === "table") {
        for (const r of ex.rows)
          for (const c of r.cells)
            if (typeof c === "object") assert.ok(isCorrect(c.accept[0], c.accept));
      } else if (ex.type === "transform") {
        assert.ok(isCorrect(ex.accept[0], ex.accept));
      }
    }
  });

  test(`${id}: 全タイプを少なくとも1つ含む`, () => {
    const types = new Set(data.exercises.map((e) => e.type));
    for (const t of ["fill", "table", "choice", "transform", "free"]) {
      assert.ok(types.has(t), `${t} が無い`);
    }
  });
}
```

**Step 4: テスト実行**

Run: `cd apps/grammar-exercises && node --test`
Expected: 最初は12問未満や型欠落で FAIL → 問題を追記して PASS。`grade.test.js` も引き続き PASS。

**Step 5: Commit**

```bash
git add apps/grammar-exercises/data/01.json apps/grammar-exercises/data/02.json apps/grammar-exercises/tests/data.test.js
git commit -m "feat(grammar-exercises): author lesson 01/02 exercises aligned to grammar md + data tests"
```

---

## Task 4: data.js（読み込み）

**Files:**
- Create: `apps/grammar-exercises/js/data.js`

**Step 1: 実装**

```js
// data.js — レッスンJSONを取得。fetch なのでサーバ必須。
export async function loadLesson(id) {
  const res = await fetch(`data/${id}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for data/${id}.json`);
  return res.json();
}

export const LESSONS = [
  { id: "01", title: "01 人称代名詞と sein" },
  { id: "02", title: "02 動詞の現在人称変化" },
];
```

**Step 2: 確認**

`import` だけのモジュール。次タスクで利用。構文確認: `node --check apps/grammar-exercises/js/data.js`
Expected: エラー無し。

**Step 3: Commit**

```bash
git add apps/grammar-exercises/js/data.js
git commit -m "feat(grammar-exercises): lesson loader"
```

---

## Task 5: quiz.js（問題UI描画＋即時採点）

**Files:**
- Create: `apps/grammar-exercises/js/quiz.js`

問題1問を `<section class="ex">` として描画し、「チェック」で `grade.js` を使って即時採点。正誤を SVG＋テキストで示し、`explain`（と不正解時の正解）を `aria-live` 領域に出す。`free` は「答えを見る」で模範解答表示。

**Step 1: 実装（核）**

```js
// quiz.js — 問題の描画と即時採点。DOM 生成のみ（状態は保存しない）。
import { isCorrect } from "./grade.js";

const ICON_OK = `<svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16"><path d="M6.5 11.5 3 8l1-1 2.5 2.5L12 4l1 1z" fill="currentColor"/></svg>`;
const ICON_NG = `<svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;

function el(tag, attrs = {}, html = "") {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  if (html) node.innerHTML = html;
  return node;
}

// 正誤バッジ＋explain を表示する共通フィードバック。
function showFeedback(box, ok, explainHtml) {
  box.className = `ex-feedback ${ok ? "is-ok" : "is-ng"}`;
  box.innerHTML = `<span class="badge">${ok ? ICON_OK : ICON_NG}${ok ? "正解" : "不正解"}</span><div class="explain">${explainHtml}</div>`;
}

// 各 type を描画する関数。共通で {node} を返す。onScore(ok) を1回呼ぶ。
function renderFill(ex, onScore) { /* blanks ごとに <input>、チェックで全blank判定 */ }
function renderTable(ex, onScore) { /* セルが object のとき <input> */ }
function renderChoice(ex, onScore) { /* radio。選択→チェックで answer 一致判定 */ }
function renderTransform(ex, onScore) { /* 1つの<input>、accept 照合 */ }
function renderFree(ex, onReveal) { /* textarea＋「答えを見る」で answer＋explain 表示、採点しない */ }

const RENDERERS = { fill: renderFill, table: renderTable, choice: renderChoice, transform: renderTransform, free: renderFree };

// 1レッスンぶんを app に描画。
export function renderQuiz(app, lesson) {
  // ヘッダ（タイトル・「← 解説を読む」= lesson.doc・レッスン切替）＋ スコア表示領域
  // exercises を順に RENDERERS[type] で描画
  // free 以外の onScore で session スコアを加算（保存しない）
}
```

> 実装メモ（executor向け）:
> - `renderFill`: `ex.prompt` の `___` を順に `<input>` で置換（split で実装）。各 input に `<label>`（visually-hidden）を紐付け。「チェック」で各 blank を `isCorrect(input.value, blank.accept)`、全部正解で ok。
> - `renderTable`: `columns`/`rows` から `<table>`。`object` セルは `<input>`、文字列セルはテキスト。チェックで全 input 判定。
> - `renderChoice`: `<fieldset><legend>` に prompt、`<label><input type=radio name=ex-i>`。選択必須、未選択ならチェック無効。
> - `renderTransform`: 単一 `<input>` ＋ `isCorrect(value, ex.accept)`。
> - `renderFree`: `<textarea>` ＋「答えを見る」ボタン。押すと `ex.answer` を `.model` に表示。`onScore` は呼ばない（自己採点）。
> - すべて: prompt の下に `ex.rule`（あれば）を `.ex-rule` で小さく表示。判定後は `showFeedback` で `ex.explain` を出し、不正解は正解（accept[0] や options[answer]）も併記。「再挑戦」ボタンで input を再有効化。
> - 状態保存は一切しない。

**Step 2: 構文確認**

Run: `node --check apps/grammar-exercises/js/quiz.js`
Expected: エラー無し（描画関数の中身を埋めたうえで）。

**Step 3: Commit**

```bash
git add apps/grammar-exercises/js/quiz.js
git commit -m "feat(grammar-exercises): quiz renderer with per-question grading + feedback"
```

---

## Task 6: main.js（ルーティング・レッスン切替）

**Files:**
- Modify: `apps/grammar-exercises/js/main.js`

**Step 1: 実装**

```js
// main.js — ?lesson=01 を読み、該当レッスンを描画。未指定はピッカー。
import { loadLesson, LESSONS } from "./data.js";
import { renderQuiz } from "./quiz.js";

const app = document.getElementById("app");

function lessonFromQuery() {
  const id = new URLSearchParams(location.search).get("lesson");
  return LESSONS.some((l) => l.id === id) ? id : null;
}

function renderPicker() {
  app.innerHTML = `
    <header class="app-head">
      <a class="back" href="../../#/">‹ ホーム</a>
      <h1>文法練習</h1>
    </header>
    <ul class="lesson-list">
      ${LESSONS.map((l) => `<li><a class="lesson-link" href="?lesson=${l.id}">${l.title}</a></li>`).join("")}
    </ul>`;
}

async function main() {
  const id = lessonFromQuery();
  if (!id) return renderPicker();
  app.setAttribute("aria-busy", "true");
  try {
    const lesson = await loadLesson(id);
    renderQuiz(app, lesson);
  } catch (err) {
    app.innerHTML = `<div class="error-band"><strong>問題を読み込めませんでした。</strong><br>
      ${String((err && err.message) || err)}<br>
      リポジトリ直下で <code>./serve.sh</code> を実行していますか？（<code>file://</code> 不可）</div>`;
  } finally {
    app.removeAttribute("aria-busy");
  }
}

main();
```

**Step 2: 動作確認**

Run: `./serve.sh` → `http://localhost:8000/apps/grammar-exercises/`（ピッカー）と `…/apps/grammar-exercises/?lesson=01`（問題）
Expected: ピッカーから 01/02 に入れる。各問が描画され、チェックで正誤＋解説、free は答え表示。

**Step 3: Commit**

```bash
git add apps/grammar-exercises/js/main.js
git commit -m "feat(grammar-exercises): lesson routing + picker"
```

---

## Task 7: CSS（BMW デザイン）

**Files:**
- Create: `apps/grammar-exercises/css/styles.css`

**Step 1: 実装方針**

- `apps/vocabulary/css/styles.css` の BMW トークン（`:root` の色・余白・タイポ）を流用して冒頭に置く。
- 追加: `.app`/`.app-head`/`.lesson-list`/`.ex`/`.ex-rule`/`.ex-feedback.is-ok|.is-ng`/`.badge`/`.explain`/`.model`/入力欄/ボタン。
- 制約: 白 canvas / blue `#1c69d4` / 0px 矩形 / Inter 700・300 / **ドロップシャドウ禁止** / コントラスト4.5:1 / `:focus-visible` リング / タッチ44px / `@media (prefers-reduced-motion: reduce)` でアニメ無効 / 横スクロール無し。
- 正誤色は色のみに依存しない（アイコン＋テキストが既にある）。is-ok/is-ng は十分なコントラストの前景色。

**Step 2: 確認**

Run: `./serve.sh` → 各画面の見た目と、キーボード操作で `:focus-visible` リングが出ること、375px幅で横スクロールが出ないことを確認。

**Step 3: Commit**

```bash
git add apps/grammar-exercises/css/styles.css
git commit -m "style(grammar-exercises): BMW corporate-automotive styling"
```

---

## Task 8: 相互リンク（解説 md の整理＋リンク）

**Files:**
- Modify: `content/grammar/01-personalpronomen-sein.md`
- Modify: `content/grammar/02-verben-praesens.md`

**Step 1: 練習問題＋解答セクションを削除**

- 01: 「## 📝 練習問題」から「### 解答」の終わりまでを削除。**「## ❌ よくある間違い」は残す**（解説）。
- 02: 「## ✍️ 練習」から「### 解答」の終わりまでを削除。**「## ❌ よくある間違い」は残す**。

**Step 2: 練習へのリンクを追加**

各 md の冒頭リード文の直後と、末尾（よくある間違いの後）に1つずつ:

```markdown
> 🔗 **練習問題**: [このレッスンの練習問題を解く](apps/grammar-exercises/?lesson=01)（別ページ・採点と解説つき）
```

（02 は `?lesson=02`。リンクは root 相対＝リーダーは root 配信なのでそのまま動く。`.md` でないため reader のリンク書換対象外。）

**Step 3: 動作確認**

Run: `./serve.sh` → `http://localhost:8000/#/grammar/personalpronomen`
Expected: 練習問題セクションが消え、解説とよくある間違いが残る。練習リンクをクリックすると `apps/grammar-exercises/?lesson=01` に遷移。逆にアプリの「← 解説を読む」で md に戻れる。

**Step 4: リーダーのテストが影響を受けないこと**

Run: リポジトリ直下で `node --test tests/*.test.js`
Expected: PASS（markdown.js は無改変なので影響なし。確認のため）。

**Step 5: Commit**

```bash
git add content/grammar/01-personalpronomen-sein.md content/grammar/02-verben-praesens.md
git commit -m "docs(grammar): move practice out of md, link to grammar-exercises app"
```

---

## Task 9: CLAUDE.md ×2 ＋ README

**Files:**
- Create: `content/grammar/CLAUDE.md`
- Create: `apps/grammar-exercises/CLAUDE.md`
- Create: `apps/grammar-exercises/README.md`

**Step 1: content/grammar/CLAUDE.md（レッスン作成規約）**

要点を必須事項として記述:
- 新しい文法レッスンは **md(解説) ＋ `apps/grammar-exercises/data/NN.json`(問題) ＋ `js/content.js` 登録 ＋ 相互リンク** を必ずセットで作る。
- md に練習問題・解答を書かない（問題は JSON）。問題は対応 md の論点だけに準拠。
- 問題タイプ: fill / table / choice / transform / free。各問に `rule`＋`explain`（正解・不正解どちらでも表示）。
- 採点は `apps/grammar-exercises/js/grade.js`（純関数）。変更したら `cd apps/grammar-exercises && node --test` を green に。`data.test.js` の整合（≥12問・全タイプ・想定正解が通る）も満たす。
- a11y/デザインはルート規約継承。既存 `03-nomen-genus.md` は最初の適用対象（`data/03.json` を足し content.js にリンクすれば練習が出る）。

**Step 2: apps/grammar-exercises/CLAUDE.md（アプリ仕様）**

他アプリ同様: 目的 / 起動（親 serve.sh、`?lesson=NN`）/ テスト（`node --test`）/ データ形式（5タイプ）/ 採点規則 / トラッキング無し / 相互リンク / 制約（素JS・オフライン・BMW・a11y）。

**Step 3: README.md**

利用者・開発者向けの短い説明（起動・問題の足し方は CLAUDE.md 参照）。

**Step 4: Commit**

```bash
git add content/grammar/CLAUDE.md apps/grammar-exercises/CLAUDE.md apps/grammar-exercises/README.md
git commit -m "docs(grammar-exercises): authoring convention + app spec + readme"
```

---

## Task 10: 最終検証

**Step 1: 全テスト**

Run: `cd apps/grammar-exercises && node --test` → Expected: PASS（grade・data）
Run: リポジトリ直下 `node --test tests/*.test.js` → Expected: PASS（リーダー無改変の確認）

**Step 2: 手動E2E（@webapp-testing を使ってよい）**

`./serve.sh` で:
- ホーム →「文法練習」→ ピッカー → 01/02。
- 各タイプ（fill/table/choice/transform/free）が描画・採点・解説表示される。
- 不正解時に正解が出て再挑戦できる。free は答え表示で自己採点。
- 解説 md ⇄ アプリ の相互リンク往復。
- キーボードのみで操作可（focus-visible）。375px で横スクロール無し。`prefers-reduced-motion` でアニメ無効。

**Step 3: .gitignore 確認**

新規ファイルに無視すべきもの（venv等）が無いこと。`git status` で意図したファイルのみ。

**Step 4: 最終コミット（必要なら）**

```bash
git add -A && git commit -m "test(grammar-exercises): final verification"
```

---

## 完了の定義

- `apps/grammar-exercises/` で 01・02 の練習が動き、各 md の論点に準拠している。
- 即時採点・`rule`/`explain`（正誤両方）・free 自己採点・トラッキング無し。
- 相互リンク（ホーム/解説/アプリ）で復習が回る。
- `grade`・`data` テストが green。リーダーは無改変。
- CLAUDE.md ×2 で今後のレッスン追加の型が固定されている。
