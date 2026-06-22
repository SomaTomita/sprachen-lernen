# Deutsch Aussprache（発音練習）App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Anna の自己紹介テキストを使って、全文 / 文単位 / 単語単位で発音を聞き分け、いま発音している箇所を強調表示し、発音ポイントを単語ごとに確認できるローカル発音練習アプリを作る。

**Architecture:** `vocabulary/` と同じ「ビルド不要・オフライン・素の HTML/CSS/JS(ES Modules)」構成をそのまま踏襲する。コンテンツは `data/text.json`（発音ルール集 + 段落→文→トークン + 文ごとの単語タイミング）に集約。音声は `edge-tts` で「文ごとの MP3（カラオケ用タイミング付き）」と「単語ごとの MP3（単体再生用）」を生成。再生・ハイライトのエンジンは `vocabulary/js/audio.js` の `playKaraoke` を移植・拡張する。

**Tech Stack:** HTML5 / CSS（vocabulary のデザイントークン流用）/ JavaScript ES Modules / `edge-tts`(Python, `de-DE-KatjaNeural`) / `node --test`（純粋ロジックの単体テスト）/ `python3 -m http.server`（配信）。

---

## 0. 背景と前提（実装者向け）

- 参照実装は `/Users/soma/Documents/deutsch/vocabulary/`。読むべきファイル:
  - `js/audio.js` … `renderSentence` / `playKaraoke`（カラオケの中核。**ほぼそのまま流用**）
  - `js/main.js` … ブートストラップ・ナビ・ビュー切替の型
  - `js/reader.js` … 一覧→詳細→例文カラオケの DOM 構築の型
  - `js/data.js` / `js/storage.js` … fetch ローダ / localStorage
  - `tools/tts_generate.py` … edge-tts で MP3 + WordBoundary タイミング生成（**これを拡張**）
  - `css/styles.css` … デザイントークンと `.kw.active`（**トークン部はコピー**）
- 本アプリの作業ディレクトリ: `/Users/soma/Documents/deutsch/pronunciation/`
- `deutsch` リポジトリは **git 管理外**。各タスク末尾の「チェックポイント(任意)」は、ユーザーが希望した場合のみ。勝手に `git init`/commit しない。
- 配信は必ず HTTP 経由（`file://` は ES Modules/`fetch` のため不可）。

### ⚠️ コンテンツ確認事項（実装前にユーザー承認）

下記テキストは YouTube 解説の文字起こしから**復元**したもの。第1・第2段落と第3段落の最初の3文は確度が高い。文字起こし末尾（`Hund` / `spazieren` / `sonst` 周辺）は不明瞭なため、**推測で文を作らず**第3段落は3文に留めている。ユーザーが正規テキストを持っていれば差し替える。数詞は発音練習の対象（`fünfzehn` の ü 等）なので**つづりで表記**する。

**第1段落（自己紹介）**
1. Mein Name ist Anna.
2. Ich komme aus Österreich und lebe seit drei Jahren in Deutschland.
3. Ich bin fünfzehn Jahre alt und habe zwei Geschwister.
4. Meine Schwester heißt Klara und ist dreizehn Jahre alt.
5. Mein Bruder Michael ist achtzehn Jahre alt.
6. Wir wohnen mit unseren Eltern in einem Haus in München.
7. Mein Vater arbeitet in einer Bank.

**第2段落（学校・趣味）**
1. Ich gehe gerne in die Schule und mag Tiere.
2. Mein Lieblingsfach ist Mathematik.
3. Physik und Chemie mag ich nicht so gern.
4. Wir haben einen Hund, zwei Katzen und im Garten einen Teich mit Goldfischen.

**第3段落（放課後）**
1. Nach der Schule gehe ich oft mit meinen Freundinnen im Park spazieren.
2. Manchmal essen wir ein Eis.
3. Am Samstag gehen wir oft ins Kino.

---

## 1. 完成図（ディレクトリ）

```
pronunciation/
  index.html
  package.json
  README.md
  css/
    styles.css                 # vocabulary のトークンをコピー + 発音用追加
  js/
    util.js                    # 純粋関数（slugify / activeIndexAt / flattenSentences）
    data.js                    # text.json ローダ
    player.js                  # 文カラオケ / 単語単体再生 / 全文シーケンサ
    reader.js                  # テキスト描画（段落→文→トークン、再生ボタン、速度）
    tips.js                    # 発音ルール参照 + ポイントパネル/一覧
    storage.js                 # 再生速度などの環境設定（localStorage）
    main.js                    # ブートストラップ・ナビ・ビュー切替
  data/
    text.json                  # コンテンツ本体（rules + paragraphs）
    audio/
      p1-s1.mp3 …              # 文ごと（カラオケ用）
      words/<slug>.mp3         # 単語ごと（単体再生用）
  tools/
    tts_generate.py            # edge-tts 生成（文 + 単語）
    validate_data.mjs          # トークン⇔タイミング整合・ルールID検証
    .venv/                     # Python venv（edge-tts）
  tests/
    util.test.js               # 純粋関数の単体テスト
    data.test.js               # text.json の整合テスト
  docs/plans/2026-06-21-pronunciation-app.md
```

### ビューと操作（UI 仕様）

- **発音練習（メイン / 1画面）**: 段落→文→トークンを縦に表示。
  - ヘッダに「▶ 全文を再生」「再生速度 1.0x / 0.75x」トグル。
  - 各文の左に「▶」ボタン（その文のカラオケ再生）。
  - 各単語（トークン）は `<button class="kw">`。クリック=その単語の単体音声を再生 + その単語にポイントがあれば右（モバイルは下）の「発音のポイント」パネルに表示。
  - 再生中: いま鳴っている**文**を `.sentence.is-playing`、いま鳴っている**単語**を `.kw.active`（青反転、vocabulary と同一挙動）で強調。全文再生では文が自動で進む。
  - ポイントを持つ単語には下線（`.kw.has-tip`）を付け、押せば解説が出ることを示す。
- **発音のポイント一覧**: `rules[]` を一覧表示（V=無声、ch のイヒ/アハ、ö/ü、語末 -er/-en、zw、sp/st…）。各ルールから該当語へ辿れると尚可（任意）。
- **ホーム**: タイトル + 「練習を始める」+ 出典（Japan Reading Association の朗読解説に基づく）。

> 学習進捗（SRS）は本アプリでは不要。localStorage は再生速度の保存のみ。

---

## 2. データモデル（`data/text.json`）

`rules` は再利用可能な発音ルール（DRY）。各トークンは `r`（rule id 配列）で参照する。`timing` は TTS 生成時に各文へ後付けされる（初期は空配列）。`tokens` の要素数と `timing` の要素数は一致させる（バリデータで担保）。

```jsonc
{
  "id": "vorstellung",
  "title": "Vorstellung — Anna",
  "title_ja": "自己紹介 — アンナ",
  "voice": "de-DE-KatjaNeural",
  "source": "YouTube: 日本独文学会『音読トレーニング』解説より復元",
  "rules": [ /* §Appendix A 参照（全 28 件） */ ],
  "paragraphs": [
    {
      "id": "p1",
      "sentences": [
        {
          "id": "p1-s1",
          "de": "Mein Name ist Anna.",
          "ja": "私の名前はアンナです。",
          "audio": "audio/p1-s1.mp3",
          "timing": [],
          "tokens": [
            { "t": "Mein",  "r": ["ei-as-ai"] },
            { "t": "Name",  "r": ["final-vowel-schwa"] },
            { "t": "ist",   "r": [] },
            { "t": "Anna.", "r": ["accent-first", "final-vowel-schwa"] }
          ]
        }
      ]
    }
  ]
}
```

- `tokens[i].t`: 画面表示テキスト（句読点込み）。
- `tokens[i].r`: 適用ルール id の配列（`rules[].id` に存在必須）。
- `tokens[i].word`（任意）: 単体音声・スラッグ算出に使う「句読点を除いた語」。省略時は `t` から句読点を除去して算出（`util.slugify`）。

