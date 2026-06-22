# ドイツ語単語アプリ (A1 MVP) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ゲーテ A1 の語彙を、忘却曲線（Leitner）＋ネイティブ品質のカラオケ音声で学べる、ローカル完結の単語アプリを作る（MVP = A1 のみ）。

**Architecture:** 素の HTML/CSS/JS（ES Modules、ビルドなし）＋ localStorage。コンテンツ（語彙・例文・音声・単語タイミング）はビルド時に一度だけ生成し、実行時はオフラインで静的ファイルを再生するだけ。学習は「読むだけモード」と「フラッシュカードモード（自己評価3段階が Leitner を駆動）」の2本立て。

**Tech Stack:** HTML5 / CSS / Vanilla JS (ES Modules), localStorage, Web Audio (`<audio>`) + `requestAnimationFrame`, Web Speech API（フォールバック）, Python 3 + `edge-tts`（音声＋単語タイミング生成）, Node.js `node --test`（ロジックの単体テスト）。

**設計書:** `docs/plans/2026-06-21-vocabulary-app-design.md`

**重要な前提:**
- **git は使わない**（ユーザー決定）。各タスク末尾の「チェックポイント」は git commit ではなく動作確認の区切り。
- ES Modules と `fetch` は `file://` で動かない。**必ず `python3 -m http.server` 経由で開く**（Task 10 参照）。
- 作業の大半は Phase 3（コンテンツ生成）。先に小さなサンプルデータでアプリを完成・検証し（Phase 0–2）、最後に A1 全体へスケール（Phase 3）。

---

## Phase 0: セットアップ

### Task 1: プロジェクト雛形

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `package.json`
- Create: `js/.gitkeep`（ディレクトリ確保用、空ファイル）

**Step 1: `package.json` を作成**（`type: module` で .js を ESM 扱いに。npm install は不要）

