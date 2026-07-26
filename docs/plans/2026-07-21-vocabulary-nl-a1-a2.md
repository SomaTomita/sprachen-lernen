# オランダ語 単語アプリ（A1 / A2・例文つき）実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 既存のドイツ語単語アプリ `apps/vocabulary/` を複製し、**オランダ語 A1 / A2** を学習できる独立オフラインアプリ `apps/vocabulary-nl/` を作る。ドイツ語版と**完全同等の UX**（フラッシュカード＋見出し語音声＋例文のネイティブ音声＋単語カラオケ＋「読むだけ」＋進捗）。例文は**スパイラルラーニング**を厳守する（A1 例文は A1 語彙のみ、A2 例文は A1＋A2 語彙のみ）。

**Architecture:** ドイツ語アプリを丸ごとコピーし、(1) 言語（データ・音声・UI 文言）をオランダ語化、(2) データモデルを蘭語仕様（冠詞 `de`/`het`、蘭語スラッグ、例文フィールド `de`→`nl`）に変更、(3) 例文生成に**レベル天井＋語彙スパイラルの二段検証**を組み込む。SRS（Leitner）・セッション・進捗・統計のコアロジック（`srs.js` / `session.js` / `stats.js` / `dashboard.js`）は**無変更**で流用。`apps/vocabulary/`（独語）には一切触れない。

**Tech Stack:** 素の HTML / CSS / JS（ES Modules）・ビルド無し・フレームワーク無し・localStorage・**外部CDN/Webフォント禁止**・オフライン動作。音声は edge-tts（Python venv）で事前生成。**例文の語彙スパイラル検証のみ** spaCy `nl_core_news_sm`（Python venv・検証時のみ／アプリには同梱しない）。テストは `node --test`。デザインは BMW corporate-automotive（正本 `docs/design/bmw-corporate-automotive.md`）。

---

## 確定済みの意思決定（実装者は前提として扱うこと）

1. **構成 = 独立アプリの複製。** 新規 `apps/vocabulary-nl/`。`apps/vocabulary/`（独語）は**変更禁止**。
2. **範囲 = 独語版と完全同等。** 例文（各語 2〜3 文・nl/ja/en）＋例文のネイティブ音声＋単語カラオケ（timing）＋「読むだけ」モード＋見出し語音声。
3. **スパイラルラーニング（本計画の中核・必須）:**
   - **A1 の例文は A1 語彙だけ**で作る。
   - **A2 の例文は A1＋A2 語彙**で作る（累積）。
   - これを LLM 判定だけに委ねず、**決定的な語彙メンバーシップ検証**（形態素解析→見出し語照合）で機械的にゲートする。
4. **語彙 = 公式系ソースから収集（web-research）。** ユーザー提供リストではなく CEFR / inburgering 整合の実務標準リストから収集して整形。
5. **文法天井 = Taalprofielen（Nederlandse Taalunie）準拠。** 独語版が Goethe Prüfungsziele に依拠するのと同様に、蘭語 A1/A2 の文法境界は Taalprofielen を典拠にする。
6. **音声 = オランダ語 TTS。** edge-tts `nl-NL-ColetteNeural`（女性。独語版 Katja に対応。男性版 `nl-NL-MaartenNeural`）で見出し語・例文を生成。
7. **localStorage キー = 別名前空間** `nederlands-vocab-v1`（独語の `deutsch-vocab-v1` と衝突させない）。

### 語彙ソース（公式系・A1/A2 向け）

| ソース | URL | 内容 | 用途 |
|---|---|---|---|
| numo.nl NT2 モジュール語彙 | `https://assets.numo.nl/wp/Woordenlijst-nt2.pdf`（A0–A1）, `https://assets.numo.nl/wp/Woordenlijst-nt2-modules-A1-A2.pdf`（A1–A2） | アルファベット順 PDF | **一次候補**（レベル境界が明確） |
| NT2 TaalMenu（アルファベット順） | `https://nt2taalmenu.nl/nt2/lijsten/engels_al.pdf` | A1 2100語・英訳つき | 英語グロス（en）取得・補完 |
| **NT2 TaalMenu（頻度順）** | `https://nt2taalmenu.nl/nt2/lijsten/engels_fre.pdf` | A1 2100語を**頻度帯順**・英訳＋名詞の de/het 付き | **コア語の補完（下記の重要な発見）** |
| Open KNM | `https://open-knm.org/en/vocabulary` | A2（inburgering）1300+語、音声・例文つき | A2 の裏取り |
| Taalprofielen（Taalunie） | `https://taalunie.org/` / `https://www.erk.nl/` | CEFR 別 文法・機能・語彙記述（蘭語） | **文法天井の典拠** |

> **注意:** オランダ語には Goethe 相当の単一「公式 A1/A2 語彙リスト」は存在しない。上記は CEFR/inburgering 整合の実務標準。目標規模: **A1 ≈ 800〜1000語 / A2 ≈ 600〜900語（A2 新規のみ／A1 と互いに素）**。独語実績値 A1=786 / A2=584 を目安に、ソースの実データで増減可。