完全な `data/text.json` の中身は **Appendix B** に全文掲載。実装時はそれを丸ごと貼り付ける。

---

## 3. タスク分割（TDD・小さなステップ）

> 各ステップは 2–5 分。純粋ロジック（`util.js`）は赤→緑→リファクタの TDD。DOM/音声を含む層は手動 + Playwright で確認。

### Task 0: スキャフォールド

**Files:**
- Create: `pronunciation/package.json`
- Create: `pronunciation/index.html`
- Create: `pronunciation/README.md`
- Create: `pronunciation/data/audio/words/.gitkeep`（ディレクトリ確保用・空ファイル）

**Step 1: `package.json` を作成**

```json
{
  "name": "deutsch-aussprache",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "validate": "node tools/validate_data.mjs",
    "serve": "python3 -m http.server 8000"
  }
}
```

**Step 2: `index.html` を作成**（vocabulary の構造を踏襲）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#1a2129" />
  <title>Deutsch Aussprache 発音練習</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <a href="#app" class="skip-link">本文へスキップ</a>
  <header class="top-nav">
    <span class="wordmark">DEUTSCH · AUSSPRACHE</span>
    <button type="button" id="navToggle" class="nav-toggle" aria-label="メニューを開く"
      aria-expanded="false" aria-controls="nav"><span class="nav-toggle-bars" aria-hidden="true"></span></button>
    <nav id="nav" aria-label="メインナビゲーション"></nav>
  </header>
  <main id="app" tabindex="-1"></main>
  <footer class="footer">
    <div class="footer-inner">
      <span class="footer-wordmark">DEUTSCH · AUSSPRACHE</span>
      <span class="footer-copy">Pronunciation trainer · Offline build</span>
    </div>
  </footer>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

**Step 3: `README.md` を作成**（§Appendix C の内容）

**Step 4: 動作確認** — `cd pronunciation && python3 -m http.server 8000` で起動し、`http://localhost:8000/` が 200（空の main でも可）。確認後 Ctrl+C。

---

### Task 1: コンテンツ投入（`data/text.json`）

**Files:**
- Create: `pronunciation/data/text.json`

**Step 1:** Appendix B の JSON を**そのまま**保存（`timing` は全て `[]`）。

**Step 2: JSON 妥当性チェック**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/text.json','utf8')); console.log('ok')"`
Expected: `ok`

---

### Task 2: 純粋ユーティリティ + 単体テスト（TDD）

**Files:**
- Create: `pronunciation/js/util.js`
- Test: `pronunciation/tests/util.test.js`

純粋関数 3 つを TDD で実装する。

- `slugify(word)`: ドイツ語の語を音声ファイル名に。小文字化、ä→ae ö→oe ü→ue ß→ss、句読点除去、英数以外は `-`。
- `activeIndexAt(timing, t)`: 再生位置 `t`(秒) に対応するアクティブ単語 index（`audio.js` の tick ロジックを純粋関数化）。
- `flattenSentences(text)`: `paragraphs[].sentences[]` を読み上げ順の配列へ平坦化（全文再生のシーケンス）。

**Step 1: 失敗するテストを書く** — `tests/util.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, activeIndexAt, flattenSentences } from '../js/util.js';

test('slugify: ウムラウト/ß/句読点を正規化', () => {
  assert.equal(slugify('Anna.'), 'anna');
  assert.equal(slugify('Österreich'), 'oesterreich');
  assert.equal(slugify('heißt'), 'heisst');
  assert.equal(slugify('Hund,'), 'hund');
  assert.equal(slugify('Müller'), 'mueller');
});

test('activeIndexAt: 区間に応じてアクティブ index を返す', () => {
  const timing = [
    { w: 'A', s: 0.0, e: 0.5 },
    { w: 'B', s: 0.5, e: 1.0 },
    { w: 'C', s: 1.0, e: 1.5 },
  ];
  assert.equal(activeIndexAt(timing, 0.0), 0);
  assert.equal(activeIndexAt(timing, 0.6), 1);
  assert.equal(activeIndexAt(timing, 1.4), 2);
  assert.equal(activeIndexAt([], 1.0), -1);
});

test('flattenSentences: 読み上げ順に文を平坦化', () => {
  const text = {
    paragraphs: [
      { id: 'p1', sentences: [{ id: 'p1-s1' }, { id: 'p1-s2' }] },
      { id: 'p2', sentences: [{ id: 'p2-s1' }] },
    ],
  };
  assert.deepEqual(flattenSentences(text).map(s => s.id), ['p1-s1', 'p1-s2', 'p2-s1']);
});
```

**Step 2: 失敗を確認** — Run: `node --test tests/util.test.js` → FAIL（モジュール未定義）。

**Step 3: 最小実装** — `js/util.js`

```js
// 純粋関数のみ。DOM/音声に依存しない（テスト可能）。

/** ドイツ語の語 → 音声ファイル名スラッグ */
export function slugify(word) {
  return String(word)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // 余分なダイアクリティクス除去
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 再生位置 t(秒) のアクティブ単語 index（audio.js の tick と同じ規則） */
export function activeIndexAt(timing, t) {
  let active = -1;
  for (let i = 0; i < timing.length; i++) {
    if (t >= timing[i].s) active = i;
    if (t < timing[i].e) break;
  }
  return active;
}

/** paragraphs[].sentences[] を読み上げ順に平坦化 */
export function flattenSentences(text) {
  const out = [];
  for (const p of text.paragraphs || []) {
    for (const s of p.sentences || []) out.push(s);
  }
  return out;
}
```

**Step 4: 緑を確認** — Run: `node --test tests/util.test.js` → PASS（3 件）。

---

### Task 3: データローダ（`data/data.js`）

**Files:**
- Create: `pronunciation/js/data.js`

vocabulary の `data.js` を踏襲。

```js
export async function loadText() {
  const res = await fetch('data/text.json');
  if (!res.ok) throw new Error('failed to load data/text.json');
  return res.json();
}

/** rules 配列 → id 索引 */
export function indexRules(rules) {
  const m = {};
  for (const r of rules || []) m[r.id] = r;
  return m;
}
```

> 純粋な `indexRules` のみテスト追加は任意（`data.test.js` で間接的にカバー）。

---

### Task 4: 設定ストア（`js/storage.js`）

**Files:**
- Create: `pronunciation/js/storage.js`

```js
const KEY = 'deutsch-aussprache-v1';
function defaults() { return { rate: 1 }; }

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch { return defaults(); }
}
export function saveSettings(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
```

---

### Task 5: 再生エンジン（`js/player.js`）

**Files:**
- Create: `pronunciation/js/player.js`

`vocabulary/js/audio.js` の `playKaraoke` を移植し、(a) 文カラオケ、(b) 単語単体再生、(c) 全文シーケンス、を提供する。`activeIndexAt`/`slugify` は `util.js` から使う。