```json
{
  "name": "deutsch-vocab",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

**Step 2: `index.html` を作成**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Deutsch A1 単語</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <header>
    <h1>Deutsch A1</h1>
    <nav id="nav"></nav>
  </header>
  <main id="app"></main>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

**Step 3: `css/styles.css` を作成**（最小・モバイル対応）

```css
* { box-sizing: border-box; }
body { font-family: system-ui, sans-serif; margin: 0; padding: 0; color: #222; }
header { padding: 12px 16px; background: #1c3d5a; color: #fff; display: flex; justify-content: space-between; align-items: center; }
header h1 { font-size: 18px; margin: 0; }
nav button, .home button, .rate button, .ex button, .card button { font: inherit; cursor: pointer; }
main { max-width: 640px; margin: 0 auto; padding: 16px; }
button { padding: 8px 14px; border: 1px solid #aaa; border-radius: 8px; background: #fff; }
.home button, .rate button { display: inline-block; margin: 6px; }
.card { text-align: center; }
.card h2 { font-size: 32px; }
.hidden { display: none; }
.kw { padding: 0 1px; }
.kw.active { background: #ffe27a; border-radius: 3px; }
.ex { margin: 10px 0; padding: 8px; border: 1px solid #eee; border-radius: 8px; }
.ex .de { font-size: 18px; margin: 0 0 4px; }
.ex .tr { color: #666; font-size: 14px; margin: 4px 0 0; }
.reader input { width: 100%; padding: 8px; margin-bottom: 10px; }
.reader ul { list-style: none; padding: 0; }
.reader li { padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; }
.rate button[data-r="forgot"] { border-color: #d9534f; }
.rate button[data-r="good"] { border-color: #5cb85c; }
```

**Step 4: チェックポイント** — `ls index.html css/styles.css package.json` で3ファイルが存在することを確認。

---

### Task 2: 実行環境の確認と edge-tts 導入

**Step 1: Node と Python のバージョン確認**

Run: `node --version && python3 --version`
Expected: Node v18+ と Python 3.9+ が表示される（無ければ案内）。

**Step 2: edge-tts を仮想環境に導入**（システム汚染を避ける）

Run:
```bash
python3 -m venv tools/.venv
tools/.venv/bin/pip install -q edge-tts
tools/.venv/bin/python -c "import edge_tts; print('edge-tts ok')"
```
Expected: `edge-tts ok`

**Step 3: ドイツ語音声が引けるか確認**（ネットワーク必須）

Run: `tools/.venv/bin/python -m edge_tts --list-voices | grep '^de-DE'`
Expected: `de-DE-KatjaNeural` 等が一覧に出る。

**Step 4: チェックポイント** — 上記がすべて成功。失敗時はネットワーク/プロキシを確認。

---

## Phase 1: コアロジック（TDD）

### Task 3: Leitner スケジューリング `srs.js`（TDD）

**Files:**
- Create: `js/srs.js`
- Test: `tests/srs.test.js`

**Step 1: 失敗するテストを書く**

```js
// tests/srs.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, review, isDue, selectSession, BOX_INTERVALS, MAX_BOX } from '../js/srs.js';

test('newCard は box1・未学習', () => {
  const c = newCard('a1-haus');
  assert.equal(c.box, 1);
  assert.equal(c.timesSeen, 0);
});

test('good は box を +1 し due を伸ばす', () => {
  const c = { id: 'x', box: 2, dueDay: 5, lastReviewedDay: null, timesSeen: 1, timesGood: 1 };
  const r = review(c, 'good', 10);
  assert.equal(r.box, 3);
  assert.equal(r.dueDay, 10 + BOX_INTERVALS[3]);
  assert.equal(r.timesSeen, 2);
  assert.equal(r.timesGood, 2);
});

test('good は MAX_BOX を超えない', () => {
  const c = { id: 'x', box: MAX_BOX, dueDay: 0, lastReviewedDay: null, timesSeen: 9, timesGood: 9 };
  assert.equal(review(c, 'good', 0).box, MAX_BOX);
});

test('forgot は box1 に戻す', () => {
  const c = { id: 'x', box: 4, dueDay: 0, lastReviewedDay: null, timesSeen: 3, timesGood: 2 };
  const r = review(c, 'forgot', 7);
  assert.equal(r.box, 1);
  assert.equal(r.dueDay, 7 + BOX_INTERVALS[1]);
  assert.equal(r.timesGood, 2); // good は増えない
});

test('fuzzy は同じ箱に留置', () => {
  const c = { id: 'x', box: 3, dueDay: 0, lastReviewedDay: null, timesSeen: 2, timesGood: 1 };
  const r = review(c, 'fuzzy', 7);
  assert.equal(r.box, 3);
  assert.equal(r.dueDay, 7 + BOX_INTERVALS[3]);
});

test('review は元オブジェクトを変更しない（不変）', () => {
  const c = newCard('x');
  const snapshot = JSON.stringify(c);
  review(c, 'good', 5);
  assert.equal(JSON.stringify(c), snapshot);
});

test('不明な rating は例外', () => {
  assert.throws(() => review(newCard('x'), 'maybe', 0));
});

test('isDue は学習済みかつ期日到来で true', () => {
  assert.equal(isDue({ timesSeen: 1, dueDay: 5 }, 5), true);
  assert.equal(isDue({ timesSeen: 1, dueDay: 6 }, 5), false);
  assert.equal(isDue({ timesSeen: 0, dueDay: 0 }, 5), false); // 未学習は due 扱いしない
});

test('selectSession は due + 新規(上限) を返す', () => {
  const cards = [
    { id: 'due1', box: 1, dueDay: 3, timesSeen: 1, timesGood: 0 },
    { id: 'notdue', box: 2, dueDay: 99, timesSeen: 1, timesGood: 1 },
    { id: 'new1', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
    { id: 'new2', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
    { id: 'new3', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
  ];
  const s = selectSession(cards, 5, 2).map(c => c.id);
  assert.deepEqual(s, ['due1', 'new1', 'new2']); // due 優先 + 新規2件
});
```

**Step 2: テストを実行して失敗を確認**

Run: `node --test`
Expected: FAIL（`js/srs.js` が無い / export 未定義）。

**Step 3: 最小実装を書く**

```js
// js/srs.js
export const BOX_INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
export const MAX_BOX = 5;

export function newCard(id) {
  return { id, box: 1, dueDay: 0, lastReviewedDay: null, timesSeen: 0, timesGood: 0 };
}

export function review(card, rating, today) {
  let box, timesGood = card.timesGood;
  if (rating === 'good') { box = Math.min(card.box + 1, MAX_BOX); timesGood += 1; }
  else if (rating === 'fuzzy') { box = card.box; }
  else if (rating === 'forgot') { box = 1; }
  else throw new Error(`unknown rating: ${rating}`);
  return {
    ...card,
    box,
    dueDay: today + BOX_INTERVALS[box],
    lastReviewedDay: today,
    timesSeen: card.timesSeen + 1,
    timesGood,
  };
}

export function isDue(card, today) {
  return card.timesSeen > 0 && card.dueDay <= today;
}

export function selectSession(cards, today, newPerDay) {
  const due = cards.filter(c => isDue(c, today)).sort((a, b) => a.dueDay - b.dueDay);
  const fresh = cards.filter(c => c.timesSeen === 0).slice(0, newPerDay);
  return [...due, ...fresh];
}
```

**Step 4: テストを実行して全パスを確認**

Run: `node --test`
Expected: PASS（全テスト green）。

**Step 5: チェックポイント** — `node --test` が green。

---

### Task 4: localStorage ラッパ `storage.js`

**Files:**
- Create: `js/storage.js`

**Step 1: 実装**

```js
// js/storage.js
const KEY = 'deutsch-vocab-v1';

function defaults() {
  return { newPerDay: 15, level: 'A1' };
}

export function dayNumber(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(d.getTime() / 86400000);
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { cards: {}, settings: defaults() };
    const parsed = JSON.parse(raw);
    return { cards: parsed.cards || {}, settings: { ...defaults(), ...(parsed.settings || {}) } };
  } catch {
    return { cards: {}, settings: defaults() };
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
```

**Step 2: チェックポイント** — 構文確認 `node --check js/storage.js`（`dayNumber` は Date 依存なので単体テスト対象外。ロジックの核は srs.js 側で担保済み）。

---

### Task 5: データロード `data.js`

**Files:**
- Create: `js/data.js`

**Step 1: 実装**

```js
// js/data.js
export async function loadWords(level) {
  const res = await fetch(`${level}/words.json`);
  if (!res.ok) throw new Error(`failed to load ${level}/words.json`);
  return res.json();
}

export function indexById(words) {
  const m = {};
  for (const w of words) m[w.id] = w;
  return m;
}
```

**Step 2: チェックポイント** — `node --check js/data.js`。

---

## Phase 2: 音声・UI（サンプルデータで動かす）

### Task 6: カラオケ再生 `audio.js`

**Files:**
- Create: `js/audio.js`

**Step 1: 実装**（`timing` 配列を優先して単語 span を描画 → 1:1 対応を保証。音声/タイミング欠落時は Web Speech フォールバック）

```js
// js/audio.js
export function renderSentence(container, example) {
  container.innerHTML = '';
  const tokens = (example.timing && example.timing.length)
    ? example.timing.map(t => t.w)
    : example.de.split(/\s+/);
  const spans = [];
  tokens.forEach((w, i) => {
    const s = document.createElement('span');
    s.textContent = w;
    s.className = 'kw';
    s.dataset.i = String(i);
    container.append(s, document.createTextNode(' '));
    spans.push(s);
  });
  return spans;
}

export function playKaraoke(level, example, spans, { rate = 1 } = {}) {
  const timing = example.timing;
  if (!example.audio || !timing || !timing.length) {
    return speakFallback(example.de);
  }
  const audio = new Audio(`${level}/${example.audio}`);
  audio.playbackRate = rate;
  let raf = 0;
  const clear = () => spans.forEach(sp => sp.classList.remove('active'));
  const tick = () => {
    const t = audio.currentTime;
    let active = -1;
    for (let i = 0; i < timing.length; i++) {
      if (t >= timing[i].s) active = i;
      if (t < timing[i].e) break;
    }
    spans.forEach((sp, i) => sp.classList.toggle('active', i === active));
    if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
  };
  audio.addEventListener('play', () => { raf = requestAnimationFrame(tick); });
  audio.addEventListener('ended', () => { cancelAnimationFrame(raf); clear(); });
  audio.play();
  return audio;
}

export function speakFallback(text) {
  if (!('speechSynthesis' in window)) return null;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return u;
}
```

**Step 2: チェックポイント** — `node --check js/audio.js`（DOM 依存のため実機確認は Task 11/12）。

---

### Task 7: サンプル A1 データ（手書き3語、音声はまだ無し）

**Files:**
- Create: `A1/words.json`

**Step 1: サンプルを書く**（A1 文法の天井内。`audio`/`timing` は Task 8 で生成）

```json
[
  {
    "id": "a1-haus", "lemma": "Haus", "pos": "noun", "article": "das", "plural": "Häuser", "level": "A1",
    "meanings": [{ "ja": "家", "en": "house" }],
    "examples": [
      { "de": "Das Haus ist groß.", "ja": "その家は大きい。", "en": "The house is big." },
      { "de": "Mein Haus hat einen Garten.", "ja": "私の家には庭がある。", "en": "My house has a garden." }
    ]
  },
  {
    "id": "a1-trinken", "lemma": "trinken", "pos": "verb", "level": "A1",
    "meanings": [{ "ja": "飲む", "en": "to drink" }],
    "examples": [
      { "de": "Ich trinke Wasser.", "ja": "私は水を飲む。", "en": "I drink water." },
      { "de": "Wir trinken Kaffee am Morgen.", "ja": "私たちは朝コーヒーを飲む。", "en": "We drink coffee in the morning." }
    ]
  },
  {
    "id": "a1-gut", "lemma": "gut", "pos": "adjective", "level": "A1",
    "meanings": [{ "ja": "良い", "en": "good" }, { "ja": "上手に", "en": "well" }],
    "examples": [
      { "de": "Das Essen ist gut.", "ja": "その食事は良い。", "en": "The food is good." },
      { "de": "Er spricht gut Deutsch.", "ja": "彼はドイツ語を上手に話す。", "en": "He speaks German well." },
      { "de": "Mir geht es gut.", "ja": "私は元気です。", "en": "I am well." }
    ]
  }
]
```

**Step 2: チェックポイント** — `node -e "JSON.parse(require('fs').readFileSync('A1/words.json'))" && echo ok`。

---

### Task 8: 音声＋単語タイミング生成 `tts_generate.py`

**Files:**
- Create: `tools/tts_generate.py`

**Step 1: 実装**（example ごとに MP3 を生成し、WordBoundary を秒に変換して `words.json` にマージ。生成済みはスキップ＝再実行安全）

```python
#!/usr/bin/env python3
"""edge-tts で例文の MP3 + 単語タイミングを生成し words.json にマージ。
Usage: tools/.venv/bin/python tools/tts_generate.py A1
"""
import asyncio, json, sys
from pathlib import Path
import edge_tts

VOICE = "de-DE-KatjaNeural"

async def synth(text, out_path):
    c = edge_tts.Communicate(text, VOICE, boundary="WordBoundary")  # 7.2.8+ は明示必須（既定は SentenceBoundary で timing が空になる）
    words = []
    with open(out_path, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({
                    "w": ch["text"],
                    "s": round(ch["offset"] / 1e7, 3),
                    "e": round((ch["offset"] + ch["duration"]) / 1e7, 3),
                })
    return words

async def main(level):
    base = Path(level)
    audio_dir = base / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    data = json.loads((base / "words.json").read_text(encoding="utf-8"))
    for w in data:
        for i, e in enumerate(w["examples"], 1):
            fname = f"{w['id']}-{i}.mp3"
            if e.get("audio") and (audio_dir / fname).exists() and e.get("timing"):
                continue
            timing = await synth(e["de"], audio_dir / fname)
            e["audio"] = f"audio/{fname}"
            e["timing"] = timing
            print(f"ok {fname} ({len(timing)} words)")
    (base / "words.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("done")

if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "A1"))
```

**Step 2: サンプルに対して実行**

Run: `tools/.venv/bin/python tools/tts_generate.py A1`
Expected: `ok a1-haus-1.mp3 (...)` … と続き `done`。`A1/audio/` に MP3 が7個生成され、`A1/words.json` の各 example に `audio` と `timing` が付与される。

**Step 3: チェックポイント** — `ls A1/audio/*.mp3 | wc -l` が 7、`words.json` に `timing` 配列が入っている。

---

### Task 9: データ検証 `validate_data.mjs`

**Files:**
- Create: `tools/validate_data.mjs`

**Step 1: 実装**

```js
// tools/validate_data.mjs
import { readFileSync } from 'node:fs';
const level = process.argv[2] || 'A1';
const data = JSON.parse(readFileSync(`${level}/words.json`, 'utf-8'));
let errors = 0;
const fail = (id, msg) => { console.error(`✗ ${id}: ${msg}`); errors++; };
for (const w of data) {
  if (!w.id || !w.lemma || !w.pos || !w.level) fail(w.id || '?', 'missing core field');
  if (w.pos === 'noun' && !w.article) fail(w.id, 'noun missing article');
  if (!Array.isArray(w.meanings) || !w.meanings.length) fail(w.id, 'no meanings');
  for (const m of w.meanings || []) if (!m.ja || !m.en) fail(w.id, 'meaning missing ja/en');
  const need = (w.meanings && w.meanings.length >= 2) ? 3 : 2;
  if (!Array.isArray(w.examples) || w.examples.length < need) fail(w.id, `need >=${need} examples`);
  for (const e of w.examples || []) {
    if (!e.de || !e.ja || !e.en) fail(w.id, 'example missing text');
    if (!e.audio) fail(w.id, 'example missing audio');
    if (!Array.isArray(e.timing) || !e.timing.length) fail(w.id, 'example missing timing');
  }
}
console.log(errors ? `\n${errors} errors` : `✓ ${data.length} words valid`);
process.exit(errors ? 1 : 0);
```

**Step 2: 実行**

Run: `node tools/validate_data.mjs A1`
Expected: `✓ 3 words valid`

**Step 3: チェックポイント** — exit 0。

---

### Task 10: アプリ本体 `main.js` ＋ ホーム ＋ 起動確認

**Files:**
- Create: `js/main.js`

**Step 1: 実装**

```js
// js/main.js
import { loadWords, indexById } from './data.js';
import { loadState, saveState, dayNumber } from './storage.js';
import { newCard, selectSession } from './srs.js';
import { renderReader } from './reader.js';
import { renderFlashcards } from './flashcard.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

let words = [];
let byId = {};
const state = loadState();

function ensureCards() {
  for (const w of words) if (!state.cards[w.id]) state.cards[w.id] = newCard(w.id);
}
function persist() { saveState(state); }

function go(view) {
  if (view === 'reader') renderReader(app, words, state.settings.level);
  else if (view === 'flashcard') renderFlashcards(app, { words, byId, state, persist });
  else renderHome();
}

function renderHome() {
  const today = dayNumber();
  const session = selectSession(Object.values(state.cards), today, state.settings.newPerDay);
  app.innerHTML = `
    <section class="home">
      <p>本日の学習: <strong>${session.length}</strong> 件（うち新規 ${session.filter(c => c.timesSeen === 0).length}）</p>
      <button id="toFlash">フラッシュカード</button>
      <button id="toRead">読むだけ</button>
    </section>`;
  app.querySelector('#toFlash').onclick = () => go('flashcard');
  app.querySelector('#toRead').onclick = () => go('reader');
}

async function init() {
  try {
    words = await loadWords(state.settings.level);
    byId = indexById(words);
    ensureCards();
    persist();
    nav.innerHTML = `<button id="home">ホーム</button>`;
    nav.querySelector('#home').onclick = () => go('home');
    renderHome();
  } catch (e) {
    app.innerHTML = `<p>データ読込に失敗しました: ${e.message}<br>（<code>python3 -m http.server</code> 経由で開いていますか？）</p>`;
  }
}
init();
```

**Step 2: ローカルサーバ起動**

Run（バックグラウンド）: `python3 -m http.server 8000`
Open: `http://localhost:8000/`
Expected: 「本日の学習: 3 件（うち新規 3）」とボタン2つが表示。reader.js/flashcard.js 未作成なので import エラーになる → 次タスクで解消。

**Step 3: チェックポイント** — ホームの件数表示まで確認（モジュール未実装による遷移エラーは想定内）。

---

### Task 11: 読むだけモード `reader.js`

**Files:**
- Create: `js/reader.js`

**Step 1: 実装**

```js
// js/reader.js
import { renderSentence, playKaraoke } from './audio.js';

export function renderReader(app, words, level = 'A1') {
  app.innerHTML = `
    <section class="reader">
      <input id="filter" placeholder="検索（独語 / 意味）" />
      <ul id="list"></ul>
      <div id="detail"></div>
    </section>`;
  const list = app.querySelector('#list');
  const detail = app.querySelector('#detail');
  const filter = app.querySelector('#filter');

  function renderExamples(host, w) {
    host.innerHTML = `<h2>${w.article ? w.article + ' ' : ''}${w.lemma}</h2>
      <p>${w.meanings.map(m => `${m.ja} / ${m.en}`).join('；')}</p>
      ${w.plural ? `<p>複数: ${w.plural}</p>` : ''}
      <div class="examples"></div>`;
    const ex = host.querySelector('.examples');
    for (const e of w.examples) {
      const row = document.createElement('div'); row.className = 'ex';
      const de = document.createElement('p'); de.className = 'de';
      const tr = document.createElement('p'); tr.className = 'tr'; tr.textContent = `${e.ja} / ${e.en}`;
      const btn = document.createElement('button'); btn.textContent = '▶';
      const spans = renderSentence(de, e);
      btn.onclick = () => playKaraoke(level, e, spans);
      row.append(de, btn, tr); ex.append(row);
    }
  }
  function draw(items) {
    list.innerHTML = '';
    for (const w of items) {
      const li = document.createElement('li');
      li.textContent = `${w.article ? w.article + ' ' : ''}${w.lemma} — ${w.meanings[0].ja}`;
      li.onclick = () => renderExamples(detail, w);
      list.append(li);
    }
  }
  filter.oninput = () => {
    const q = filter.value.trim().toLowerCase();
    draw(words.filter(w => !q
      || w.lemma.toLowerCase().includes(q)
      || w.meanings.some(m => m.ja.includes(q) || m.en.toLowerCase().includes(q))));
  };
  draw(words);
}
```

**Step 2: 実機確認** — `http://localhost:8000/` → 読むだけ → 語をタップ → 例文表示 → ▶ で**音声再生中に単語が黄色く追従**することを目視。検索も動く。

**Step 3: チェックポイント** — カラオケ追従が見えること（最重要要件）。

---

### Task 12: フラッシュカードモード `flashcard.js`（SRS 連動）

**Files:**
- Create: `js/flashcard.js`

**Step 1: 実装**

```js
// js/flashcard.js
import { dayNumber } from './storage.js';
import { review, selectSession } from './srs.js';
import { renderSentence, playKaraoke } from './audio.js';

export function renderFlashcards(app, ctx) {
  const { byId, state, persist } = ctx;
  const level = state.settings.level;
  const today = dayNumber();
  const queue = selectSession(Object.values(state.cards), today, state.settings.newPerDay)
    .map(c => byId[c.id]).filter(Boolean);
  let pos = 0;

  function done() {
    app.innerHTML = `<section class="done"><p>本日のカードは完了！🎉</p></section>`;
  }

  function showCard() {
    if (pos >= queue.length) return done();
    const word = queue[pos];
    app.innerHTML = `
      <section class="card">
        <div class="front"><h2>${word.article ? word.article + ' ' : ''}${word.lemma}</h2></div>
        <div class="back hidden" id="back"></div>
        <button id="flip">めくる</button>
        <div class="rate hidden" id="rate">
          <button data-r="forgot">忘れた</button>
          <button data-r="fuzzy">あやふや</button>
          <button data-r="good">覚えてた</button>
        </div>
      </section>`;

    app.querySelector('#flip').onclick = reveal;

    function reveal() {
      const back = app.querySelector('#back');
      back.classList.remove('hidden');
      back.innerHTML = `
        <p class="meaning">${word.meanings.map(m => `${m.ja} / ${m.en}`).join('；')}</p>
        ${word.plural ? `<p>複数: ${word.plural}</p>` : ''}
        <div class="examples"></div>`;
      const ex = back.querySelector('.examples');
      for (const e of word.examples) {
        const row = document.createElement('div'); row.className = 'ex';
        const de = document.createElement('p'); de.className = 'de';
        const tr = document.createElement('p'); tr.className = 'tr'; tr.textContent = `${e.ja} / ${e.en}`;
        const btn = document.createElement('button'); btn.textContent = '▶';
        const spans = renderSentence(de, e);
        btn.onclick = () => playKaraoke(level, e, spans);
        row.append(de, btn, tr); ex.append(row);
      }
      app.querySelector('#flip').classList.add('hidden');
      app.querySelector('#rate').classList.remove('hidden');
      app.querySelectorAll('#rate button').forEach(b => { b.onclick = () => rate(b.dataset.r); });
    }

    function rate(r) {
      state.cards[word.id] = review(state.cards[word.id], r, today);
      persist();
      pos++; showCard();
    }
  }
  showCard();
}
```

**Step 2: 実機確認** — ホーム → フラッシュカード → 表（独語）→ めくる → 意味・例文・カラオケ → 「覚えてた」等を押すと次へ。3枚で「完了」。

**Step 3: localStorage 永続を確認** — DevTools Console:
```js
JSON.parse(localStorage.getItem('deutsch-vocab-v1')).cards['a1-haus']
```
Expected: `box`/`dueDay`/`timesSeen` が評価に応じて更新されている。リロードしても保持。

**Step 4: チェックポイント** — 2モード＋SRS＋永続が一通り動く（= サンプルでアプリ完成）。

---

## Phase 3: コンテンツ生成（A1 全体へスケール）

> ここからが作業量の本体。**Task 16/17 は LLM 生成＋検証**。各レベルの文法・語彙の天井（設計書 §5）を生成・検証の両プロンプトに焼き込むこと。バッチ（例: 50語ずつ）で回し、`validate_data.mjs` を都度ゲートにする。

### Task 13: 公式 PDF の取得

**Files:**
- Create: `tools/sources/` （DL 先）

**Step 1: A1 Wortliste と Prüfungsziele を取得**

Run:
```bash
mkdir -p tools/sources
curl -L -o tools/sources/A1_Wortliste.pdf "https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf"
curl -L -o tools/sources/A1_Pruefungsziele.pdf "https://www.goethe.de/pro/relaunch/prf/de/Pruefungsziele_Testbeschreibung_A1_SD1.pdf"
ls -la tools/sources
```
Expected: 2つの PDF が DL される。失敗時は URL を設計書 §5 出典で再確認。

**Step 2: チェックポイント** — PDF が開ける（サイズ > 0）。

---

### Task 14: A1 語リスト抽出 → seed JSON

**Files:**
- Create: `tools/a1_seed.json`

**Step 1: PDF から語を抽出**（Read ツールで `tools/sources/A1_Wortliste.pdf` を読み、アルファベット順 Wortliste から lemma・品詞・名詞の性・複数形を構造化。約650語）。1語の形:
```json
{ "id": "a1-arbeiten", "lemma": "arbeiten", "pos": "verb", "level": "A1" }
{ "id": "a1-apfel", "lemma": "Apfel", "pos": "noun", "article": "der", "plural": "Äpfel", "level": "A1" }
```
- `id` は `a1-` + lemma の小文字 ASCII 化（ä→ae, ö→oe, ü→ue, ß→ss、非英数は `-`）。重複時は `-2` を付す。
- 名詞は必ず `article`、可能なら `plural`。

**Step 2: 件数確認**

Run: `node -e "const d=require('fs').readFileSync('tools/a1_seed.json');const a=JSON.parse(d);console.log(a.length, new Set(a.map(x=>x.id)).size)"`
Expected: 件数（約600–660）と、ユニーク id 数が一致（id 重複なし）。

**Step 3: チェックポイント** — seed が約650語、id ユニーク、名詞に article がある。

---

### Task 15: 意味（JA/EN）付与

**Files:**
- Modify: `tools/a1_seed.json` → `tools/a1_meanings.json`

**Step 1: 各語に `meanings` を付与**（多義語は複数。A1 として代表的な語義に絞る）。LLM 生成。出力例:
```json
{ "id": "a1-gut", "lemma": "gut", "pos": "adjective", "level": "A1",
  "meanings": [{ "ja": "良い", "en": "good" }, { "ja": "上手に", "en": "well" }] }
```

**Step 2: 簡易チェック** — 全語に1件以上の meaning、各 meaning に ja/en が両方ある（`validate_data` の一部相当を `node -e` で確認、または次タスク後にまとめて検証）。

**Step 3: チェックポイント** — `meanings` が全語に付与済み。

---

### Task 16: 例文生成（A1 文法・語彙の天井内）

**Files:**
- Create: `tools/sentence_pipeline.md`（生成・検証の手順／プロンプト／制約を文書化）
- Modify: `tools/a1_meanings.json` → `A1/words.json`（`examples` 付き、`audio`/`timing` はまだ無し）

**Step 1: `tools/sentence_pipeline.md` を作成**（制約と生成プロンプトを明文化）

````markdown
# 例文生成・検証パイプライン (A1)

## 生成ルール（A1 の天井 — 超過禁止）
- 時制: 現在形中心。過去は haben/sein の Präteritum（war/hatte）と、限定された動詞の Perfekt のみ。
- 格: Nominativ / Akkusativ。Dativ は danken/helfen/gehören 等の定型と "es geht mir gut" 程度に限定。Genitiv 不可。
- 形容詞: 述語・副詞用法のみ（付加語の格変化 "der neue Mantel" は不可）。比較級・最上級 不可。
- 文結合: 主文＋等位接続（und / oder / aber / denn / dann）まで。従属節（weil / dass / wenn）不可。関係文・受動態 不可。
- 語彙: 原則 A1 約650語＋ごく基本的な機能語の範囲。固有名詞・数詞・曜日等は可。
- 1語あたり例文2文（meanings が2件以上なら3文以上、各語義を1文以上カバー）。
- 各文は短く（A1 らしく 3〜8語目安）、対象語を必ず含む。JA/EN 訳を付ける。

## 生成プロンプト（雛形）
> あなたはドイツ語 A1 教材の編集者です。次の見出し語について、上記「A1 の天井」を厳守した例文を作ってください。
> 見出し語: {lemma}（{pos}{article 等}）／語義: {meanings}
> 出力 JSON: [{ "de": "...", "ja": "...", "en": "..." }, ...]

## 検証プロンプト（雛形・別エージェント）
> 次のドイツ語例文が A1 の文法・語彙の天井を超えていないか厳密に判定。超過/誤り/対象語未使用があれば理由とともに rejected とし、可能なら修正案も出す。
> 対象語: {lemma} ／ 文: {de}
> 出力: { "ok": true|false, "reasons": [...], "fix": "修正文 or null" }
````

**Step 2: 例文を生成**して `A1/words.json` を作る（`tools/a1_meanings.json` の各語に `examples`（de/ja/en）を付与）。バッチ単位で実施。

**Step 3: チェックポイント** — 全語に必要数の例文（多義語は3文以上）。`node -e` で「examples.length >= 必要数」を全語確認。

---

### Task 17: 例文の検証パス

**Files:**
- Modify: `A1/words.json`（不合格文を修正/再生成）

**Step 1: 検証エージェントを走らせる**（`sentence_pipeline.md` の検証プロンプト）。各例文を①文法レベル超過 ②語彙範囲外 ③独語の正しさ ④対象語の使用 の4観点で判定。`ok:false` は `fix` 採用 or 再生成。

**Step 2: 抜き取り人手確認** — ランダムに20文を目視し、従属節・比較級・付加語格変化・受動態が混入していないか確認（A1 では出ない要素）。

**Step 3: チェックポイント** — 全例文が検証 ok（または修正済み）。混入ゼロを確認。

---

### Task 18: A1 全体の音声＋タイミング生成

**Files:**
- Modify: `A1/words.json`（`audio`/`timing` 付与）
- Create: `A1/audio/*.mp3`（約 650語 × 2〜3文 ≒ 1300〜2000 ファイル）

**Step 1: 生成実行**（時間がかかるためバックグラウンド推奨。再実行安全＝途中再開可）

Run: `tools/.venv/bin/python tools/tts_generate.py A1`
Expected: 各 example の MP3 が `A1/audio/` に生成され、`words.json` に `timing` がマージされる。レート制限が出たら分割再実行。

**Step 2: 件数確認**

Run: `ls A1/audio/*.mp3 | wc -l`
Expected: 例文総数と一致。

**Step 3: チェックポイント** — 欠落ファイルがない（`tts_generate.py` を再実行して "done" まで通る）。

---

### Task 19: A1 全データ検証

**Step 1: 検証**

Run: `node tools/validate_data.mjs A1`
Expected: `✓ 約650 words valid`（エラー0）。

**Step 2: チェックポイント** — exit 0。エラーがあれば該当語を修正して再検証。

---

### Task 20: 通し確認（スモーク）と仕上げ

**Files:**
- （必要なら）`tests/smoke.spec.js`（Playwright、任意）

**Step 1: 手動通し** — `python3 -m http.server 8000` → ホーム件数表示 → フラッシュカードで数語を「覚えてた/あやふや/忘れた」評価 → リロードで box 保持 → 読むだけで検索・カラオケ。

**Step 2: 軽いスモーク（任意）** — webapp-testing(Playwright) で「ホーム表示 → フラッシュカード遷移 → めくる → 評価 → カードが進む」を1本だけ自動化。

**Step 3: フォールバック確認** — 1語だけ `timing` を一時的に空にして ▶ を押し、Web Speech で発話されることを確認（確認後戻す）。

**Step 4: チェックポイント（MVP 完了）** — A1 約650語で2モード＋カラオケ＋忘却曲線が動作。`node --test` と `validate_data.mjs A1` が green。

---

## 完了の定義（A1 MVP）
- [ ] `node --test` 全パス（`srs.js`）
- [ ] `node tools/validate_data.mjs A1` がエラー0（約650語、各語 例文2文以上／多義語3文以上、全例文に音声＋タイミング）
- [ ] 例文が A1 文法・語彙の天井内（検証パス済み）
- [ ] 読むだけモード：検索・詳細・カラオケ追従が動作
- [ ] フラッシュカードモード：自己評価3段階が Leitner を駆動し localStorage に永続
- [ ] 音声/タイミング欠落時に Web Speech フォールバック
- [ ] `python3 -m http.server` で起動・オフライン動作