> **重要な発見（実装中に判明・2026-07）:** numo の A0–A1 リストは**主題別（食べ物・体・衣類など具体名詞中心）**で、**高頻度のコア語が欠落**している。NT2 頻度リストと突き合わせると**上位100語のうち55語、上位200語のうち124語が numo に無い**（`niet / en / goed / doen / komen / maken / nemen / zeggen / veel / wat / kind / man / vrouw / tijd / werk / land` 等）。
> → **対策:** numo（766語）＋ **頻度リスト上位200帯の欠落124語** を統合し **A1 = 890語** とする。頻度リストの 200位以降の欠落語は A2 の候補プールとして使う。
> → **教訓:** 単一ソースに頼らず、必ず頻度リストと突き合わせて coverage を検証する。コア語が欠けると例文が不自然になる（実際にパイロット後の例文生成で `maken/doen/komen/kind` 等を回避せざるを得ず不自然化した）。

### オランダ語データモデル（`data/<level>/words.json` の1件）

```json
{
  "id": "a1-huis",
  "lemma": "huis",
  "pos": "noun",
  "article": "het",
  "plural": "huizen",
  "level": "A1",
  "lemmaAudio": "audio/lemma/a1-huis.mp3",
  "meanings": [{ "ja": "家", "en": "house" }],
  "examples": [
    {
      "nl": "Het huis is groot.",
      "ja": "その家は大きい。",
      "en": "The house is big.",
      "audio": "audio/a1-huis-1.mp3",
      "timing": [{ "w": "Het", "s": 0.0, "e": 0.30 }]
    }
  ]
}
```

- **独語版との構造差は 1 点のみ:** 例文の文フィールドが `de` ではなく **`nl`**。
- `id` = `a1-`/`a2-` ＋ `slug(lemma)`（下記規則）。
- 名詞は `article`（**`de` か `het`**）必須。名詞以外は `article` を持たない。
- `plural` は任意（名詞で該当があれば）。`meanings` は最低1件、各 `ja`/`en` 必須。
- 例文数: 各語 **2 文**。`meanings.length >= 2` の語は **3 文以上で各語義を最低 1 文カバー**（`validate_data.mjs` のしきい値と一致）。
- `audio` / `timing` は音声生成タスクで付与。

### スラッグ規則（オランダ語 ID 用）

独語の `ä→ae` 展開は**使わない**。蘭語はダイアクリティカルを素の文字に落とす:

1. Unicode NFD 正規化 → 結合記号を除去（`café→cafe` / `één→een` / `coördinatie→coordinatie`）。
2. 小文字化。
3. `a-z0-9` 以外は `-` に置換、連続 `-` を畳み、端の `-` を除去。
4. 先頭に `a1-`/`a2-` を付与。

例: `"'s morgens"` → `a1-s-morgens` / `"café"` → `a1-cafe`。

---

## 進め方（実装者向け）

- **ブランチ:** `feat/vocabulary-nl`。こまめにコミット。
- **テスト実行場所:** `apps/vocabulary-nl/` 直下で `node --test`。
- **起動確認:** リポジトリ直下で `./serve.sh` → `http://localhost:8000/apps/vocabulary-nl/`。**`file://` 不可**。
- **不変更ファイル（コピーしたまま触らない）:** `js/srs.js` / `js/session.js` / `js/stats.js` / `js/dashboard.js` / `js/data.js` / `js/flashcard.js`※ / `css/styles.css` / `tests/*.test.js`。
  - ※ `flashcard.js` は例文表示を `renderSentence` に委譲しているため、フィールド `nl` 化の影響を受けない（無変更で動く）。
- 各タスクは 2〜5分。純関数・検証系（slug / build / validator / vocab-check）は**失敗するテストを先に**。

---

## Phase 0 — ブランチ

### Task 0: ブランチ作成

```bash
cd /Users/soma/Documents/GitHub/study-deutsch
git checkout -b feat/vocabulary-nl
```
Expected: `Switched to a new branch 'feat/vocabulary-nl'`

---

## Phase 1 — 複製と蘭語化（例文機能は保持）

### Task 1: ドイツ語アプリを複製

**Step 1: コピー（生成物は除外）**

```bash
cd /Users/soma/Documents/GitHub/study-deutsch
rsync -a --exclude 'data/*/audio' --exclude 'tools/.venv' --exclude 'node_modules' \
  apps/vocabulary/ apps/vocabulary-nl/
```

**Step 2: 独語の単語データ・シードだけ削除（例文パイプラインのコードは保持）**

```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-nl
rm -f data/A1/words.json data/A2/words.json
rm -rf data/A1/audio data/A2/audio
rm -f tools/a1_seed.json tools/a2_seed.json          # 独語シード（蘭語で作り直す）
rm -rf docs/plans                                    # 独語の計画ログは引き継がない
mkdir -p data/A1/audio/lemma data/A2/audio/lemma docs/plans tools/raw
```

> **保持するもの（削除しない）:** `js/reader.js` / `tools/tts_generate.py` / `tools/tts_lemma.py` / `tools/sentence_pipeline.md`（この後、蘭語版に書き換える）/ `tools/validate_data.mjs` / `tools/split_batches.cjs` / `tools/merge_parts.cjs` などバッチ運用スクリプト。