```js
import { activeIndexAt, slugify } from './util.js';

/** 1文のカラオケ再生。spans は reader.js が作った .kw 配列。onWord/onEnd は任意コールバック。 */
export function playSentence(sentence, spans, { rate = 1, onEnd } = {}) {
  const timing = sentence.timing;
  if (!sentence.audio || !timing || !timing.length) {
    const u = speakFallback(sentence.de);
    if (onEnd) setTimeout(onEnd, 0);
    return { stop: () => speechSynthesis.cancel(), audio: null, utterance: u };
  }
  const audio = new Audio(`data/${sentence.audio}`);
  audio.playbackRate = rate;
  let raf = 0;
  const clear = () => spans.forEach(sp => sp.classList.remove('active'));
  const tick = () => {
    const active = activeIndexAt(timing, audio.currentTime);
    spans.forEach((sp, i) => sp.classList.toggle('active', i === active));
    if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
  };
  audio.addEventListener('play', () => { raf = requestAnimationFrame(tick); });
  audio.addEventListener('ended', () => { cancelAnimationFrame(raf); clear(); if (onEnd) onEnd(); });
  audio.play();
  return {
    audio,
    stop() { cancelAnimationFrame(raf); audio.pause(); clear(); },
  };
}

/** 単語単体の音声を再生（data/audio/words/<slug>.mp3）。無ければ TTS フォールバック。 */
export function playWord(token) {
  const word = token.word || token.t;
  const slug = slugify(word);
  const audio = new Audio(`data/audio/words/${slug}.mp3`);
  audio.addEventListener('error', () => speakFallback(word), { once: true });
  audio.play().catch(() => speakFallback(word));
  return audio;
}

/** 全文を順番に再生。各文の spans を解決する resolveSpans(sentence)->spans を渡す。 */
export function playAll(sentences, { rate = 1, resolveSpans, onSentence, onEnd } = {}) {
  let i = 0;
  let current = null;
  let stopped = false;
  const next = () => {
    if (stopped || i >= sentences.length) { if (onEnd) onEnd(); return; }
    const s = sentences[i];
    if (onSentence) onSentence(s, i);
    current = playSentence(s, resolveSpans(s), { rate, onEnd: () => { i += 1; next(); } });
  };
  next();
  return { stop() { stopped = true; if (current) current.stop(); } };
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

> 注: `playKaraoke` の `data/${level}/...` に対し、本アプリは level 階層が無いので `data/${sentence.audio}`（= `data/audio/p1-s1.mp3`）。

---

### Task 6: 発音ポイント（`js/tips.js`）

**Files:**
- Create: `pronunciation/js/tips.js`

```js
/** トークンが参照する rule オブジェクトの配列を返す */
export function tipsForToken(token, rulesById) {
  return (token.r || []).map(id => rulesById[id]).filter(Boolean);
}

/** 発音ポイントパネルを host に描画 */
export function renderTipPanel(host, token, rulesById) {
  const tips = tipsForToken(token, rulesById);
  if (!tips.length) {
    host.innerHTML = `<p class="tip-empty">この語の発音ポイントは登録されていません。</p>`;
    return;
  }
  const word = token.word || token.t;
  host.innerHTML = `
    <p class="eyebrow">発音のポイント</p>
    <h3 class="tip-word">${word}</h3>
    <ul class="tip-list">
      ${tips.map(r => `
        <li class="tip-item">
          <p class="tip-label">${r.label}</p>
          <p class="tip-detail">${r.detail}</p>
        </li>`).join('')}
    </ul>`;
}

/** 全ルール一覧を host に描画 */
export function renderRuleList(host, rules) {
  host.innerHTML = `
    <section class="rules" aria-labelledby="rules-title">
      <h2 class="reader-title" id="rules-title">発音のポイント一覧</h2>
      <ul class="rule-list">
        ${rules.map(r => `
          <li class="rule-item">
            <p class="rule-label">${r.label}</p>
            <p class="rule-detail">${r.detail}</p>
            ${r.examples ? `<p class="rule-examples">例: ${r.examples.join(' · ')}</p>` : ''}
          </li>`).join('')}
      </ul>
    </section>`;
}
```

---

### Task 7: テキスト描画（`js/reader.js`）

**Files:**
- Create: `pronunciation/js/reader.js`

段落→文→トークンを描画。文ごとの ▶、トークンの click、全文再生、速度トグル、ポイントパネルを配線。`renderSentence`（vocabulary の関数）相当をここで実装し、`token.r` がある語に `.has-tip` を付与する。

```js
import { playSentence, playWord, playAll } from './player.js';
import { renderTipPanel } from './tips.js';
import { flattenSentences } from './util.js';

/** 1文の .kw スパンを生成して返す（tokens を正とする） */
function renderSentenceTokens(container, sentence, { onWordClick }) {
  container.innerHTML = '';
  const spans = [];
  sentence.tokens.forEach((tok, i) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'kw' + ((tok.r && tok.r.length) ? ' has-tip' : '');
    s.textContent = tok.t;
    s.dataset.i = String(i);
    s.setAttribute('aria-label', `単語を再生: ${tok.word || tok.t}`);
    s.addEventListener('click', () => onWordClick(tok, s));
    container.append(s, document.createTextNode(' '));
    spans.push(s);
  });
  return spans;
}

export function renderReader(app, text, rulesById, settings, persist) {
  app.innerHTML = `
    <section class="reader" aria-labelledby="reader-title">
      <div class="reader-head">
        <h2 class="reader-title" id="reader-title">${text.title_ja}</h2>
        <div class="reader-controls">
          <button type="button" id="playAll" class="button-primary">▶ 全文を再生</button>
          <button type="button" id="rateToggle" class="button-secondary" aria-pressed="false">${settings.rate === 1 ? '速度 1.0x' : '速度 0.75x'}</button>
        </div>
      </div>
      <div class="reader-body">
        <div id="passage" class="passage"></div>
        <aside id="tip" class="tip-panel" aria-live="polite"></aside>
      </div>
    </section>`;

  const passage = app.querySelector('#passage');
  const tipHost = app.querySelector('#tip');
  const playAllBtn = app.querySelector('#playAll');
  const rateBtn = app.querySelector('#rateToggle');

  const spansBySentence = new Map(); // sentence.id -> spans[]
  let currentPlayback = null;        // { stop }
  let playingSentenceEl = null;

  const clearSentenceHighlight = () => {
    if (playingSentenceEl) playingSentenceEl.classList.remove('is-playing');
    playingSentenceEl = null;
  };

  // 段落→文→トークン を描画
  for (const p of text.paragraphs) {
    const pEl = document.createElement('p');
    pEl.className = 'para';
    for (const sentence of p.sentences) {
      const sEl = document.createElement('span');
      sEl.className = 'sentence';
      sEl.dataset.id = sentence.id;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-button sentence-play';
      btn.textContent = '▶';
      btn.setAttribute('aria-label', `文を再生: ${sentence.de}`);

      const words = document.createElement('span');
      words.className = 'sentence-words';
      const spans = renderSentenceTokens(words, sentence, {
        onWordClick: (tok) => { playWord(tok); renderTipPanel(tipHost, tok, rulesById); },
      });
      spansBySentence.set(sentence.id, spans);

      btn.addEventListener('click', () => {
        if (currentPlayback) currentPlayback.stop();
        clearSentenceHighlight();
        sEl.classList.add('is-playing');
        playingSentenceEl = sEl;
        currentPlayback = playSentence(sentence, spans, {
          rate: settings.rate,
          onEnd: () => clearSentenceHighlight(),
        });
      });

      sEl.append(btn, words);
      pEl.append(sEl, document.createTextNode(' '));
    }
    passage.append(pEl);
  }

  // 全文再生
  playAllBtn.addEventListener('click', () => {
    if (currentPlayback) { currentPlayback.stop(); currentPlayback = null; clearSentenceHighlight(); playAllBtn.textContent = '▶ 全文を再生'; return; }
    const sentences = flattenSentences(text);
    playAllBtn.textContent = '■ 停止';
    currentPlayback = playAll(sentences, {
      rate: settings.rate,
      resolveSpans: (s) => spansBySentence.get(s.id),
      onSentence: (s) => {
        clearSentenceHighlight();
        const el = passage.querySelector(`.sentence[data-id="${s.id}"]`);
        if (el) { el.classList.add('is-playing'); playingSentenceEl = el; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      },
      onEnd: () => { clearSentenceHighlight(); currentPlayback = null; playAllBtn.textContent = '▶ 全文を再生'; },
    });
  });

  // 速度トグル（1.0x / 0.75x）
  rateBtn.addEventListener('click', () => {
    settings.rate = settings.rate === 1 ? 0.75 : 1;
    rateBtn.textContent = settings.rate === 1 ? '速度 1.0x' : '速度 0.75x';
    rateBtn.setAttribute('aria-pressed', String(settings.rate !== 1));
    persist();
  });

  tipHost.innerHTML = `<p class="tip-empty">単語をクリックすると、その音のポイントが表示されます。</p>`;
}
```

---

### Task 8: ブートストラップ（`js/main.js`）

**Files:**
- Create: `pronunciation/js/main.js`

```js
import { loadText, indexRules } from './data.js';
import { loadSettings, saveSettings } from './storage.js';
import { renderReader } from './reader.js';
import { renderRuleList } from './tips.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');