**Step 3: Commit**

```bash
git add -A apps/vocabulary-nl
git commit -m "chore: scaffold apps/vocabulary-nl from vocabulary (keep example pipeline)"
```

---

### Task 2: 例文フィールド `de` → `nl` の改名（コード側）

**Files:** `apps/vocabulary-nl/js/audio.js`, `apps/vocabulary-nl/js/reader.js`

**Step 1: 影響箇所を確認**

```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-nl
grep -rn "example\.de\|e\.de\b" js/
```
Expected: `js/audio.js`（2件: renderSentence の分割・speakFallback）、`js/reader.js`（2件: aria-label・検索）。

**Step 2: `audio.js` を蘭語フィールドに**

```diff
- : example.de.split(/\s+/);
+ : example.nl.split(/\s+/);
```
```diff
- return speakFallback(example.de);
+ return speakFallback(example.nl);
```
`speakFallback` 内のフォールバック言語:
```diff
- u.lang = 'de-DE';
+ u.lang = 'nl-NL';
```

**Step 3: `reader.js` を蘭語フィールド＋文言に**

```diff
- btn.setAttribute('aria-label', `例文を再生: ${e.de}`);
+ btn.setAttribute('aria-label', `例文を再生: ${e.nl}`);
```
```diff
- return w.examples.some(e => e.de.toLowerCase().includes(q)
+ return w.examples.some(e => e.nl.toLowerCase().includes(q)
```
検索ラベル・プレースホルダの「独語」表記を「蘭語」に（`visually-hidden` ラベルと `placeholder`）。

**Step 4: 参照切れ確認**

```bash
node --check js/audio.js && node --check js/reader.js
grep -rn "\.de\b" js/audio.js js/reader.js   # 文フィールドとしての .de がヒット0件（CSS class 'de' は別で可）
```

**Step 5: Commit**

```bash
git add js/audio.js js/reader.js
git commit -m "refactor(nl): example sentence field de→nl (nl-NL fallback)"
```

---

### Task 3: ブランディングと localStorage キー

**Files:** `js/storage.js`（キーのみ）, `js/main.js`（ワードマーク・ホームカード文言）, `index.html`, `package.json`, `README.md`, `CLAUDE.md`

**Step 1: localStorage キー分離**

```bash
grep -n "deutsch-vocab-v1" js/storage.js
```
→ `nederlands-vocab-v1` に変更。

**Step 2: `main.js` ワードマーク**

```js
if (wordmark) wordmark.textContent = `NEDERLANDS ${level}`;
if (footerWordmark) footerWordmark.textContent = `NEDERLANDS ${level}`;
document.title = `Nederlands ${level} 単語`;
```
`renderHome()` の「読むだけ」カード tagline 内 `全 ${words.length} 語を検索。意味・例文・音声を確認。` は蘭語アプリでもそのまま可（文言変更不要）。

**Step 3: `index.html`** — `<title>`=`Nederlands A1 単語`、`#wordmark`/`#footerWordmark`=`NEDERLANDS A1`、`href="../../"` は据置。

**Step 4: `package.json`** — `name`=`vocabulary-nl`、説明を蘭語アプリに。

**Step 5: `README.md` / `CLAUDE.md`** — 独語版をベースに、言語（蘭語）・音声（`nl-NL-ColetteNeural`）・スラッグ規則・例文フィールド `nl`・localStorage キー・スパイラル検証（spaCy）を反映。独語固有記述（`der/die/das`・`ä→ae`）を蘭語仕様に置換。

**Step 6: Commit**

```bash
git add js/storage.js js/main.js index.html package.json README.md CLAUDE.md
git commit -m "chore(nl): rebrand to Nederlands, isolate localStorage key"
```

---

### Task 4: `validate_data.mjs` を蘭語スキーマ用に

**Files:** `apps/vocabulary-nl/tools/validate_data.mjs`

**Step 1: 置き換え**

```js
// tools/validate_data.mjs — オランダ語スキーマ検証（例文フィールドは nl、冠詞は de/het）
import { readFileSync } from 'node:fs';

const level = process.argv[2] || 'A1';
const data = JSON.parse(readFileSync(`data/${level}/words.json`, 'utf-8'));

let errors = 0;
const fail = (id, msg) => { console.error(`✗ ${id}: ${msg}`); errors++; };
const seen = new Set();

for (const w of data) {
  if (!w.id || !w.lemma || !w.pos || !w.level) fail(w.id || '?', 'missing core field');
  if (w.level !== level) fail(w.id, `level mismatch (expected ${level})`);
  if (seen.has(w.id)) fail(w.id, 'duplicate id');
  seen.add(w.id);
  if (w.pos === 'noun') {
    if (!w.article) fail(w.id, 'noun missing article');
    else if (w.article !== 'de' && w.article !== 'het') fail(w.id, `article must be de|het (got ${w.article})`);
  }
  if (w.article && w.pos !== 'noun') fail(w.id, 'article on non-noun');
  if (!Array.isArray(w.meanings) || !w.meanings.length) fail(w.id, 'no meanings');
  for (const m of w.meanings || []) if (!m.ja || !m.en) fail(w.id, 'meaning missing ja/en');
  const need = (w.meanings && w.meanings.length >= 2) ? 3 : 2;
  if (!Array.isArray(w.examples) || w.examples.length < need) fail(w.id, `need >=${need} examples`);
  for (const e of w.examples || []) {
    if (!e.nl || !e.ja || !e.en) fail(w.id, 'example missing text (nl/ja/en)');
    // audio/timing は音声生成後に必須化。生成前フェーズでは第2引数 --no-audio で緩める。
    if (!process.argv.includes('--no-audio')) {
      if (!e.audio) fail(w.id, 'example missing audio');
      if (!Array.isArray(e.timing) || !e.timing.length) fail(w.id, 'example missing timing');
    }
  }
}
console.log(errors ? `\n${errors} errors` : `✓ ${data.length} words valid`);
process.exit(errors ? 1 : 0);
```

**Step 2: 構文確認**

```bash
node --check tools/validate_data.mjs
```

**Step 3: Commit**

```bash
git add tools/validate_data.mjs
git commit -m "feat(nl): validator for Dutch schema (nl field, de/het, --no-audio gate)"
```

---

## Phase 2 — 語彙リスト収集と seed 生成（TDD）

### Task 5: スラッグ関数（TDD）

**Files:** `tools/slug.mjs`, `tests/slug.test.js`

**Step 1: 失敗するテスト**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { slugId } from '../tools/slug.mjs';