let text = null;
let rulesById = {};
let currentView = 'home';
const settings = loadSettings();
const persist = () => saveSettings(settings);

function closeNav() {
  nav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'メニューを開く');
}

function go(view) {
  closeNav();
  currentView = view;
  if (view === 'reader') renderReader(app, text, rulesById, settings, persist);
  else if (view === 'rules') renderRuleList(app, text.rules);
  else renderHome();
  renderNav();
  app.focus();
}

function renderNav() {
  nav.innerHTML = `
    <button type="button" id="navHome" class="nav-link"${currentView === 'home' ? ' aria-current="page"' : ''}>ホーム</button>
    <button type="button" id="navRead" class="nav-link"${currentView === 'reader' ? ' aria-current="page"' : ''}>発音練習</button>
    <button type="button" id="navRules" class="nav-link"${currentView === 'rules' ? ' aria-current="page"' : ''}>発音のポイント</button>`;
  nav.querySelector('#navHome').addEventListener('click', () => go('home'));
  nav.querySelector('#navRead').addEventListener('click', () => go('reader'));
  nav.querySelector('#navRules').addEventListener('click', () => go('rules'));
}

function renderHome() {
  app.innerHTML = `
    <section class="hero-band-dark bleed" aria-labelledby="hero-title">
      <div class="hero-inner">
        <p class="hero-eyebrow">発音トレーニング</p>
        <h1 class="hero-title" id="hero-title">${text.title}</h1>
        <p class="hero-sub">Anna の自己紹介を、全文・文単位・単語単位で聞き分けながら音読練習。いま発音している箇所が青く光ります。発音ポイント付き。</p>
        <div class="hero-actions">
          <button type="button" id="toRead" class="button-primary">練習を始める</button>
          <button type="button" id="toRules" class="button-secondary-on-dark">発音のポイント</button>
        </div>
      </div>
    </section>
    <section aria-labelledby="src-label">
      <p class="eyebrow" id="src-label">出典</p>
      <p class="home-source">${text.source}</p>
    </section>`;
  app.querySelector('#toRead').addEventListener('click', () => go('reader'));
  app.querySelector('#toRules').addEventListener('click', () => go('rules'));
}

async function init() {
  try {
    text = await loadText();
    rulesById = indexRules(text.rules);
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });
    renderNav();
    renderHome();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    app.innerHTML = `<section class="error-band"><p class="eyebrow">エラー</p><p>データ読込に失敗しました: ${msg}<br>（<code>python3 -m http.server</code> 経由で開いていますか？）</p></section>`;
  }
}
init();
```

---

### Task 9: スタイル（`css/styles.css`）

**Files:**
- Create: `pronunciation/css/styles.css`

**Step 1:** vocabulary の `css/styles.css` を**コピー**して土台にする。

Run: `cp ../vocabulary/css/styles.css css/styles.css`

**Step 2:** vocabulary 固有の不要 UI（flashcard / word-list / detail 等）はそのまま残しても害は無いが、本アプリ用に以下を**末尾に追記**（既存の `.kw` / `.kw.active` はそのまま流用）。

```css
/* ============================================================
   PRONUNCIATION additions
   ============================================================ */
.reader-controls { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.reader-body { display: grid; grid-template-columns: 1fr; gap: var(--space-lg); }
@media (min-width: 880px) { .reader-body { grid-template-columns: 1.6fr 1fr; align-items: start; } }

.passage { display: flex; flex-direction: column; gap: var(--space-lg); }
.para { font-size: 20px; line-height: 2.1; color: var(--body-strong); margin: 0; }

.sentence { border-left: 3px solid transparent; padding-left: var(--space-xs); transition: background-color .15s, border-color .15s; }
.sentence.is-playing { background-color: #eef4fd; border-left-color: var(--primary); }
.sentence-play { vertical-align: middle; margin-right: 6px; transform: scale(.8); }
.sentence-words { }

/* kw is a <button> here: reset native button look, keep vocabulary highlight */
.kw {
  font: inherit; color: inherit; background: none; border: 0; padding: 0 1px; margin: 0;
  cursor: pointer; border-radius: 0; line-height: inherit;
}
.kw.has-tip { text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; text-decoration-color: var(--hairline-strong); }
.kw:hover { background: var(--surface-strong); }
.kw.active { background: var(--primary); color: var(--on-primary); } /* 再生中の語 */

/* 発音ポイントパネル */
.tip-panel { border: 1px solid var(--hairline); background: var(--surface-card); padding: var(--space-lg); position: sticky; top: var(--space-md); }
.tip-empty { color: var(--muted); }
.tip-word { font-weight: 700; font-size: 24px; color: var(--ink); margin-bottom: var(--space-sm); }
.tip-list, .rule-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.tip-item, .rule-item { border-top: 1px solid var(--hairline); padding-top: var(--space-sm); }
.tip-label, .rule-label { font-weight: 700; color: var(--body-strong); }
.tip-detail, .rule-detail { color: var(--body); font-size: 15px; }
.rule-examples { color: var(--muted); font-size: 13px; margin-top: 4px; }
.home-source { color: var(--muted); }
```

**Step 3: 確認** — サーバ起動 → 「発音練習」で段落表示、`.has-tip` の点線下線、文の左 ▶ が見えること。

---

### Task 10: 音声生成スクリプト（`tools/tts_generate.py`）

**Files:**
- Create: `pronunciation/tools/tts_generate.py`

vocabulary の TTS を拡張: (1) 文ごとに MP3 + WordBoundary タイミング、(2) 全トークンの一意な語ごとに単語 MP3。`tokens` と `timing` の件数が一致するよう、句読点のみの WordBoundary は除外。

```python
#!/usr/bin/env python3
"""edge-tts で文ごとの MP3+タイミングと、単語ごとの MP3 を生成して text.json を更新。

Usage: tools/.venv/bin/python tools/tts_generate.py
- 生成済み（mp3 があり timing もある）文/語はスキップ＝再実行で途中再開可。
- 一時的なネットワーク障害はリトライ、恒久失敗はスキップして続行。
"""
import asyncio
import json
import re
import sys
from pathlib import Path

import edge_tts

RETRIES = 4

PUNCT_ONLY = re.compile(r"^[\W_]+$")

UMLAUT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
                         "Ä": "ae", "Ö": "oe", "Ü": "ue"})


def slugify(word: str) -> str:
    w = word.translate(UMLAUT).lower()
    w = re.sub(r"[^a-z0-9]+", "-", w)
    return w.strip("-")


async def synth_sentence(text: str, voice: str, out_path: Path) -> list[dict]:
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            c = edge_tts.Communicate(text, voice, boundary="WordBoundary")
            words: list[dict] = []
            audio = bytearray()
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    if PUNCT_ONLY.match(ch["text"]):
                        continue
                    words.append({
                        "w": ch["text"],
                        "s": round(ch["offset"] / 1e7, 3),
                        "e": round((ch["offset"] + ch["duration"]) / 1e7, 3),
                    })
            if not audio or not words:
                raise RuntimeError("empty audio or timing")
            out_path.write_bytes(bytes(audio))
            return words
        except Exception as err:  # noqa: BLE001
            last_err = err
            await asyncio.sleep(min(2 ** attempt, 15))
    raise RuntimeError(f"failed after {RETRIES} tries: {last_err}")


async def synth_word(word: str, voice: str, out_path: Path) -> None:
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            c = edge_tts.Communicate(word, voice)
            audio = bytearray()
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
            if not audio:
                raise RuntimeError("empty audio")
            out_path.write_bytes(bytes(audio))
            return
        except Exception as err:  # noqa: BLE001
            last_err = err
            await asyncio.sleep(min(2 ** attempt, 15))
    raise RuntimeError(f"failed after {RETRIES} tries: {last_err}")