test('strips diacritics + lowercases', () => {
  assert.equal(slugId('café', 'A1'), 'a1-cafe');
  assert.equal(slugId('één', 'A1'), 'a1-een');
  assert.equal(slugId('coördinatie', 'A2'), 'a2-coordinatie');
});
test('spaces/apostrophes → single hyphen, trimmed', () => {
  assert.equal(slugId("'s morgens", 'A1'), 'a1-s-morgens');
  assert.equal(slugId('twee--eiig', 'A1'), 'a1-twee-eiig');
});
```

**Step 2:** `node --test tests/slug.test.js` → FAIL。

**Step 3: 実装 `tools/slug.mjs`**

```js
export function slug(lemma) {
  return lemma
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
export function slugId(lemma, level) {
  return `${level.toLowerCase()}-${slug(lemma)}`;
}
```

**Step 4:** `node --test tests/slug.test.js` → PASS。 **Step 5:** commit `feat(nl): Dutch slug + tests`。

---

### Task 6: seed 整形器（TDD）

素データは 1 行 1 語の JSONL（`{"lemma","pos","article","plural","ja","en"}`）。整形器は seed words.json（`meanings` まで、`examples` 無し）を作る。

**Files:** `tools/build_seed.mjs`, `tests/build_seed.test.js`

**Step 1: 失敗するテスト**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry, buildAll } from '../tools/build_seed.mjs';

test('maps row → seed entry (no examples yet)', () => {
  const e = buildEntry({ lemma:'huis', pos:'noun', article:'het', plural:'huizen', ja:'家', en:'house' }, 'A1');
  assert.deepEqual(e, {
    id:'a1-huis', lemma:'huis', pos:'noun', article:'het', plural:'huizen',
    level:'A1', lemmaAudio:'audio/lemma/a1-huis.mp3',
    meanings:[{ ja:'家', en:'house' }],
  });
  assert.equal('examples' in e, false);
});
test('omits article/plural when absent; dedupes by id (first wins)', () => {
  const rows = [
    { lemma:'lopen', pos:'verb', ja:'歩く', en:'to walk' },
    { lemma:'huis', pos:'noun', article:'het', ja:'家', en:'house' },
    { lemma:'huis', pos:'noun', article:'het', ja:'住宅', en:'house' },
  ];
  const out = buildAll(rows, 'A1');
  assert.equal(out.length, 2);
  assert.equal('article' in out[0], false);
  assert.equal(out[1].meanings[0].ja, '家');
});
```

**Step 2:** run → FAIL。

**Step 3: 実装 `tools/build_seed.mjs`**

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { slugId } from './slug.mjs';

export function buildEntry(row, level) {
  const id = slugId(row.lemma, level);
  const e = { id, lemma: row.lemma, pos: row.pos };
  if (row.pos === 'noun' && row.article) e.article = row.article;
  if (row.plural) e.plural = row.plural;
  e.level = level;
  e.lemmaAudio = `audio/lemma/${id}.mp3`;
  e.meanings = [{ ja: row.ja, en: row.en }];
  return e;
}
export function buildAll(rows, level) {
  const byId = new Map();
  for (const row of rows) {
    const e = buildEntry(row, level);
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  return [...byId.values()];
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , level, src] = process.argv;
  const rows = readFileSync(src, 'utf-8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const out = buildAll(rows, level);
  writeFileSync(`data/${level}/words.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${out.length} seed words → data/${level}/words.json`);
}
```

**Step 4:** run → PASS。 **Step 5:** commit `feat(nl): seed builder + tests`。

---

### Task 7: A1 語彙収集 → `tools/raw/a1.jsonl`

> **REQUIRED SKILL:** `web-research`（無料 WebSearch/WebFetch を先に、PDF/JS で失敗時のみ Firecrawl scrape）。

**Step 1:** numo A0–A1 PDF から見出し語抽出（不可なら NT2 TaalMenu の NL-EN）。目標 **A1 ≈ 800〜1000語**。打ち切る場合は基準と語数を `docs/plans/changes-log.md` に明記（暗黙の truncation 禁止）。
**Step 2:** 各語に `pos` / 名詞は `article`(de/het)+可能なら `plural` / `en`（ソース）/ `ja`（付与）。
**Step 3:** JSONL 書き出し。 **Step 4:** ソース URL・取得日・語数を changes-log に記録。
**Step 5:** commit `data(nl): collect A1 headwords (raw)`。

---

### Task 8: A2 語彙収集 → `tools/raw/a2.jsonl`

**Step 1:** numo A1–A2 PDF ＋ Open KNM。`raw/a1.jsonl` 既出 lemma を除外（**A2 新規のみ**）。目標 **≈ 600〜900語**。
**Step 2〜4:** Task 7 と同様（`level`=A2）。 **Step 5:** commit `data(nl): collect A2 headwords (raw, A2-new only)`。

---

### Task 9: seed words.json 生成・検証

**Step 1: 生成**

```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-nl
node tools/build_seed.mjs A1 tools/raw/a1.jsonl
node tools/build_seed.mjs A2 tools/raw/a2.jsonl
```

**Step 2: 互いに素チェック**

```bash
node -e "const a=require('./data/A1/words.json').map(w=>w.lemma);const b=new Set(require('./data/A2/words.json').map(w=>w.lemma));const d=a.filter(l=>b.has(l));console.log('overlap:',d.length,d.slice(0,10))"
```
Expected: `overlap: 0 []`。0 でなければ A2 側から除去。

**Step 3: Commit** `data(nl): build A1/A2 seed words.json`。

---

## Phase 3 — スパイラル検証基盤（本計画の中核）

### Task 10: 蘭語 文法天井ドキュメント `tools/sentence_pipeline.md`

**Files:** `apps/vocabulary-nl/tools/sentence_pipeline.md`（独語版を土台に全面書き換え）

> **REQUIRED SKILL:** `web-research` で Taalprofielen（Taalunie / erk.nl）の A1・A2 記述を確認し、下記ドラフトの文法境界を裏取り・補正すること。

独語版と同じ構成（生成プロンプト雛形・検証プロンプト雛形・自己チェック・バッチ運用）で、天井を蘭語文法に置換する。**ドラフト（要 Taalprofielen 裏取り）:**

**共通・スパイラル語彙（最重要）**
- **A1 例文で使ってよい語 = A1 見出し語の実現形 ＋ 機能語allowlist（`tools/function_words_nl.txt`）＋ 固有名詞・数詞のみ。**
- **A2 例文で使ってよい語 = (A1 ∪ A2) 見出し語の実現形 ＋ 機能語allowlist ＋ 固有名詞・数詞。**
- 見出し語の「実現形」= 活用・複数・指小形・分離動詞の分離形を含む（`lopen`→loop/loopt/liep/gelopen、`huis`→huizen、分離 `opstaan`→sta … op）。
- 生成プロンプトにこの語彙制約を焼き込み、**Task 12 の決定的検証でゲート**する。

**A1 の天井（蘭語）**
1. 時制: 現在形（tegenwoordige tijd）中心。過去は `zijn`(was/waren)・`hebben`(had/hadden) と、ごく一般的動詞の **Perfectum**（heb/ben + voltooid deelwoord）を控えめに。一般動詞の imperfectum（liep, maakte…）叙述は禁止。未来 `zullen`・条件法禁止（近接未来 `gaan`+inf は可）。
2. 語順: 主文 V2 と倒置。分離動詞は主文で分離（`Ik sta om zeven uur op.`）。
3. 従属節: 原則なし。等位接続 `en/of/maar/want/dus` まで。`omdat/dat/als/toen` の従属節（動詞後置）は禁止。関係節（die/dat）禁止。
4. 形容詞: 述語（`Het huis is groot.`）＋**基本的な付加語 -e 変化**（`de grote auto` / `het grote huis` / `een grote auto`）は蘭語 A1 の基礎として許可。**比較級・最上級は禁止**（groter / grootst / beter / meer … 不可）。
5. 否定: `niet` / `geen`。 6. 指小形 `-je` は一般的なもの可。
7. 長さ 3〜8 語。対象見出し語を必ず含む（分離形・活用形可）。ja/en 訳は自然に。

**A2 の天井（蘭語・A1 に追加解禁）**
1. 時制: 全動詞の Perfectum 可。一般動詞・話法助動詞の imperfectum を限定的に（kon/moest/wilde/zou/ging/kwam/zei など基本語）。条件 `zou + inf` の基本形可。
2. 従属節解禁: `omdat / dat / als / want / toen`（動詞後置を正しく）＋ 間接疑問（`Ik weet niet waar hij woont.`）。
3. 比較級・最上級解禁（`groter / grootst / beter / meer … dan / net zo … als`）。
4. 再帰動詞解禁（`zich vergissen / zich voelen`）。
5. **禁止（B1 へ）:** 関係節（die/dat/wie/wat の関係代名詞）、受動態（`worden` + voltooid deelwoord）、`hoewel/zodat/terwijl` などの拡張従属接続詞。
6. 語彙: A1∪A2 累計（A2 文に A1 語も可）。長さは従属節1つ程度まで。

**出力スキーマ:** seed の `id/lemma/pos/article/plural/level/lemmaAudio/meanings` を保持し `examples`（`nl`/`ja`/`en`）を追加。`audio`/`timing` は音声タスクで付与。

**Step: Commit** `docs(nl): Dutch A1/A2 sentence ceiling + spiral vocab rule`。

---

### Task 11: 機能語 allowlist と語彙メンバーシップ検証（TDD の照合ロジック）

例文の**語彙スパイラルを機械的に保証**する。蘭語の活用・複数・分離を正しく見出し語化するため、形態素解析は **spaCy `nl_core_news_sm`（venv・検証時のみ／アプリ非同梱）** を使う。

**Files:**
- Create: `tools/function_words_nl.txt`（1 行 1 機能語）
- Create: `tools/check_vocab.py`（spaCy 検証本体）
- Create: `tools/allowlist_lemmas.mjs` ＋ `tests/allowlist.test.js`（許可集合の構築ロジックだけ純 JS で TDD）

**Step 1: 機能語 allowlist を作る**

`tools/function_words_nl.txt`（初期セット。運用で追補）:
```
de het een
ik jij je u hij zij ze wij we jullie men
mij me jou hem haar ons hen hun
deze dit die dat wie wat welk welke
niet geen wel ook nog al alleen heel erg zeer veel weinig meer minder
hier daar er nu dan toen straks vandaag morgen gisteren altijd nooit soms vaak
in op aan met van voor naar uit bij over onder tussen door tot om te af tegen na sinds tijdens zonder tegenover
en of maar want dus omdat dat als toen terwijl
ben bent is zijn was waren
heb hebt heeft hebben had hadden
word wordt worden werd werden
kan kunt kunnen kon konden mag mogen moet moeten wil willen zal zullen zou zouden ga gaat gaan
zeer graag samen even misschien echt gewoon
```
> `omdat/dat/als/toen/terwijl` と `word/worden` 等は A1 では文法天井（Task 10）側で禁止される。allowlist は「語彙集合」の担保のみを目的とし、**文法可否は Task 10 の LLM 検証が別途担う**（二段構え）。

**Step 2: 許可集合ビルダの失敗テスト（純 JS）**

`tests/allowlist.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedLemmas } from '../tools/allowlist_lemmas.mjs';

test('A1 allows only A1 headword lemmas + function words', () => {
  const a1 = [{ lemma: 'huis' }, { lemma: 'lopen' }];
  const fn = ['de', 'het'];
  const set = allowedLemmas('A1', { A1: a1, A2: [{ lemma: 'winkel' }] }, fn);
  assert.equal(set.has('huis'), true);
  assert.equal(set.has('de'), true);
  assert.equal(set.has('winkel'), false); // A2 語は A1 では不許可
});
test('A2 allows A1 ∪ A2 headword lemmas', () => {
  const set = allowedLemmas('A2', { A1: [{ lemma: 'huis' }], A2: [{ lemma: 'winkel' }] }, ['de']);
  assert.equal(set.has('huis'), true);   // 累積
  assert.equal(set.has('winkel'), true);
});
```

**Step 3:** run → FAIL。

**Step 4: 実装 `tools/allowlist_lemmas.mjs`**

```js
// 例文が使ってよい見出し語 lemma の集合（スパイラル）。
// A1 → A1 見出し語のみ。A2 → A1 ∪ A2 見出し語。機能語は常に許可。
export function allowedLemmas(level, byLevel, functionWords) {
  const set = new Set(functionWords.map(w => w.toLowerCase()));
  const levels = level === 'A2' ? ['A1', 'A2'] : ['A1'];
  for (const lv of levels)
    for (const w of (byLevel[lv] || [])) set.add(w.lemma.toLowerCase());
  return set;
}
```

**Step 5:** run → PASS。

**Step 6: spaCy 検証本体 `tools/check_vocab.py`**

```python
#!/usr/bin/env python3
"""例文の語彙スパイラルを機械検証する。
A1 例文は A1 見出し語のみ、A2 例文は A1∪A2 見出し語のみ（＋機能語 allowlist＋固有名詞/数詞）。
違反トークンを列挙して exit 1。実行: tools/.venv/bin/python tools/check_vocab.py A1
"""
import json, sys
from pathlib import Path
import spacy

FUNCTION_POS = {"ADP", "AUX", "CCONJ", "SCONJ", "DET", "PRON", "PART", "PUNCT",
                "NUM", "PROPN", "SYM", "X", "INTJ"}  # 語彙集合の対象外（機能語・固有名詞・数詞）

def load_lemmas(path: Path) -> set[str]:
    return {w["lemma"].lower() for w in json.loads(path.read_text(encoding="utf-8"))}

def main(level: str) -> int:
    base = Path("data")
    allowed = load_lemmas(base / "A1" / "words.json")
    if level == "A2":
        allowed |= load_lemmas(base / "A2" / "words.json")
    fn = {l.strip().lower() for l in Path("tools/function_words_nl.txt").read_text(encoding="utf-8").split() if l.strip()}
    allowed |= fn

    nlp = spacy.load("nl_core_news_sm")
    data = json.loads((base / level / "words.json").read_text(encoding="utf-8"))
    violations = []
    for w in data:
        # 見出し語自身とその実現形は当然許可（分離動詞の particle も許可）
        head = {w["lemma"].lower()}
        for e in w.get("examples", []):
            doc = nlp(e["nl"])
            for tok in doc:
                if tok.pos_ in FUNCTION_POS:
                    continue
                lem = tok.lemma_.lower()
                if lem in allowed or lem in head or tok.text.lower() in allowed:
                    continue
                violations.append(f'{w["id"]}: "{e["nl"]}" → 語彙外: {tok.text} (lemma={lem}, pos={tok.pos_})')

    for v in violations:
        print("✗ " + v)
    print(f"\n{len(violations)} vocab violations" if violations else f"✓ {level} examples within spiral vocabulary")
    return 1 if violations else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "A1"))
```

> **既知の限界（明記）:** 分離動詞の particle 再結合や派生語の lemma を spaCy が取り違える偽陽性がありうる。偽陽性は (a) `function_words_nl.txt` への追補、(b) 見出し語 seed への正当な派生語追加、(c) それでも残るものは changes-log に理由付きで記録、で運用する。**文法レベル（従属節・受動等）の可否は本ツールの対象外**で、Task 13 の LLM 検証が担う。

**Step 7:** allowlist テストを green に、`check_vocab.py` は `node --check` 相当（`python -c "import ast,sys;ast.parse(open('tools/check_vocab.py').read())"`）で構文確認。

**Step 8: Commit** `feat(nl): spiral vocabulary check (spaCy) + allowlist builder + tests`。

---

## Phase 4 — 例文生成と二段検証（バッチ運用）

> **REQUIRED SKILL:** 生成・検証は独語版 `sentence_pipeline.md` と同じく **バッチ（20〜50語）** で回し、各バッチ後にゲートを通す。生成側と検証側は**別プロンプト／別パス**。

### Task 12: 例文生成（レベル別・スパイラル語彙を焼き込む）

**Step 1:** Task 10 の生成プロンプト雛形に、対象レベルの**天井＋スパイラル語彙制約**（A1→A1 語彙のみ／A2→A1∪A2 語彙のみ）を焼き込み、seed 各語へ `examples`（nl/ja/en、規定数）を付与。`audio`/`timing` はこの段階で付けない。
**Step 2: スキーマゲート**（音声前なので `--no-audio`）:
```bash
node tools/validate_data.mjs A1 --no-audio
node tools/validate_data.mjs A2 --no-audio
```
**Step 3: Commit（バッチごと）** `data(nl): generate A1 examples (batch N)` 等。

---

### Task 13: 文法レベル検証（LLM・別エージェント）

**Step 1:** Task 10 の検証プロンプト雛形で、各例文が対象レベルの**文法天井**（従属節・関係節・受動・時制・比較級など蘭語の境界）を超えていないか判定。`ok:false` は `fix` 案で差し替え → Task 12 に戻して再ゲート。
**Step 2:** バッチ後に再度 `validate_data.mjs --no-audio`。 **Step 3: Commit** `data(nl): grammar-verify A1/A2 examples`。

---

### Task 14: 語彙スパイラル検証（決定的・spaCy）

**Step 1: venv 準備**

```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-nl
python3 -m venv tools/.venv
tools/.venv/bin/pip install edge-tts spacy
tools/.venv/bin/python -m spacy download nl_core_news_sm
```

**Step 2: 検証実行**

```bash
tools/.venv/bin/python tools/check_vocab.py A1
tools/.venv/bin/python tools/check_vocab.py A2
```
Expected: `✓ … within spiral vocabulary`。違反が出たら Task 12（例文差し替え）か allowlist 追補で解消し、再実行。**0 違反になるまでゲートを通さない。**

**Step 3: Commit** `data(nl): pass spiral vocabulary check A1/A2`。

---

## Phase 5 — 音声（edge-tts・nl-NL）

### Task 15: TTS スクリプトを蘭語音声に

**Files:** `tools/tts_lemma.py`, `tools/tts_generate.py`

**Step 1:** 両ファイルの `VOICE = "de-DE-KatjaNeural"` → `"nl-NL-ColetteNeural"`。
**Step 2:** `tts_generate.py` が例文テキストを読むフィールドを確認して蘭語化:
```bash
grep -n "\['de'\]\|\"de\"\|\.de\b" tools/tts_generate.py
```
→ 例文の合成対象を `e["de"]` から `e["nl"]` に変更（`boundary="WordBoundary"` は**維持**。無いと timing が空になりカラオケが壊れる）。
**Step 3:** commit `feat(nl): TTS uses nl-NL-ColetteNeural, reads nl field`。

---

### Task 16: 音声生成（見出し語＋例文カラオケ）

**Step 1:**
```bash
tools/.venv/bin/python tools/tts_lemma.py A1
tools/.venv/bin/python tools/tts_lemma.py A2
tools/.venv/bin/python tools/tts_generate.py A1
tools/.venv/bin/python tools/tts_generate.py A2
```
（中断再開可。恒久失敗は Web Speech フォールバックで許容。）

**Step 2: 音声込みで完全検証**
```bash
node tools/validate_data.mjs A1   # --no-audio なし = audio/timing 必須
node tools/validate_data.mjs A2
```
Expected: `✓ … words valid`。

**Step 3: `.gitignore` 確認**（独語版に倣い音声を追跡する想定。`data/*/audio` を無視していないこと）。
**Step 4: Commit** `data(nl): generate A1/A2 lemma + example audio (nl-NL)`。

---

## Phase 6 — ホームランチャー登録

### Task 17: ルート `js/content.js` に蘭語単語カード追加

**Files:** `js/content.js`（リポジトリ直下）

**Step 1:** `vocabulary` カードの直後に追記:
```js
{
  id: "vocabulary-nl",
  label: "単語（蘭）",
  kind: "app",
  href: "apps/vocabulary-nl/",
  tagline:
    "オランダ語 A1/A2 単語のフラッシュカード（Leitner）＋ネイティブ音声＋例文（スパイラル）＋進捗トラッキング。",
},
```
**Step 2:** `node --test tests/*.test.js`（ルート・Markdown レンダラが green）。
**Step 3: Commit** `feat: add Nederlands vocabulary app card to home launcher`。

---

## Phase 7 — 総合検証

### Task 18: テスト・検証・手動確認

**Step 1: ユニットテスト（蘭語アプリ）**
```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-nl && node --test
```
Expected: `srs/stats/session/slug/build_seed/allowlist` すべて green。

**Step 2: データ・スパイラル検証**
```bash
node tools/validate_data.mjs A1 && node tools/validate_data.mjs A2
tools/.venv/bin/python tools/check_vocab.py A1 && tools/.venv/bin/python tools/check_vocab.py A2
```

**Step 3: 起動して手動確認** — `./serve.sh` → `http://localhost:8000/`
- [ ] 「単語（蘭）」カード → `apps/vocabulary-nl/` に遷移。
- [ ] A1/A2 レベル切替で進捗が混ざらない。
- [ ] フラッシュカード裏: 意味(ja/en)・品詞・複数形・**例文（nl/ja/en）＋▶でカラオケ**。
- [ ] 「読むだけ」で全語検索・例文カラオケ再生。
- [ ] 見出し語 ▶ で蘭語音声。
- [ ] ワードマーク `NEDERLANDS A1/A2`、localStorage `nederlands-vocab-v1`。

**Step 4: a11y** — `/web-design-guidelines`（コントラスト4.5:1 / `:focus-visible` / 44px / aria / reduced-motion / 横スクロール無し / emoji アイコン不使用）。

**Step 5: 独語アプリ無変更の確認**
```bash
cd /Users/soma/Documents/GitHub/study-deutsch && git status --short apps/vocabulary/   # 空であること
```

---

### Task 19: 変更ログと PR

**Step 1:** `apps/vocabulary-nl/docs/plans/changes-log.md` にサマリ追記。
**Step 2:** REQUIRED SKILL `ship-pr`。`feat/vocabulary-nl` → `main`。PR 要約に「独立蘭語単語アプリ（独語版と同等 UX）」「例文スパイラル（A1→A1 / A2→A1∪A2）を LLM 文法検証＋spaCy 語彙検証の二段でゲート」「音声 nl-NL」「語彙は公式系ソースから web 収集」を明記。テストプランは Task 18 を流用。

---

## まとめ（DRY / YAGNI / TDD）

- コアの SRS・セッション・統計・ダッシュボード・**flashcard**・reader は**コピーのまま流用**（重複コードは許容。将来の共通バグ修正は両アプリ適用が必要な点だけ changes-log に注記）。
- 例文フィールドは `de`→`nl` の 1 点差のみ（影響は audio.js / reader.js / validator に限定）。
- **スパイラルは二段構え:** 文法レベル= LLM 検証（Task 13）／語彙メンバーシップ= 決定的 spaCy 検証（Task 14）。どちらも 0 違反をゲート条件にする。
- spaCy は**検証時のみの Python venv ツール**でアプリには同梱しない（ランタイムは素 JS・オフライン・依存無しを維持。edge-tts venv と同じ扱い）。
- 純関数・照合系（slug / build_seed / allowlist）はテスト先行。生成・音声は run-and-verify。
- こまめにコミット。`apps/vocabulary/`（独語）には触れない。