async def main() -> int:
    data_path = Path("data") / "text.json"
    data = json.loads(data_path.read_text(encoding="utf-8"))
    voice = data.get("voice", "de-DE-KatjaNeural")
    audio_dir = Path("data") / "audio"
    words_dir = audio_dir / "words"
    audio_dir.mkdir(parents=True, exist_ok=True)
    words_dir.mkdir(parents=True, exist_ok=True)

    def save() -> None:
        data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    failures: list[str] = []
    seen_words: set[str] = set()

    for p in data["paragraphs"]:
        for s in p["sentences"]:
            mp3 = audio_dir / Path(s["audio"]).name
            if not (mp3.exists() and s.get("timing")):
                try:
                    s["timing"] = await synth_sentence(s["de"], voice, mp3)
                    print(f"ok sentence {s['id']} ({len(s['timing'])} words)", flush=True)
                    save()
                except Exception as err:  # noqa: BLE001
                    failures.append(f"{s['id']}: {err}")
                    print(f"FAIL sentence {s['id']}: {err}", flush=True)
            # 単語音声
            for tok in s["tokens"]:
                word = tok.get("word") or re.sub(r"[\W_]+$", "", tok["t"])
                word = re.sub(r"^[\W_]+", "", word)
                slug = slugify(word)
                if not slug or slug in seen_words:
                    continue
                seen_words.add(slug)
                wp = words_dir / f"{slug}.mp3"
                if wp.exists():
                    continue
                try:
                    await synth_word(word, voice, wp)
                    print(f"ok word {slug}", flush=True)
                except Exception as err:  # noqa: BLE001
                    failures.append(f"word {slug}: {err}")
                    print(f"FAIL word {slug}: {err}", flush=True)

    save()
    print(f"done. words={len(seen_words)}, failed={len(failures)}", flush=True)
    if failures:
        print("FAILURES (re-run to retry):", flush=True)
        for f in failures:
            print("  " + f, flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
```

**Step 1: venv 準備**（vocabulary の venv を流用して再インストール回避）

```bash
cd /Users/soma/Documents/deutsch/pronunciation
python3 -m venv tools/.venv
tools/.venv/bin/pip install -q edge-tts
```

> もしくは既存の `../vocabulary/tools/.venv/bin/python` を使ってもよい。

**Step 2: 生成実行（要ネットワーク）**

Run: `tools/.venv/bin/python tools/tts_generate.py`
Expected: `ok sentence p1-s1 (4 words) … ok word … done. words=NN, failed=0`

**Step 3:** `data/audio/*.mp3`（14 文）と `data/audio/words/*.mp3` が生成され、`text.json` の各文 `timing` が埋まったことを確認。

---

### Task 11: データ整合バリデータ + テスト

**Files:**
- Create: `pronunciation/tools/validate_data.mjs`
- Create: `pronunciation/tests/data.test.js`

**Step 1: バリデータ** — `tools/validate_data.mjs`

```js
import { readFileSync } from 'node:fs';

const text = JSON.parse(readFileSync(new URL('../data/text.json', import.meta.url), 'utf8'));
const ruleIds = new Set((text.rules || []).map(r => r.id));
const errors = [];

for (const p of text.paragraphs) {
  for (const s of p.sentences) {
    // ルールID の存在
    for (const tok of s.tokens) {
      for (const id of tok.r || []) {
        if (!ruleIds.has(id)) errors.push(`${s.id}: unknown rule id "${id}" on token "${tok.t}"`);
      }
    }
    // timing が入っていれば件数一致
    if (s.timing && s.timing.length && s.timing.length !== s.tokens.length) {
      errors.push(`${s.id}: timing(${s.timing.length}) != tokens(${s.tokens.length})`);
    }
  }
}

if (errors.length) {
  console.error('VALIDATION FAILED:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('text.json OK');
```

**Step 2: テスト** — `tests/data.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = JSON.parse(readFileSync(new URL('../data/text.json', import.meta.url), 'utf8'));

test('全トークンの rule id が rules に存在する', () => {
  const ids = new Set(text.rules.map(r => r.id));
  for (const p of text.paragraphs)
    for (const s of p.sentences)
      for (const tok of s.tokens)
        for (const id of tok.r || [])
          assert.ok(ids.has(id), `${s.id}: unknown rule "${id}"`);
});

test('timing があれば tokens と件数一致', () => {
  for (const p of text.paragraphs)
    for (const s of p.sentences)
      if (s.timing && s.timing.length)
        assert.equal(s.timing.length, s.tokens.length, `${s.id} mismatch`);
});

test('各文に audio パスと最低1トークン', () => {
  for (const p of text.paragraphs)
    for (const s of p.sentences) {
      assert.match(s.audio, /^audio\/.+\.mp3$/);
      assert.ok(s.tokens.length > 0);
    }
});
```

**Step 3: 実行**

Run: `node --test` （util.test.js + data.test.js 全て）
Expected: PASS。`node tools/validate_data.mjs` → `text.json OK`。

> もし「timing != tokens」で落ちたら、その文の `tokens` 分割を WordBoundary に合わせて調整（句読点の分割揺れ）。`tts_generate.py` は句読点単独 boundary を除外済みなので通常一致する。

---

### Task 12: 手動 E2E 確認

**Step 1:** `python3 -m http.server 8000` 起動。
**Step 2:** `webapp-testing` スキル（Playwright）で確認、または手動で:
- ホーム→「練習を始める」。
- 「▶ 全文を再生」: 文が順に `.is-playing`、語が順に `.kw.active`、自動スクロール、終了でボタンが戻る。停止も効く。
- 各文の ▶: その文だけカラオケ。
- 単語クリック: 単体音声が鳴り、ポイントパネルに解説（`has-tip` 語）。
- 速度トグル 0.75x で遅く再生・設定が再読込後も保持（localStorage）。
- 「発音のポイント」: 28 ルール一覧。
**Step 3:** スクリーンショットを取得して提示。

---

### Task 13: ドキュメント仕上げ

**Files:** `pronunciation/README.md`（Appendix C）を最終化。設計メモを `docs/design/` に置くかは任意。

---

## Appendix A: 発音ルール（`rules`、全 28 件）

> 解説から抽出。`label`=見出し、`detail`=要点、`examples`=本文中の該当語。

| id | label | detail（要約） |
|----|-------|------|
| `v-as-f` | V は無声 /f/ | 「V」は濁らせず /f/。例: Vorstellung→「フォア…」、Vater→「ファータ」。 |
| `w-as-v` | W は /v/ | 唇を使う「ヴ」。例: wohnen、wir、Schwester。 |
| `s-as-z` | 母音前の S は /z/ | 語頭・母音前の s は濁る。例: seit→「ザイト」、so。 |
| `ss-sharp-s` | ß / ss は鋭い /s/ | 無声のはっきりした s。例: heißt。 |
| `final-d-devoiced` | 語末 d → /t/ | 例: und→「ウント」、Hund→「フント」、Deutschland。 |
| `final-g-devoiced` | 語末 g → /k/ | 例: Tag→「ターク」、mag→「マク」、Samstag。 |
| `ei-as-ai` | つづり ei → /ai/ | 例: mein、drei、heißt、Reich、Eis。 |
| `eu-as-oy` | つづり eu → /ɔy/ | 例: Deutschland、Freundinnen、neun。 |
| `au-diphthong` | au は「ア→オ」二重母音 | 「アウ」と切らず滑らせる。例: aus、Haus。 |
| `ie-long-i` | つづり ie → 長い /iː/ | 例: Lieblingsfach、Tiere、spazieren、die。 |
| `final-vowel-schwa` | 語末 -e/-a はあいまい母音 | /ə/ で軽く。例: Name、Schule、gerne、Anna、Klara、Tiere。 |
| `final-er-vocalized` | 語末 -er は母音化 /ɐ/ | 「アー」に近く、巻かない。例: Bruder、Schwester、Vater、Mutter、unseren。 |
| `final-en-reduced` | 語末 -en は弱く飲み込む | 例: wohnen、haben、Katzen、Goldfischen、essen、gehen、spazieren。 |
| `ich-laut` | ch(e/i/ä/ö/ü/子音後) = /ç/ | 前舌のやわらか摩擦。例: ich、nicht、München、Chemie、Teich。 |
| `ach-laut` | ch(a/o/u/au後) = /x/ | のどの奥で息を擦る。例: Nach、acht(zehn)、kochen、Fach。 |
| `oe-umlaut` | ö = 唇を縦に丸め舌を前へ | 例: Österreich。 |
| `ue-umlaut` | ü = 唇を鋭くすぼめ舌を前へ | ö より狭い。例: fünfzehn、München、für。 |
| `z-as-ts` | z = /ts/、zw は母音を挟まず | 例: zwei→「ツヴァイ」、Katzen(tz)、zehn。 |
| `sp-st-shp` | 語頭 sp/st = /ʃp, ʃt/ | 「シュプ/シュト」。例: spazieren→「シュパ…」。 |
| `ph-as-f` | Ph = /f/ | 例: Physik。 |
| `german-l` | L は舌先を上前歯裏に強く | 英語の軽い L と別。例: Eltern、Schule、Klara、alt、Lieblingsfach。 |
| `german-r` | R はのど奥の摩擦（口蓋垂） | やわらかく。例: Reich、gerne、Park、arbeitet。 |
| `accent-first` | アクセントは原則第1音節 | 例: Arbeit/arbeitet→「アル…」、Vorstellung、Lieblingsfach、Anna。 |
| `compound-pause` | 複合語は境目で軽く区切る | 例: Österreich(Öster+reich)、Deutschland、Lieblingsfach、Mittagessen。 |
| `final-m-close-lips` | m は唇を閉じる / n は閉じない | im と in の区別。例: im、meinen。 |
| `liaison-rhythm` | 短語の連続は全体のリズムで繋ぐ | 1語ずつ強く言わない。例: mag ich nicht so gern。 |
| `rhythm-keep-pitch` | 途中はピッチを保つ/上げて「続く」感 | 文末はきちんと閉じる。 |
| `sense-group-breath` | 意味のまとまりで息継ぎ | 例: seit drei Jahren / in Deutschland。 |

実装時は各ルールを下記形で `text.json` に格納:
```json
{ "id": "v-as-f", "label": "V は無声音 /f/", "detail": "「V」は濁らせず /f/ で読む。Vorstellung は「フォアシュテルング」、Vater は「ファータ」。", "examples": ["Vater"] }
```

---

## Appendix B: `data/text.json` 全文

> 下記をそのまま `data/text.json` として保存（`timing` は空配列、TTS 実行で自動充填）。トークンの `r` 割り当ては Appendix A のルールに基づく代表例。実装中に過不足があれば調整可（バリデータが整合を保証）。

````json
{
  "id": "vorstellung",
  "title": "Vorstellung — Anna",
  "title_ja": "自己紹介 — アンナ",
  "voice": "de-DE-KatjaNeural",
  "source": "YouTube: 日本独文学会『音読トレーニング』解説より復元。音声は edge-tts(de-DE-KatjaNeural) 生成。",
  "rules": [
    { "id": "v-as-f", "label": "V は無声音 /f/", "detail": "「V」は濁らせない。Vorstellung は「フォアシュテルング」、Vater は「ファータ」。", "examples": ["Vater"] },
    { "id": "w-as-v", "label": "W は /v/", "detail": "唇を使う「ヴ」。wohnen=「ヴォーネン」、wir、Schwester。", "examples": ["wohnen", "wir"] },
    { "id": "s-as-z", "label": "母音前の S は /z/", "detail": "語頭・母音前の s は濁る。seit=「ザイト」、so。", "examples": ["seit", "so"] },
    { "id": "ss-sharp-s", "label": "ß / ss は鋭い /s/", "detail": "無声のはっきりした s。heißt。", "examples": ["heißt"] },
    { "id": "final-d-devoiced", "label": "語末 d → /t/", "detail": "語末の d は無声化。und=「ウント」、Hund=「フント」、Deutschland。", "examples": ["und", "Hund"] },
    { "id": "final-g-devoiced", "label": "語末 g → /k/", "detail": "語末の g は /k/。Tag=「ターク」、mag=「マク」、Samstag。", "examples": ["mag", "Samstag"] },
    { "id": "ei-as-ai", "label": "つづり ei → /ai/", "detail": "「ai（アイ）」と読む。mein、drei、heißt、Reich、Eis。", "examples": ["mein", "drei", "Eis"] },
    { "id": "eu-as-oy", "label": "つづり eu → /ɔy/", "detail": "「オイ」。Deutschland、Freundinnen。", "examples": ["Deutschland", "Freundinnen"] },
    { "id": "au-diphthong", "label": "au は二重母音「ア→オ」", "detail": "「アウ」と切らず滑らせる。aus、Haus。", "examples": ["aus", "Haus"] },
    { "id": "ie-long-i", "label": "つづり ie → 長い /iː/", "detail": "「イー」。Lieblingsfach、Tiere、spazieren、die。", "examples": ["Tiere", "die"] },
    { "id": "final-vowel-schwa", "label": "語末 -e/-a はあいまい母音 /ə/", "detail": "軽く曖昧に。Name、Schule、gerne、Anna、Klara、Tiere。", "examples": ["Name", "Anna"] },
    { "id": "final-er-vocalized", "label": "語末 -er は母音化 /ɐ/", "detail": "「アー」に近く、巻かない。Bruder=「ブルーダ」、Schwester、Vater、Mutter。", "examples": ["Bruder", "Vater"] },
    { "id": "final-en-reduced", "label": "語末 -en は弱く飲み込む", "detail": "速いほど曖昧。wohnen、haben、Katzen、Goldfischen、essen、gehen。", "examples": ["wohnen", "Katzen"] },
    { "id": "ich-laut", "label": "ch(e/i/ä/ö/ü・子音後) = /ç/", "detail": "前舌のやわらか摩擦。ich、nicht、München、Chemie、Teich。", "examples": ["ich", "München", "Chemie"] },
    { "id": "ach-laut", "label": "ch(a/o/u/au後) = /x/", "detail": "のどの奥で息を擦る。Nach、achtzehn、kochen、Fach。", "examples": ["Nach", "achtzehn"] },
    { "id": "oe-umlaut", "label": "ö = 唇を縦に丸め舌を前へ", "detail": "鏡で口の形を確認。Österreich。", "examples": ["Österreich"] },
    { "id": "ue-umlaut", "label": "ü = 唇を鋭くすぼめ舌を前へ", "detail": "ö より狭い。fünfzehn、München、für。", "examples": ["fünfzehn", "München"] },
    { "id": "z-as-ts", "label": "z = /ts/、zw は母音を挟まない", "detail": "zwei=「ツヴァイ」、Katzen(tz)、zehn。", "examples": ["zwei"] },
    { "id": "sp-st-shp", "label": "語頭 sp/st = /ʃp, ʃt/", "detail": "「シュプ/シュト」。spazieren=「シュパツィーレン」。", "examples": ["spazieren"] },
    { "id": "ph-as-f", "label": "Ph = /f/", "detail": "Physik=「フュズィーク」。", "examples": ["Physik"] },
    { "id": "german-l", "label": "L は舌先を上前歯裏に強く", "detail": "英語の軽い L と別物。Eltern、Schule、Klara、alt。", "examples": ["Eltern", "alt"] },
    { "id": "german-r", "label": "R はのど奥の摩擦（口蓋垂）", "detail": "やわらかく。Reich、gerne、Park、arbeitet。", "examples": ["gerne", "Park"] },
    { "id": "accent-first", "label": "アクセントは原則第1音節", "detail": "arbeitet=「アルバイテット」（第1音節）、Vorstellung、Anna。", "examples": ["arbeitet"] },
    { "id": "compound-pause", "label": "複合語は境目で軽く区切る", "detail": "Österreich(Öster+reich)、Deutschland、Lieblingsfach。", "examples": ["Österreich", "Lieblingsfach"] },
    { "id": "final-m-close-lips", "label": "m は唇を閉じる / n は閉じない", "detail": "im と in を区別。meinen。", "examples": ["im", "meinen"] },
    { "id": "liaison-rhythm", "label": "短語の連続は全体のリズムで繋ぐ", "detail": "1語ずつ強く言わない。mag ich nicht so gern。", "examples": ["mag", "nicht"] },
    { "id": "rhythm-keep-pitch", "label": "途中はピッチを保つ/上げる", "detail": "文の途中で下げると終わった感じに。文末はきちんと閉じる。", "examples": [] },
    { "id": "sense-group-breath", "label": "意味のまとまりで息継ぎ", "detail": "seit drei Jahren / in Deutschland のように区切る。", "examples": ["seit"] }
  ],
  "paragraphs": [
    {
      "id": "p1",
      "sentences": [
        {
          "id": "p1-s1",
          "de": "Mein Name ist Anna.",
          "ja": "私の名前はアンナです。",
          "audio": "audio/p1-s1.mp3",
          "timing": [],
          "tokens": [
            { "t": "Mein", "r": ["ei-as-ai"] },
            { "t": "Name", "r": ["final-vowel-schwa"] },
            { "t": "ist", "r": [] },
            { "t": "Anna.", "word": "Anna", "r": ["accent-first", "final-vowel-schwa"] }
          ]
        },
        {
          "id": "p1-s2",
          "de": "Ich komme aus Österreich und lebe seit drei Jahren in Deutschland.",
          "ja": "私はオーストリア出身で、3年前からドイツに住んでいます。",
          "audio": "audio/p1-s2.mp3",
          "timing": [],
          "tokens": [
            { "t": "Ich", "r": ["ich-laut"] },
            { "t": "komme", "r": ["final-vowel-schwa"] },
            { "t": "aus", "r": ["au-diphthong"] },
            { "t": "Österreich", "r": ["oe-umlaut", "compound-pause", "ei-as-ai", "german-r"] },
            { "t": "und", "r": ["final-d-devoiced"] },
            { "t": "lebe", "r": ["final-vowel-schwa"] },
            { "t": "seit", "r": ["s-as-z", "ei-as-ai", "sense-group-breath"] },
            { "t": "drei", "r": ["ei-as-ai", "german-r"] },
            { "t": "Jahren", "r": ["final-en-reduced"] },
            { "t": "in", "r": [] },
            { "t": "Deutschland.", "word": "Deutschland", "r": ["eu-as-oy", "final-d-devoiced", "compound-pause"] }
          ]
        },
        {
          "id": "p1-s3",
          "de": "Ich bin fünfzehn Jahre alt und habe zwei Geschwister.",
          "ja": "私は15歳で、きょうだいが2人います。",
          "audio": "audio/p1-s3.mp3",
          "timing": [],
          "tokens": [
            { "t": "Ich", "r": ["ich-laut"] },
            { "t": "bin", "r": [] },
            { "t": "fünfzehn", "r": ["ue-umlaut"] },
            { "t": "Jahre", "r": ["final-vowel-schwa"] },
            { "t": "alt", "r": ["german-l", "final-d-devoiced"] },
            { "t": "und", "r": ["final-d-devoiced"] },
            { "t": "habe", "r": ["final-vowel-schwa"] },
            { "t": "zwei", "r": ["z-as-ts", "ei-as-ai"] },
            { "t": "Geschwister.", "word": "Geschwister", "r": ["w-as-v", "final-er-vocalized"] }
          ]
        },
        {
          "id": "p1-s4",
          "de": "Meine Schwester heißt Klara und ist dreizehn Jahre alt.",
          "ja": "妹はクララといって、13歳です。",
          "audio": "audio/p1-s4.mp3",
          "timing": [],
          "tokens": [
            { "t": "Meine", "r": ["ei-as-ai", "final-vowel-schwa"] },
            { "t": "Schwester", "r": ["w-as-v", "final-er-vocalized"] },
            { "t": "heißt", "r": ["ei-as-ai", "ss-sharp-s"] },
            { "t": "Klara", "r": ["german-l", "german-r", "final-vowel-schwa"] },
            { "t": "und", "r": ["final-d-devoiced"] },
            { "t": "ist", "r": [] },
            { "t": "dreizehn", "r": ["ei-as-ai", "german-r"] },
            { "t": "Jahre", "r": ["final-vowel-schwa"] },
            { "t": "alt.", "word": "alt", "r": ["german-l", "final-d-devoiced"] }
          ]
        },
        {
          "id": "p1-s5",
          "de": "Mein Bruder Michael ist achtzehn Jahre alt.",
          "ja": "兄はミヒャエルで、18歳です。",
          "audio": "audio/p1-s5.mp3",
          "timing": [],
          "tokens": [
            { "t": "Mein", "r": ["ei-as-ai"] },
            { "t": "Bruder", "r": ["german-r", "final-er-vocalized"] },
            { "t": "Michael", "r": ["ich-laut"] },
            { "t": "ist", "r": [] },
            { "t": "achtzehn", "r": ["ach-laut"] },
            { "t": "Jahre", "r": ["final-vowel-schwa"] },
            { "t": "alt.", "word": "alt", "r": ["german-l", "final-d-devoiced"] }
          ]
        },
        {
          "id": "p1-s6",
          "de": "Wir wohnen mit unseren Eltern in einem Haus in München.",
          "ja": "私たちは両親と一軒の家にミュンヘンで住んでいます。",
          "audio": "audio/p1-s6.mp3",
          "timing": [],
          "tokens": [
            { "t": "Wir", "r": ["w-as-v", "german-r"] },
            { "t": "wohnen", "r": ["w-as-v", "final-en-reduced"] },
            { "t": "mit", "r": [] },
            { "t": "unseren", "r": ["s-as-z", "final-en-reduced"] },
            { "t": "Eltern", "r": ["german-l", "final-er-vocalized"] },
            { "t": "in", "r": [] },
            { "t": "einem", "r": ["ei-as-ai", "final-m-close-lips"] },
            { "t": "Haus", "r": ["au-diphthong"] },
            { "t": "in", "r": [] },
            { "t": "München.", "word": "München", "r": ["ue-umlaut", "ich-laut"] }
          ]
        },
        {
          "id": "p1-s7",
          "de": "Mein Vater arbeitet in einer Bank.",
          "ja": "父は銀行で働いています。",
          "audio": "audio/p1-s7.mp3",
          "timing": [],
          "tokens": [
            { "t": "Mein", "r": ["ei-as-ai"] },
            { "t": "Vater", "r": ["v-as-f", "final-er-vocalized"] },
            { "t": "arbeitet", "r": ["accent-first", "german-r", "ei-as-ai"] },
            { "t": "in", "r": [] },
            { "t": "einer", "r": ["ei-as-ai", "final-er-vocalized"] },
            { "t": "Bank.", "word": "Bank", "r": [] }
          ]
        }
      ]
    },
    {
      "id": "p2",
      "sentences": [
        {
          "id": "p2-s1",
          "de": "Ich gehe gerne in die Schule und mag Tiere.",
          "ja": "私は学校に行くのが好きで、動物が好きです。",
          "audio": "audio/p2-s1.mp3",
          "timing": [],
          "tokens": [
            { "t": "Ich", "r": ["ich-laut"] },
            { "t": "gehe", "r": ["final-vowel-schwa"] },
            { "t": "gerne", "r": ["german-r", "final-vowel-schwa"] },
            { "t": "in", "r": [] },
            { "t": "die", "r": ["ie-long-i"] },
            { "t": "Schule", "r": ["german-l", "final-vowel-schwa"] },
            { "t": "und", "r": ["final-d-devoiced"] },
            { "t": "mag", "r": ["final-g-devoiced"] },
            { "t": "Tiere.", "word": "Tiere", "r": ["ie-long-i", "final-vowel-schwa"] }
          ]
        },
        {
          "id": "p2-s2",
          "de": "Mein Lieblingsfach ist Mathematik.",
          "ja": "私の好きな教科は数学です。",
          "audio": "audio/p2-s2.mp3",
          "timing": [],
          "tokens": [
            { "t": "Mein", "r": ["ei-as-ai"] },
            { "t": "Lieblingsfach", "r": ["ie-long-i", "compound-pause", "ach-laut", "accent-first"] },
            { "t": "ist", "r": [] },
            { "t": "Mathematik.", "word": "Mathematik", "r": [] }
          ]
        },
        {
          "id": "p2-s3",
          "de": "Physik und Chemie mag ich nicht so gern.",
          "ja": "物理と化学はあまり好きではありません。",
          "audio": "audio/p2-s3.mp3",
          "timing": [],
          "tokens": [
            { "t": "Physik", "r": ["ph-as-f"] },
            { "t": "und", "r": ["final-d-devoiced"] },
            { "t": "Chemie", "r": ["ich-laut", "ie-long-i"] },
            { "t": "mag", "r": ["final-g-devoiced", "liaison-rhythm"] },
            { "t": "ich", "r": ["ich-laut", "liaison-rhythm"] },
            { "t": "nicht", "r": ["ich-laut", "liaison-rhythm"] },
            { "t": "so", "r": ["s-as-z", "liaison-rhythm"] },
            { "t": "gern.", "word": "gern", "r": ["german-r"] }
          ]
        },
        {
          "id": "p2-s4",
          "de": "Wir haben einen Hund, zwei Katzen und im Garten einen Teich mit Goldfischen.",
          "ja": "犬が1匹、猫が2匹いて、庭には金魚のいる池があります。",
          "audio": "audio/p2-s4.mp3",
          "timing": [],
          "tokens": [
            { "t": "Wir", "r": ["w-as-v", "german-r"] },
            { "t": "haben", "r": ["final-en-reduced"] },
            { "t": "einen", "r": ["ei-as-ai", "final-en-reduced"] },
            { "t": "Hund,", "word": "Hund", "r": ["final-d-devoiced"] },
            { "t": "zwei", "r": ["z-as-ts", "ei-as-ai"] },
            { "t": "Katzen", "r": ["z-as-ts", "final-en-reduced"] },
            { "t": "und", "r": ["final-d-devoiced"] },
            { "t": "im", "r": ["final-m-close-lips"] },
            { "t": "Garten", "r": ["german-r", "final-en-reduced"] },
            { "t": "einen", "r": ["ei-as-ai", "final-en-reduced"] },
            { "t": "Teich", "r": ["ei-as-ai", "ich-laut"] },
            { "t": "mit", "r": [] },
            { "t": "Goldfischen.", "word": "Goldfischen", "r": ["german-l", "ich-laut", "final-en-reduced"] }
          ]
        }
      ]
    },
    {
      "id": "p3",
      "sentences": [
        {
          "id": "p3-s1",
          "de": "Nach der Schule gehe ich oft mit meinen Freundinnen im Park spazieren.",
          "ja": "放課後はよく友だちと公園を散歩します。",
          "audio": "audio/p3-s1.mp3",
          "timing": [],
          "tokens": [
            { "t": "Nach", "r": ["ach-laut"] },
            { "t": "der", "r": ["final-er-vocalized"] },
            { "t": "Schule", "r": ["german-l", "final-vowel-schwa"] },
            { "t": "gehe", "r": ["final-vowel-schwa"] },
            { "t": "ich", "r": ["ich-laut"] },
            { "t": "oft", "r": [] },
            { "t": "mit", "r": [] },
            { "t": "meinen", "r": ["ei-as-ai", "final-m-close-lips", "final-en-reduced"] },
            { "t": "Freundinnen", "r": ["german-r", "eu-as-oy", "final-en-reduced"] },
            { "t": "im", "r": ["final-m-close-lips"] },
            { "t": "Park", "r": ["german-r"] },
            { "t": "spazieren.", "word": "spazieren", "r": ["sp-st-shp", "ie-long-i", "final-en-reduced"] }
          ]
        },
        {
          "id": "p3-s2",
          "de": "Manchmal essen wir ein Eis.",
          "ja": "ときどきアイスを食べます。",
          "audio": "audio/p3-s2.mp3",
          "timing": [],
          "tokens": [
            { "t": "Manchmal", "r": ["ach-laut", "german-l"] },
            { "t": "essen", "r": ["final-en-reduced"] },
            { "t": "wir", "r": ["w-as-v", "german-r"] },
            { "t": "ein", "r": ["ei-as-ai"] },
            { "t": "Eis.", "word": "Eis", "r": ["ei-as-ai", "s-as-z"] }
          ]
        },
        {
          "id": "p3-s3",
          "de": "Am Samstag gehen wir oft ins Kino.",
          "ja": "土曜日はよく映画館に行きます。",
          "audio": "audio/p3-s3.mp3",
          "timing": [],
          "tokens": [
            { "t": "Am", "r": ["final-m-close-lips"] },
            { "t": "Samstag", "r": ["final-g-devoiced", "compound-pause"] },
            { "t": "gehen", "r": ["final-en-reduced"] },
            { "t": "wir", "r": ["w-as-v", "german-r"] },
            { "t": "oft", "r": [] },
            { "t": "ins", "r": [] },
            { "t": "Kino.", "word": "Kino", "r": [] }
          ]
        }
      ]
    }
  ]
}
````

---

## Appendix C: `README.md`

````markdown
# Deutsch Aussprache（発音練習）

Anna の自己紹介を、全文 / 文単位 / 単語単位で聞き分けながら音読練習するローカルアプリ。
素の HTML / CSS / JS（ES Modules）。**ビルド不要・オフライン動作**。`vocabulary/` と同設計。

## 起動

```
cd pronunciation
python3 -m http.server 8000
```
→ ブラウザで **http://localhost:8000/**（停止: Ctrl+C）。`file://` 直開きは不可。

## 使い方
- **全文を再生**: 文が順に流れ、いまの文と単語が青く光る（自動スクロール）。
- **文の ▶**: その文だけカラオケ再生。
- **単語クリック**: 単体音声 + 「発音のポイント」を表示（点線下線の語に解説あり）。
- **速度 0.75x**: ゆっくり再生（設定は localStorage 保存）。
- **発音のポイント**: 解説に基づくルール一覧。

## 構成
```
index.html / css/styles.css / js/*.js
data/text.json            本文・発音ルール・単語タイミング
data/audio/*.mp3          文ごと音声（カラオケ用）
data/audio/words/*.mp3    単語ごと音声（単体再生用）
tools/tts_generate.py     edge-tts 生成
tools/validate_data.mjs   データ整合チェック
tests/                    純粋ロジック/データの単体テスト
```

## テスト / 検証
```
node --test            # util + data
node tools/validate_data.mjs
```

## 音声の再生成（任意・要ネットワーク）
```
python3 -m venv tools/.venv && tools/.venv/bin/pip install edge-tts
tools/.venv/bin/python tools/tts_generate.py
```
````

---

## 受け入れ条件（Definition of Done）

- [ ] `node --test` 全 PASS、`node tools/validate_data.mjs` が `text.json OK`。
- [ ] 14 文の文 MP3 と、全一意語の単語 MP3 が生成済み。各文 `timing` が `tokens` と件数一致。
- [ ] 全文再生で文と単語のハイライトが同期し、自動で文が進む / 停止できる。
- [ ] 文の ▶ でその文のみカラオケ。単語クリックで単体音声 + ポイント表示。
- [ ] 速度トグルが効き、再読込後も保持。
- [ ] 発音のポイント一覧に 28 ルールが表示。
- [ ] スマホ幅でレイアウト崩れ無し（横スクロール無し）。
````
