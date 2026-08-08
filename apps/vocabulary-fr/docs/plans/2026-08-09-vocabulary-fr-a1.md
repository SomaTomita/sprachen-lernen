# フランス語 単語アプリ（A1）実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 既存のオランダ語単語アプリ `apps/vocabulary-nl/` を複製し、**フランス語 A1（1247語）** を学習できる独立オフラインアプリ `apps/vocabulary-fr/` を作る。UX は独語・蘭語版と同等（フラッシュカード＋見出し語音声＋例文のネイティブ音声＋単語カラオケ＋「読むだけ」＋進捗）。例文は**スパイラルラーニング**（A1 例文は A1 語彙のみ）を機械検証で担保する。

**Architecture:** 蘭語アプリを丸ごとコピーし、(1) 言語（データ・音声・UI 文言）をフランス語化、(2) データモデルをフランス語仕様（性 `le`/`la`＋**エリジオン表示** `l'`、仏語スラッグ、例文フィールド `nl`→`fr`）に変更、(3) 検証ツールをフランス語形態論に置き換える。SRS（Leitner）・セッション・進捗・統計のコアロジック（`srs.js` / `session.js` / `stats.js` / `dashboard.js`）は**無変更**で流用。`apps/vocabulary/`（独）と `apps/vocabulary-nl/`（蘭）には**一切触れない**。

**Tech Stack:** 素の HTML / CSS / JS（ES Modules）・ビルド無し・フレームワーク無し・localStorage・**外部CDN/Webフォント禁止**・オフライン動作。音声は edge-tts（Python venv）で事前生成。語彙スパイラル検証のみ spaCy `fr_core_news_sm`（venv・検証時のみ／アプリ非同梱）。テストは `node --test`。デザインは BMW corporate-automotive（正本 `../../docs/design/bmw-corporate-automotive.md`）。

---

## 確定済みの意思決定（実装者は前提として扱う）

1. **構成 = 独立アプリの複製。** 新規 `apps/vocabulary-fr/`。既存2アプリは**変更禁止**。コアの純関数が3コピーになるのは許容（共通バグ修正は3箇所適用が必要な点だけ changes-log に注記）。
2. **スコープ = A1 のみ（1247語）。** A2（679語）は別 issue。`js/storage.js` の `LEVELS` には**データがあるレベルだけ**を並べる（`['A1']`）。※蘭語版でここを誤って `['A1','A2']` のままにし、A2 タブが 404 エラー画面を出す不具合を出した。**同じ轍を踏まないこと。**
3. **スパイラルラーニング（必須）:** A1 例文は **A1 見出し語＋機能語 allowlist＋固有名詞・数詞のみ**。LLM 判定に委ねず `check_vocab.py` で決定的にゲートする。
4. **音声 = `fr-FR-DeniseNeural`**（女性・標準。男性版は `fr-FR-HenriNeural`）。
5. **localStorage キー = `francais-vocab-v1`**（`deutsch-vocab-v1` / `nederlands-vocab-v1` と衝突させない）。
6. **日本語訳は常体（プレーン体）で統一。** 「〜する / 〜だ」。です・ます体は使わない（例外: 敬称の語義そのものを教える語があればその語のみ）。※蘭語版でバッチ間の敬体/常体混在が生じ、後から252文の統一作業が発生した。**生成プロンプトに最初から焼き込むこと。**

### 語彙ソース（実在確認済み・2026-08-09 時点で取得可能）

| ソース | URL | 内容 | 用途 |
|---|---|---|---|
| **FLELex（CEFRLex, UCLouvain CENTAL）** | `https://cental.uclouvain.be/cefrlex/static/resources/fr/FleLex_TT_Beacco.tsv` | 14,235行。**CEFR レベル判定つき**仏語語彙 | **レベルの正本（A1 の定義）** |
| **Lexique 3.83** | `http://www.lexique.org/databases/Lexique383/Lexique383.tsv` | 約14万語形。`lemme` / `cgram`(品詞) / **`genre`(m,f)** / `nombre`(s,p) / 頻度 | **性（le/la）・複数形・頻度の付与** |
| Référentiel A1（Didier / France Éducation international） | `https://www.france-education-international.fr/document/cecrldescripteursprima11a1a2` | A1.1/A1/A2 の記述子（抜粋は無料・語彙表本体は有償書籍） | **文法天井の典拠** |

**FLELex の構造（確認済み）**
```
word  tag  freq_A1  freq_A2  freq_B1  freq_B2  freq_C1  freq_C2  freq_total  level
maison  NOM  ...                                                             A1
```
- **改行は CRLF。** パース時に `\r` を必ず除去する（`level` 列が `"A1\r"` になり全件マッチしなくなる）。
- `level` 列（Beacco 由来の CEFR 判定）の分布: **A1=1247 / A2=679** / B1=1753 / B2=5087 / C1=3155 / C2=2314。
- **同一語に複数の品詞行がある（homograph）。** 例: `être` は `NOM`=B1 と `VER`=A1、`pouvoir` は `NOM`=B1 と `VER`=A1。**品詞ごとに別レベル判定なので、行を品詞つきで扱うこと**（`word` だけで最初の1行を取ると `être`/`avoir`/`aller` を B1/C2 と誤判定して A1 から落とす）。
- A1 の品詞内訳: NOM 633 / VER 262 / ADJ 168 / ADV 93 / PRO 34 / PRP 23 / KON 14 / INT 10 / DET:POS 6 / PRP:det 2 / DET:ART 2。
- **蘭語版との重要な差:** FLELex は機能語（代名詞・前置詞・接続詞）と基本動詞（être/avoir/aller/faire/vouloir/pouvoir すべて VER=A1）を**最初から含む**。numo（蘭）で発生した「上位100語のうち55語が欠落」という穴は無い見込み。**ただし Task 8 で頻度クロスチェックを必ず実施し、思い込みで飛ばさないこと。**

### フランス語データモデル（`data/A1/words.json` の1件）

```json
{
  "id": "a1-maison",
  "lemma": "maison",
  "pos": "noun",
  "article": "la",
  "plural": "maisons",
  "level": "A1",
  "lemmaAudio": "audio/lemma/a1-maison.mp3",
  "meanings": [{ "ja": "家", "en": "house" }],
  "examples": [
    {
      "fr": "La maison est grande.",
      "ja": "その家は大きい。",
      "en": "The house is big.",
      "audio": "audio/a1-maison-1.mp3",
      "timing": [{ "w": "La", "s": 0.0, "e": 0.22 }]
    }
  ]
}
```

- 例文の文フィールドは **`fr`**（独版 `de` / 蘭版 `nl` に対応）。
- 名詞は `article` = **`le`** か **`la`**（文法性）。**`l'` は保存しない**（表示時に算出する。下記エリジオン参照）。
- `plural` は任意（不規則あり: `journal→journaux`, `œil→yeux`, `cheval→chevaux`）。
- `meanings` は最低1件、各 `ja`/`en` 必須。例文数は各語 **2文**、`meanings.length>=2` の語は **3文以上で各語義を1文以上カバー**。

### エリジオン（フランス語固有・新規実装）

母音・無音 h の前で `le`/`la` は `l'` になる。**表示形は保存せず純関数で算出**する。

- `la maison` → 「la maison」 / `la école` ではなく → **「l'école」**
- `le homme` ではなく → **「l'homme」**（無音 h）
- ただし有音 h は縮約しない: **「le héros」**（A1 に有音 h 語が入る場合のみ例外表を持つ）
- 母音・無音 h の判定は `lemma` の先頭文字が `[aeiouâàéèêëîïôöûüh]` かで近似し、**有音 h の例外リスト**（`héros`, `hall`, `haricot` 等。A1 に該当語があれば列挙）で除外する。

### スラッグ規則（フランス語 ID 用）

蘭語版の `slug.mjs`（NFD 正規化＋結合記号除去）はアクセントを正しく処理する（`café→cafe` / `élève→eleve` / `français→francais` / `être→etre` / `naïf→naif`）が、**合字 œ / æ は NFD 分解されないため壊れる**。実測:

| 入力 | 現状（蘭版のまま） | 期待 |
|---|---|---|
| `sœur` | `a1-s-ur` ✗ | `a1-soeur` |
| `œuf` | `a1-uf` ✗ | `a1-oeuf` |
| `cœur` | `a1-c-ur` ✗ | `a1-coeur` |

→ **NFD の前に合字を展開する**（`œ→oe`, `æ→ae`）。アポストロフィはハイフンで可（`aujourd'hui → a1-aujourd-hui`）。

---

## 進め方（実装者向け）

- **ブランチ:** `feat/vocabulary-fr`。こまめにコミット。
- **テスト:** `apps/vocabulary-fr/` 直下で `node --test`。
- **起動:** リポジトリ直下で `./serve.sh` → `http://localhost:8000/apps/vocabulary-fr/`。**`file://` 不可**。
- **不変更（コピーのまま触らない）:** `js/srs.js` / `js/session.js` / `js/stats.js` / `js/dashboard.js` / `js/data.js` / `js/flashcard.js` / `css/styles.css` / `tests/srs.test.js` / `tests/stats.test.js` / `tests/session.test.js`。
- **並列サブエージェントを使う場合、scratch ファイル名は必ずバッチ番号で一意にする。** ※蘭語版で複数エージェントが同名の一時ファイルを取り合い、検証スクリプトが上書きされる事故が繰発した。
- 純関数・検証系（slug / elision / build / validator / allowlist）は**失敗するテストを先に**書く。

---

## Phase 0 — ブランチ

### Task 0: ブランチ作成

```bash
cd /Users/soma/Documents/GitHub/study-deutsch
git checkout -b feat/vocabulary-fr
```
Expected: `Switched to a new branch 'feat/vocabulary-fr'`

---

## Phase 1 — 複製とフランス語化

### Task 1: 蘭語アプリを複製

**Step 1: コピー（生成物・データは除外）**

```bash
cd /Users/soma/Documents/GitHub/study-deutsch
rsync -a --exclude 'data/*/audio' --exclude 'data/*/words.json' --exclude 'tools/.venv' \
  --exclude 'node_modules' --exclude 'tools/raw' --exclude 'docs/plans/changes-log.md' \
  apps/vocabulary-nl/ apps/vocabulary-fr/
```
> `docs/plans/` に本計画ファイルが既にあるので `rsync`（`--delete` 無し）はそれを消さない。

**Step 2: 蘭語固有ファイルを削除し、空ディレクトリを用意**

```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-fr
rm -f tools/function_words_nl.txt tools/parse_numo.mjs tools/parse_freq.mjs
rm -rf data/A2                       # A1 のみ
mkdir -p data/A1/audio/lemma tools/raw
```
> **保持する:** `js/reader.js` / `tools/tts_generate.py` / `tools/tts_lemma.py` / `tools/validate_data.mjs` / `tools/slug.mjs` / `tools/build_seed.mjs` / `tools/merge_exgen.mjs` / `tools/apply_fixes.mjs` / `tools/check_vocab.py` / `tools/allowlist_lemmas.mjs` / `tools/sentence_pipeline.md` / `tests/`。

**Step 3: 確認**
```bash
ls js/ tools/ && ls docs/plans/
```
Expected: `js/` に reader.js がある。`tools/` に上記スクリプトがある。`docs/plans/` に本計画がある。

**Step 4: Commit**
```bash
git add -A apps/vocabulary-fr
git commit -m "chore: scaffold apps/vocabulary-fr from vocabulary-nl"
```

---

### Task 2: 例文フィールド `nl` → `fr` の改名

**Files:** `js/audio.js`, `js/reader.js`

**Step 1: 影響箇所を確認**
```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-fr
grep -rn "example\.nl\|e\.nl\b" js/
```
Expected: `js/audio.js` 2件（renderSentence の分割・speakFallback）、`js/reader.js` 2件（aria-label・検索）。

**Step 2: `js/audio.js`**
```diff
-        : example.nl.split(/\s+/);
+        : example.fr.split(/\s+/);
```
```diff
-        return speakFallback(example.nl);
+        return speakFallback(example.fr);
```
```diff
-    u.lang = 'nl-NL';
+    u.lang = 'fr-FR';
```

**Step 3: `js/reader.js`**
```diff
-            btn.setAttribute('aria-label', `例文を再生: ${e.nl}`);
+            btn.setAttribute('aria-label', `例文を再生: ${e.fr}`);
```
```diff
-        return w.examples.some(e => e.nl.toLowerCase().includes(q)
+        return w.examples.some(e => e.fr.toLowerCase().includes(q)
```
検索の `visually-hidden` ラベルと `placeholder` の「蘭語」を「仏語」に変更。

**Step 4: 確認**
```bash
node --check js/audio.js && node --check js/reader.js
grep -rn "\.nl\b" js/audio.js js/reader.js   # ヒット0件
```

**Step 5: Commit**
```bash
git add js/audio.js js/reader.js
git commit -m "refactor(fr): example sentence field nl→fr (fr-FR fallback)"
```

---

### Task 3: ブランディング・localStorage キー・LEVELS

**Files:** `js/storage.js`, `js/main.js`, `index.html`, `package.json`, `README.md`, `CLAUDE.md`

**Step 1: `js/storage.js`**
```diff
-const KEY = 'nederlands-vocab-v1';
+const KEY = 'francais-vocab-v1';
```
`LEVELS` は**そのまま `['A1']`**（蘭語版から引き継ぐ）。コメントも維持する。

**Step 2: `js/main.js` の `renderWordmarks()`**
```js
if (wordmark) wordmark.textContent = `FRANÇAIS ${level}`;
if (footerWordmark) footerWordmark.textContent = `FRANÇAIS ${level}`;
document.title = `Français ${level} 単語`;
```

**Step 3: `index.html`** — `<title>`=`Français A1 単語`、`#wordmark`/`#footerWordmark`=`FRANÇAIS A1`、`href="../../"` は据置。

**Step 4: `package.json`** — `name`=`vocabulary-fr`、説明を仏語アプリに。

**Step 5: `README.md` / `CLAUDE.md`** — 蘭語版をベースに、言語（仏語）・音声（`fr-FR-DeniseNeural`）・スラッグ（合字展開）・**エリジオン**・例文フィールド `fr`・冠詞 `le`/`la`・localStorage キー・語彙ソース（FLELex / Lexique383）・A1のみである旨（`LEVELS` の注意書きを含む）に差し替える。

**Step 6: Commit**
```bash
git add js/storage.js js/main.js index.html package.json README.md CLAUDE.md
git commit -m "chore(fr): rebrand to Français, isolate localStorage key"
```

---

### Task 4: `validate_data.mjs` をフランス語スキーマ用に

**Files:** `tools/validate_data.mjs`

**Step 1: 置き換え**

```js
// tools/validate_data.mjs — フランス語スキーマ検証（例文フィールドは fr、冠詞は le/la）
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
    else if (w.article !== 'le' && w.article !== 'la') fail(w.id, `article must be le|la (got ${w.article})`);
  }
  if (w.article && w.pos !== 'noun') fail(w.id, 'article on non-noun');
  if (!Array.isArray(w.meanings) || !w.meanings.length) fail(w.id, 'no meanings');
  for (const m of w.meanings || []) if (!m.ja || !m.en) fail(w.id, 'meaning missing ja/en');
  const need = (w.meanings && w.meanings.length >= 2) ? 3 : 2;
  if (!Array.isArray(w.examples) || w.examples.length < need) fail(w.id, `need >=${need} examples`);
  for (const e of w.examples || []) {
    if (!e.fr || !e.ja || !e.en) fail(w.id, 'example missing text (fr/ja/en)');
    if (!process.argv.includes('--no-audio')) {
      if (!e.audio) fail(w.id, 'example missing audio');
      if (!Array.isArray(e.timing) || !e.timing.length) fail(w.id, 'example missing timing');
    }
  }
}
console.log(errors ? `\n${errors} errors` : `✓ ${data.length} words valid`);
process.exit(errors ? 1 : 0);
```

**Step 2/3:** `node --check tools/validate_data.mjs` → commit `feat(fr): validator for French schema (fr field, le/la)`。

---

## Phase 2 — 純関数（TDD）

### Task 5: スラッグの合字対応（TDD）

**Files:** `tests/slug.test.js`, `tools/slug.mjs`

**Step 1: 失敗するテストに差し替え**

`tests/slug.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { slugId } from '../tools/slug.mjs';

test('strips French accents', () => {
  assert.equal(slugId('café', 'A1'), 'a1-cafe');
  assert.equal(slugId('élève', 'A1'), 'a1-eleve');
  assert.equal(slugId('français', 'A1'), 'a1-francais');
  assert.equal(slugId('être', 'A1'), 'a1-etre');
  assert.equal(slugId('naïf', 'A1'), 'a1-naif');
});
test('expands the œ/æ ligatures (NFD does not decompose them)', () => {
  assert.equal(slugId('sœur', 'A1'), 'a1-soeur');
  assert.equal(slugId('œuf', 'A1'), 'a1-oeuf');
  assert.equal(slugId('cœur', 'A1'), 'a1-coeur');
});
test('apostrophes and spaces become single hyphens', () => {
  assert.equal(slugId("aujourd'hui", 'A1'), 'a1-aujourd-hui');
});
```

**Step 2:** `node --test tests/slug.test.js` → **FAIL**（`a1-s-ur` / `a1-uf` / `a1-c-ur`）。

**Step 3: `tools/slug.mjs` の `slug()` 先頭に合字展開を追加**
```js
// 合字は NFD で分解されないため、正規化の前に明示的に展開する（sœur→soeur）。
const LIGATURES = [[/œ/g, 'oe'], [/Œ/g, 'OE'], [/æ/g, 'ae'], [/Æ/g, 'AE']];

export function slug(lemma) {
  let s = lemma;
  for (const [re, to] of LIGATURES) s = s.replace(re, to);
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```
> 既存の結合記号除去の文字クラスはそのまま使う（`̀-ͯ` の形で書かれていなければこの形に直す）。

**Step 4:** `node --test tests/slug.test.js` → **PASS**。 **Step 5:** commit `fix(fr): expand œ/æ ligatures in slug + tests`。

---

### Task 6: エリジオン表示（TDD・新規）

見出し語の表示形（`l'école` / `la maison` / `le livre`）を算出する純関数。

**Files:** `tools/elision.mjs`（新規）, `tests/elision.test.js`（新規）

**Step 1: 失敗するテスト**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { displayHeadword, HARD_H } from '../tools/elision.mjs';

test('no elision before a consonant', () => {
  assert.equal(displayHeadword('le', 'livre'), 'le livre');
  assert.equal(displayHeadword('la', 'maison'), 'la maison');
});
test("elides to l' before a vowel", () => {
  assert.equal(displayHeadword('la', 'école'), "l'école");
  assert.equal(displayHeadword('le', 'enfant'), "l'enfant");
  assert.equal(displayHeadword('la', 'eau'), "l'eau");
  assert.equal(displayHeadword('le', 'ami'), "l'ami");
});
test("elides before a mute h but not an aspirated h", () => {
  assert.equal(displayHeadword('le', 'homme'), "l'homme");
  assert.equal(displayHeadword('le', 'hôtel'), "l'hôtel");
  assert.equal(displayHeadword('le', 'héros'), 'le héros');   // h aspiré
});
test('accented vowels elide too', () => {
  assert.equal(displayHeadword('la', 'île'), "l'île");
  assert.equal(displayHeadword('le', 'être'), "l'être");
});
test('no article returns the bare lemma', () => {
  assert.equal(displayHeadword(null, 'parler'), 'parler');
  assert.equal(displayHeadword(undefined, 'bon'), 'bon');
});
test('the aspirated-h list is exported so data tasks can extend it', () => {
  assert.ok(HARD_H instanceof Set);
  assert.ok(HARD_H.has('héros'));
});
```

**Step 2:** `node --test tests/elision.test.js` → **FAIL**（モジュール無し）。

**Step 3: `tools/elision.mjs`**
```js
// 見出し語の表示形を作る。le/la は母音・無音 h の前で l' に縮約する（エリジオン）。
// 有音 h（h aspiré）は縮約しないので例外集合で除外する。

/** 有音 h の語（A1 に登場するものを列挙。増えたらここに追加する）。 */
export const HARD_H = new Set([
  'héros', 'hall', 'haricot', 'hasard', 'haut', 'hauteur', 'hockey', 'hollandais',
  'homard', 'honte', 'hors', 'huit', 'huitième',
]);

const VOWELS = /^[aeiouâàäéèêëîïôöûüù]/i;

/** 冠詞と見出し語から表示形を返す（`la`+`école` → "l'école"）。 */
export function displayHeadword(article, lemma) {
  if (!article) return lemma;
  const first = lemma.normalize('NFC');
  const startsVowel = VOWELS.test(first);
  const muteH = /^h/i.test(first) && !HARD_H.has(lemma.toLowerCase());
  return (startsVowel || muteH) ? `l'${lemma}` : `${article} ${lemma}`;
}
```

**Step 4:** `node --test tests/elision.test.js` → **PASS**。 **Step 5:** commit `feat(fr): elision-aware headword display + tests`。

---

### Task 7: UI をエリジオン表示に差し替え

**Files:** `js/flashcard.js`, `js/reader.js`, `js/elision.js`(新規・`tools/elision.mjs` のコピー)

> `tools/` は Node 用、`js/` はブラウザ用。ブラウザから `tools/` を読ませないため、**同内容の `js/elision.js` を置く**（このリポジトリはビルド無しのため共有より複製を採る。差異が出ないよう両方をテスト対象にする）。

**Step 1: `js/elision.js` を作る**
```bash
cp tools/elision.mjs js/elision.js
```

**Step 2: `js/flashcard.js` の見出し語描画**
```diff
-          <h2 class="headword">${word.article ? word.article + ' ' : ''}${word.lemma}</h2>
+          <h2 class="headword">${displayHeadword(word.article, word.lemma)}</h2>
```
先頭に `import { displayHeadword } from './elision.js';` を追加。

**Step 3: `js/reader.js` の見出し語描画**
```diff
-        headword.textContent = `${w.article ? w.article + ' ' : ''}${w.lemma}`;
+        headword.textContent = displayHeadword(w.article, w.lemma);
```
先頭に `import { displayHeadword } from './elision.js';` を追加。

**Step 4: 一致確認テストを足す**

`tests/elision.test.js` の末尾に追記:
```js
import { displayHeadword as browserVersion } from '../js/elision.js';
test('js/elision.js stays in sync with tools/elision.mjs', () => {
  for (const [a, l] of [['la','école'],['le','livre'],['le','héros'],['la','maison'],[null,'parler']])
    assert.equal(browserVersion(a, l), displayHeadword(a, l));
});
```

**Step 5:** `node --test` → 全 green。 **Step 6:** commit `feat(fr): render headwords with elision (l'école)`。

---

## Phase 3 — 公式ソースのパース（再現可能に）

> **蘭語版の教訓:** PDF/TSV のパースを使い捨てスクリプトで済ませると、語彙リストがソースから再構築できなくなる。**最初から `tools/` のスクリプトとして書く。**

### Task 8: FLELex パーサ（TDD）

**Files:** `tools/parse_flelex.mjs`, `tests/parse_flelex.test.js`

**Step 1: 失敗するテスト**（CRLF と homograph を必ず含める）
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlelex, FLELEX_POS } from '../tools/parse_flelex.mjs';

const SAMPLE = [
  'word\ttag\tfreq_A1\tfreq_A2\tfreq_B1\tfreq_B2\tfreq_C1\tfreq_C2\tfreq_total\tlevel',
  'maison\tNOM\t100\t0\t0\t0\t0\t0\t100\tA1',
  'être\tNOM\t0\t0\t10\t0\t0\t0\t10\tB1',      // homograph: 名詞は B1
  'être\tVER\t900\t0\t0\t0\t0\t0\t900\tA1',    // homograph: 動詞は A1
  'abaisser\tVER\t0\t0\t0\t1\t0\t0\t1\tB2',
].join('\r\n');                                  // ← CRLF

test('keeps only rows at the requested level, ignoring CRLF', () => {
  const out = parseFlelex(SAMPLE, 'A1');
  assert.deepEqual(out.map(r => `${r.lemma}/${r.pos}`).sort(), ['maison/noun', 'être/verb']);
});
test('treats homographs as separate rows (être is VER=A1 even though NOM=B1)', () => {
  const out = parseFlelex(SAMPLE, 'A1');
  const etre = out.find(r => r.lemma === 'être');
  assert.equal(etre.pos, 'verb');
});
test('maps the TreeTagger tagset to internal pos', () => {
  assert.equal(FLELEX_POS['NOM'], 'noun');
  assert.equal(FLELEX_POS['VER'], 'verb');
  assert.equal(FLELEX_POS['ADJ'], 'adjective');
  assert.equal(FLELEX_POS['PRO'], 'pronoun');
  assert.equal(FLELEX_POS['KON'], 'conjunction');
});
```

**Step 2:** run → FAIL。

**Step 3: 実装 `tools/parse_flelex.mjs`**
```js
// FLELex（CEFRLex, UCLouvain）の CEFR レベル判定つき仏語語彙 TSV をパースする。
//
// 取得（再現手順）:
//   curl -sL -o /tmp/flelex.tsv \
//     https://cental.uclouvain.be/cefrlex/static/resources/fr/FleLex_TT_Beacco.tsv
// 実行:
//   node tools/parse_flelex.mjs /tmp/flelex.tsv A1 > tools/raw/flelex_a1.json
//
// 列: word, tag, freq_A1..freq_C2, freq_total, level
// 注意1: 改行は CRLF。`\r` を除去しないと level 列が "A1\r" になり全件外れる。
// 注意2: 同一語に品詞ごとの行がある（être は NOM=B1 / VER=A1）。word だけで
//        1行に畳むと基本動詞を取り落とすので、必ず (word, tag) 単位で扱う。
import { readFileSync } from 'node:fs';

export const FLELEX_POS = {
  NOM: 'noun', VER: 'verb', ADJ: 'adjective', ADV: 'adverb', PRO: 'pronoun',
  PRP: 'preposition', 'PRP:det': 'preposition', KON: 'conjunction', INT: 'interjection',
  NUM: 'numeral', 'DET:ART': 'article', 'DET:POS': 'determiner',
};

/** TSV 文字列 → [{lemma, pos, tag, freq}]（指定レベルの行のみ） */
export function parseFlelex(text, level = 'A1') {
  const out = [];
  const seen = new Set();
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].replace(/\r/g, '').split('\t');
    if (cols.length < 10) continue;
    const [word, tag] = cols;
    if (cols[9] !== level) continue;
    const pos = FLELEX_POS[tag];
    if (!pos) continue;
    const key = `${word} ${pos}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ lemma: word.toLowerCase(), pos, tag, freq: Number(cols[2]) || 0 });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , src, level = 'A1'] = process.argv;
  if (!src) { console.error('usage: node tools/parse_flelex.mjs <flelex.tsv> [level]'); process.exit(2); }
  const out = parseFlelex(readFileSync(src, 'utf-8'), level);
  const by = {};
  for (const r of out) by[r.pos] = (by[r.pos] || 0) + 1;
  console.error(`${level}: ${out.length} entries ${JSON.stringify(by)}`);
  process.stdout.write(JSON.stringify(out) + '\n');
}
```

**Step 4:** run → PASS。

**Step 5: 実データで確認**
```bash
curl -sL -o /tmp/flelex.tsv https://cental.uclouvain.be/cefrlex/static/resources/fr/FleLex_TT_Beacco.tsv
node tools/parse_flelex.mjs /tmp/flelex.tsv A1 > tools/raw/flelex_a1.json
```
Expected（stderr）: `A1: 1247 entries {"noun":633,"verb":262,"adjective":168,"adverb":93,...}`
**この件数と内訳が一致しない場合は止めて原因を調べる**（ソース側の更新か、パース崩れ）。

**Step 6:** commit `feat(fr): FLELex parser (CEFR-graded word list) + tests`。

---

### Task 9: Lexique383 パーサ（性・複数形・頻度）（TDD）

**Files:** `tools/parse_lexique.mjs`, `tests/parse_lexique.test.js`

**Step 1: 失敗するテスト**
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLexique } from '../tools/parse_lexique.mjs';

const HDR = 'ortho\tphon\tlemme\tcgram\tgenre\tnombre\tfreqlemfilms2\tfreqlemlivres';
const SAMPLE = [
  HDR,
  'maison\tmEzO~\tmaison\tNOM\tf\ts\t100\t90',
  'maisons\tmEzO~\tmaison\tNOM\tf\tp\t20\t18',
  'livre\tlivR\tlivre\tNOM\tm\ts\t80\t70',
  'journal\tZuRnal\tjournal\tNOM\tm\ts\t50\t40',
  'journaux\tZuRno\tjournal\tNOM\tm\tp\t10\t9',
  'parler\tpaRle\tparler\tVER\t\t\t200\t180',
].join('\n');

test('gives gender as the article le/la for nouns', () => {
  const lx = parseLexique(SAMPLE);
  assert.equal(lx.get('maison').article, 'la');
  assert.equal(lx.get('livre').article, 'le');
});
test('picks up the irregular plural from the p-number row', () => {
  const lx = parseLexique(SAMPLE);
  assert.equal(lx.get('maison').plural, 'maisons');
  assert.equal(lx.get('journal').plural, 'journaux');
});
test('non-nouns carry no article or plural', () => {
  const lx = parseLexique(SAMPLE);
  assert.equal(lx.get('parler').article, null);
  assert.equal(lx.get('parler').plural, null);
});
```

**Step 2:** run → FAIL。

**Step 3: 実装 `tools/parse_lexique.mjs`**
```js
// Lexique 3.83（lexique.org）から見出し語ごとの 性 / 複数形 / 頻度 を取り出す。
//
// 取得（再現手順）:
//   curl -sL -o /tmp/lexique383.tsv http://www.lexique.org/databases/Lexique383/Lexique383.tsv
// 実行:
//   node tools/parse_lexique.mjs /tmp/lexique383.tsv > tools/raw/lexique.json
//
// 使う列: ortho(表層) / lemme(見出し) / cgram(品詞) / genre(m,f) / nombre(s,p) / freqlemlivres
// 性は genre 列から le/la に落とす。複数形は同じ lemme の nombre=p 行の ortho を採る
// （journal→journaux のような不規則も自然に拾える）。
import { readFileSync } from 'node:fs';

/** TSV 文字列 → Map<lemma, {article, plural, cgram, freq}> */
export function parseLexique(text) {
  const lines = text.split('\n');
  const head = lines[0].replace(/\r/g, '').split('\t');
  const ix = (name) => head.indexOf(name);
  const [iO, iL, iC, iG, iN, iF] =
    ['ortho', 'lemme', 'cgram', 'genre', 'nombre', 'freqlemlivres'].map(ix);

  const out = new Map();
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].replace(/\r/g, '').split('\t');
    if (c.length <= iF) continue;
    const lemma = (c[iL] || '').toLowerCase();
    if (!lemma) continue;
    const cgram = c[iC] || '';
    const isNoun = cgram === 'NOM';
    const rec = out.get(lemma) || { article: null, plural: null, cgram, freq: Number(c[iF]) || 0 };
    if (isNoun && !rec.article) {
      if (c[iG] === 'f') rec.article = 'la';
      else if (c[iG] === 'm') rec.article = 'le';
    }
    if (isNoun && c[iN] === 'p' && !rec.plural) rec.plural = c[iO];
    out.set(lemma, rec);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node tools/parse_lexique.mjs <Lexique383.tsv>'); process.exit(2); }
  const lx = parseLexique(readFileSync(src, 'utf-8'));
  const withArt = [...lx.values()].filter(r => r.article).length;
  console.error(`${lx.size} lemmas (${withArt} with le/la)`);
  process.stdout.write(JSON.stringify(Object.fromEntries(lx)) + '\n');
}
```

**Step 4:** run → PASS。

**Step 5: 実データで確認**
```bash
curl -sL -o /tmp/lexique383.tsv http://www.lexique.org/databases/Lexique383/Lexique383.tsv
node tools/parse_lexique.mjs /tmp/lexique383.tsv > tools/raw/lexique.json
```
Expected（stderr）: 十数万 lemma、うち数万件に le/la。

**Step 6:** commit `feat(fr): Lexique383 parser (gender/plural/frequency) + tests`。

---

## Phase 4 — A1 語彙リストの構築

### Task 10: FLELex × Lexique を結合して seed 素データを作る

**Files:** `tools/build_wordlist.mjs`, `tools/raw/a1.jsonl`

**Step 1: 実装 `tools/build_wordlist.mjs`**

FLELex の A1 行（1247）に Lexique の性・複数形を結合し、`{lemma,pos,article?,plural?}` の JSONL を出す。**名詞で性が付かなかった語を stderr に列挙する**（Task 11 で人手/LLM 補完）。

```js
// FLELex（レベル判定）× Lexique383（性・複数形）→ seed 素データ JSONL。
// 実行: node tools/build_wordlist.mjs tools/raw/flelex_a1.json tools/raw/lexique.json A1 > tools/raw/a1.jsonl
import { readFileSync } from 'node:fs';

const [, , flelexPath, lexiquePath, level = 'A1'] = process.argv;
const flelex = JSON.parse(readFileSync(flelexPath, 'utf-8'));
const lexique = JSON.parse(readFileSync(lexiquePath, 'utf-8'));

const missingGender = [];
const rows = flelex.map(r => {
  const lx = lexique[r.lemma] || {};
  const row = { lemma: r.lemma, pos: r.pos };
  if (r.pos === 'noun') {
    if (lx.article) row.article = lx.article;
    else missingGender.push(r.lemma);
    if (lx.plural && lx.plural !== r.lemma) row.plural = lx.plural;
  }
  return row;
});

console.error(`${rows.length} words | nouns missing gender: ${missingGender.length}`);
if (missingGender.length) console.error('  ' + missingGender.join(', '));
process.stdout.write(rows.map(r => JSON.stringify(r)).join('\n') + '\n');
```

**Step 2: 実行**
```bash
node tools/build_wordlist.mjs tools/raw/flelex_a1.json tools/raw/lexique.json A1 > tools/raw/a1.jsonl
wc -l < tools/raw/a1.jsonl        # 1247
```

**Step 3: 頻度クロスチェック（蘭語版の教訓・必須）**

FLELex A1 に**コア語が入っているか**を Lexique の頻度上位と突き合わせる:
```bash
node -e "
const fs=require('fs');
const a1=new Set(fs.readFileSync('tools/raw/a1.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).lemma));
const lx=JSON.parse(fs.readFileSync('tools/raw/lexique.json','utf8'));
const top=Object.entries(lx).sort((x,y)=>y[1].freq-x[1].freq).slice(0,300).map(([l])=>l);
const miss=top.filter(l=>!a1.has(l));
console.log('top-300 frequent lemmas missing from A1:',miss.length);
console.log(miss.slice(0,60).join(', '));
"
```
- **欠落が多い場合（目安 50語超）**は、Lexique 頻度上位から欠落コア語を補完する（蘭語版で numo に対して行ったのと同じ手当て）。補完したら**語数と基準を changes-log に明記**する。
- 欠落が少なければ FLELex のみで確定してよい。**どちらでも、確認した事実を changes-log に書く。**

**Step 4:** commit `data(fr): build A1 word list from FLELex × Lexique383`。

---

### Task 11: 性の欠落補完と日英グロス付与（バッチ・並列）

**Files:** `tools/raw/gloss/batch_NN.json`, `tools/raw/gloss/out_NN.jsonl`

**Step 1: バッチ分割**（1バッチ 70語程度 → 約18バッチ）
```bash
node -e "
const fs=require('fs');fs.mkdirSync('tools/raw/gloss',{recursive:true});
const rows=fs.readFileSync('tools/raw/a1.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const S=70;for(let i=0;i*S<rows.length;i++)
  fs.writeFileSync('tools/raw/gloss/batch_'+String(i).padStart(2,'0')+'.json',JSON.stringify(rows.slice(i*S,(i+1)*S),null,1));
console.log('batches:',Math.ceil(rows.length/S));
"
```

**Step 2: 1バッチだけ先に回して品質を見る**（全並列の前に必ず）。エージェントへの指示に含める要件:
- `ja` は**常体**（〜する / 〜だ）。です・ます体禁止。動詞は辞書形。
- `en` は自然な英語（動詞は "to X"）。
- **名詞で `article` が無い語は `le`/`la` を補う**（Lexique に無かった語）。確信が持てなければ `"conf":"low"` を付ける。
- `pos` が明らかに誤っていれば直し `"note":"pos was X"` を付ける。
- 出力は JSONL のみ（前後の説明文・コードフェンス禁止）。**scratch ファイル名はバッチ番号で一意にする。**

**Step 3:** 品質 OK なら残りを並列実行。**Step 4:** マージ＋検証
```bash
node -e "
const fs=require('fs');
const files=fs.readdirSync('tools/raw/gloss').filter(f=>/^out_\d+\.jsonl$/.test(f)).sort();
const rows=files.flatMap(f=>fs.readFileSync('tools/raw/gloss/'+f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)));
const seen=new Set();const out=[];
for(const r of rows){if(seen.has(r.lemma))continue;seen.add(r.lemma);out.push(r);}
const bad=out.filter(r=>r.pos==='noun'&&!['le','la'].includes(r.article));
const noG=out.filter(r=>!r.ja||!r.en);
console.log('merged',out.length,'| nouns missing le/la:',bad.length,'| missing gloss:',noG.length);
if(bad.length)console.log(bad.slice(0,20).map(r=>r.lemma).join(', '));
fs.writeFileSync('tools/raw/a1.jsonl',out.map(r=>JSON.stringify(r)).join('\n')+'\n');
"
```
Expected: `nouns missing le/la: 0`、`missing gloss: 0`。

**Step 5:** commit `data(fr): gloss A1 word list (ja/en, gender completion)`。

---

### Task 12: 性の独立検証パス

**Step 1:** 名詞を3バッチに分け、**別エージェント**に `le`/`la` の正しさだけを判定させる（Lexique 由来なので誤りは少ない見込みだが、`conf:low` と Lexique 欠落語は要確認）。出力は「変更すべき語のみ」の JSON 配列 `[{lemma, given, correct, reason}]`。
- 判定基準: 標準フランス語（Le Robert / Larousse）。両性ありの語（`après-midi` 等）は与えられた方を許容。
- **注意:** 複数形が見出し語になっている語があれば性は単数形に合わせる。

**Step 2:** 修正を適用 → `tools/raw/a1.jsonl` を更新。 **Step 3:** commit `fix(fr): correct N noun genders (verification pass)`。

---

### Task 13: seed words.json を生成

**Step 1:** `tools/build_seed.mjs` は蘭語版のまま使える（`article` をそのまま通す）。ただし**エリジオンは表示時に算出**するので seed には入れない。
```bash
node tools/build_seed.mjs A1 tools/raw/a1.jsonl
node tools/validate_data.mjs A1 --no-audio    # 例文が無いので example 数エラーが出るのは正常
```
**Step 2:** commit `data(fr): build A1 seed words.json`。

---

## Phase 5 — スパイラル検証基盤（フランス語形態論）

> **蘭語版の最大の教訓:** 検証ツールが正しい言語表現を偽陽性で弾くと、生成側が不自然な言い換えを強いられ**教材の質が落ちる**。**例文生成の前に**ツールをフランス語形態論に対応させ、精度テストを通しておくこと。

### Task 14: 機能語 allowlist（フランス語）

**Files:** `tools/function_words_fr.txt`

冠詞・代名詞・前置詞・接続詞・基本助動詞と、**エリジオン形**を含める:
```
le la les un une des du de la l' d'
je tu il elle on nous vous ils elles
me te se lui leur moi toi soi nous vous
mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs
ce cet cette ces celui celle ça cela c' ç'
qui que quoi où quand comment combien pourquoi qu'
ne pas plus jamais rien personne aucun
et ou mais donc car ni or
à au aux de en dans sur sous chez avec sans pour par vers entre devant derrière après avant pendant
je j' n' s' m' t' qu' l' d' c'
suis es est sommes êtes sont être
ai as a avons avez ont avoir
vais vas va allons allez vont aller
fais fait faisons faites font faire
peux peut pouvons pouvez peuvent pouvoir
veux veut voulons voulez veulent vouloir
il y a c'est voici voilà
très bien aussi encore déjà ici là maintenant aujourd'hui oui non
```
> 実装時は A1 見出し語と重複しても構わない（allowlist は語彙集合の担保のみ。文法可否は Task 15 の LLM 検証が担う）。

**Commit:** `feat(fr): French function-word allowlist`。

---

### Task 15: `check_vocab.py` をフランス語形態論に対応（精度テスト必須）

**Files:** `tools/check_vocab.py`

蘭語版の正規化（重子音・`-eren`・分離動詞）は**蘭語固有なので置き換える**。フランス語で吸収すべき形:

| 現象 | 例 | 対応 |
|---|---|---|
| エリジオン | `l'école` → `l'` + `école` | spaCy fr がトークン分割する。`'` で終わるトークンは機能語として扱う |
| 動詞活用 | `parle / parles / parlent / parlé / parlait` ← `parler` | 語尾 `-e -es -ent -é -ée -és -ées -er -ir -re -is -it -ons -ez -ait` を落として語幹一致 |
| 形容詞一致 | `grande / grands / grandes` ← `grand` | 語尾 `-e -s -es` を落とす |
| 不規則複数 | `journaux` ← `journal` / `yeux` ← `œil` | `-aux`→`-al`、`-eux`→`-eu` の書き換えを試す＋ seed の `plural` を許可集合に**明示的に足す**（最も確実） |
| アクセント揺れ | `élève` / `eleve` | NFD で結合記号を除去して比較 |
| 合字 | `sœur` / `soeur` | `œ→oe` に展開して比較 |

**Step 1: 実装方針**
- `canon_forms()` を上記フランス語規則で書き直す。
- **許可集合には見出し語だけでなく `plural` も入れる**（不規則複数の偽陽性を根本的に潰せる）。
- `FUNCTION_POS` は蘭語版と同じ（ADP/AUX/CCONJ/SCONJ/DET/PRON/PART/PUNCT/NUM/PROPN/SYM/X/INTJ）。
- モデルは `fr_core_news_sm`。

**Step 2: venv 準備**
```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-fr
python3 -m venv tools/.venv
tools/.venv/bin/pip install edge-tts spacy click
tools/.venv/bin/python -m spacy download fr_core_news_sm
```
> `click` を明示するのは、Python 3.14 環境で typer が click を引き込まず `spacy download` が `ModuleNotFoundError: click` で落ちた実績があるため。

**Step 3: 精度テスト（合否のゲート）**

`tests/` ではなく手動スクリプトでよいが、**必ず実測して記録する**:
```bash
tools/.venv/bin/python - <<'PY'
import importlib.util
spec=importlib.util.spec_from_file_location('cv','tools/check_vocab.py')
cv=importlib.util.module_from_spec(spec); spec.loader.exec_module(cv)
from pathlib import Path
allowed=cv.load_lemmas(Path('data/A1/words.json'))
allowed|={l.strip().lower() for l in Path('tools/function_words_fr.txt').read_text().split() if l.strip()}
ac=set()
for a in allowed: ac|=cv.canon_forms(a)
ok=lambda t:(t.lower() in allowed) or bool(cv.canon_forms(t.lower())&ac)
# A1 語彙の正当な実現形 → すべて True であること
inflected=['parle','parles','parlent','parlé','grande','grands','grandes','maisons',
           'journaux','vais','allons','est','sont','ai','ont','fait','peux','veut','école','écoles']
# A1 外の語 → すべて False であること
oov=['développement','entreprise','néanmoins','parvenir','ainsi','toutefois']
print('inflected pass:',sum(map(ok,inflected)),'/',len(inflected),[w for w in inflected if not ok(w)])
print('oov flagged  :',sum(1 for w in oov if not ok(w)),'/',len(oov),[w for w in oov if ok(w)])
PY
```
**基準:** 正当な実現形は**全件 True**、A1 外の語は**大半 False**。満たないうちは Phase 6 に進まない。残った限界は `tools/sentence_pipeline.md` に明記する。

**Step 4:** commit `feat(fr): French-morphology spiral vocabulary check + accuracy notes`。

---

### Task 16: `tools/sentence_pipeline.md` をフランス語 A1 天井に書き換え

蘭語版を土台に、以下を定義する（典拠: Référentiel A1 / DELF A1）。

**0. スパイラル語彙規則** — A1 例文は「A1 見出し語（＋その `plural`・活用形）＋機能語 allowlist＋固有名詞・数詞」のみ。`check_vocab.py` で決定的にゲート。

**1. A1 の天井（超過禁止）**
- **時制:** 直説法現在（présent）が中心。**複合過去（passé composé）は avoir/être ＋ ごく一般的な動詞に限り控えめに可**。**近接未来（aller + 不定詞）可**。命令法の基本形可。
  - **禁止:** 半過去（imparfait）／単純未来（futur simple）／条件法／接続法／単純過去（passé simple）／大過去。
- **語順・否定:** 平叙は SVO。否定は `ne … pas`（口語の `pas` 単独は避ける）。
- **疑問:** イントネーション疑問・`est-ce que`・基本の倒置（`Parlez-vous …?`）。疑問詞 `qui / que / où / quand / comment / combien / pourquoi`。
- **冠詞:** 定・不定・**部分冠詞（du, de la, des）**可。
- **形容詞:** **性数一致を必ず正しく**（`une grande maison` / `des livres verts`）。位置は原則**名詞の後**、ただし BAGS（beau, âge, bon/mauvais, grand/petit 等の短い常用語）は前置可。**比較級・最上級は禁止**（`plus grand que` / `le plus` 不可）。
- **代名詞:** 主語代名詞。**直接・間接目的語代名詞（le/la/les/lui/leur）の多用は避ける**（A2 域）。`y` / `en` は禁止。
- **禁止（A2 以上）:** 関係節（`qui` / `que` を関係代名詞として使う節）、受動態、代名動詞の複雑な用法（基本の `se lever` 程度は下記例外表に従う）、ジェロンディフ（`en faisant`）。
- **長さ:** 3〜8語（句読点を除く）。対象見出し語を必ず含む。
- **エリジオン・アポストロフィを正しく書く**（`j'ai` / `l'école` / `qu'est-ce que` / `d'accord`）。

**2. 見出し語の自己使用の例外（重要）**

見出し語自身が天井で禁止のカテゴリに属する場合、**その語の例文に限り**最小限の形で使用可。他の語の例文では禁止（独版が `möchte`、蘭版が `omdat`/`zich` に与えた例外と同じ扱い）。A1 で想定される具体例:

| 見出し語 | 天井上の問題 | 許す形（自己使用のみ） |
|---|---|---|
| `plus` / `moins` / `mieux` | 比較級を誘発 | 比較構文にせず単独の副詞用法に留める（`Je ne veux plus.`） |
| `qui` / `que` | 関係節を誘発 | **疑問詞用法のみ**（`Qui est-ce ?` / `Que fais-tu ?`） |
| `se`（代名動詞） | 代名動詞は A2 域 | 基本の日常動作のみ（`Je me lève à sept heures.`） |
| `y` / `en`（代名詞） | A1 天井で禁止 | 定型のみ（`Il y a un livre.` / `J'en ai un.`） |

**3. 出力スキーマ・生成プロンプト・検証プロンプト** — 蘭語版と同構成。生成プロンプトには必ず「**`ja` は常体**」「**使ってよい語は allowlist ファイルのみ**」「**性数一致とエリジオンを正しく**」を焼き込む。

**Commit:** `docs(fr): French A1 sentence ceiling + spiral rule + self-use exceptions`。

---

## Phase 6 — 例文生成（バッチ）

### Task 17: 許可語彙ファイルとバッチ分割

```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-fr
node -e "
const fs=require('fs');
const w=require('./data/A1/words.json');
const fn=fs.readFileSync('tools/function_words_fr.txt','utf8').split(/\s+/).filter(Boolean);
// 見出し語＋複数形＋機能語（複数形も入れて不規則複数の偽陽性を防ぐ）
const set=[...new Set([...w.map(x=>x.lemma),...w.filter(x=>x.plural).map(x=>x.plural),...fn])].sort();
fs.writeFileSync('tools/raw/a1_allowed.txt',set.join('\n')+'\n');
fs.mkdirSync('tools/raw/exgen',{recursive:true});
const todo=w.map(x=>({id:x.id,lemma:x.lemma,pos:x.pos,article:x.article||null,plural:x.plural||null,meanings:x.meanings}));
const S=50;for(let i=0;i*S<todo.length;i++)
  fs.writeFileSync('tools/raw/exgen/batch_'+String(i).padStart(2,'0')+'.json',JSON.stringify(todo.slice(i*S,(i+1)*S),null,1));
console.log('allowed:',set.length,'| batches:',Math.ceil(todo.length/S));
"
```
Expected: 約25バッチ（1247語 ÷ 50）。

**Commit:** `chore(fr): allowed-vocabulary contract + example generation batches`。

### Task 18: 1バッチで試写 → 全バッチ生成

**Step 1:** batch_00 だけ生成させ、`--no-audio` 検証と `check_vocab.py` を通す。**不自然な言い換えを強いられていないか報告させる**（ツール側の偽陽性が残っている兆候）。
**Step 2:** 問題なければ残りを並列生成（scratch 名はバッチ番号で一意に）。
**Step 3:** マージ＋検証
```bash
node tools/merge_exgen.mjs A1        # 蘭語版のツールがそのまま使える
node tools/validate_data.mjs A1 --no-audio
tools/.venv/bin/python tools/check_vocab.py A1
```
Expected: `✓ 1247 words valid` / `✓ A1 examples within spiral vocabulary`。
> `merge_exgen.mjs` は `tools/raw/<level>_examples.json` も読む実装。仏語では不要なので存在しなくても動く（`existsSync` ガードあり）。

**Step 4:** commit `data(fr): generate A1 examples (~2500 sentences)`。

---

## Phase 7 — 二段ゲート

### Task 19: 文法天井の独立レビュー（LLM・分割並列）

**Step 1:** 語を6スライスに分け、**生成していない別エージェント**に `sentence_pipeline.md` の天井で判定させる。チェック観点:
1. 天井超過（imparfait / futur simple / 条件法 / 接続法 / 関係節 / 受動 / 比較級 / `y`・`en` の乱用）。自己使用の例外表に該当するものは flag しない。
2. **形容詞の性数一致**（`une grande maison` / `des livres verts`）と**位置**。
3. **エリジオン・アポストロフィ**（`j'ai` / `l'école` / `d'accord`）と冠詞（le/la/les/du/de la/des）の正しさ。
4. 動詞の活用と主語一致。
5. 見出し語が各例文に実現しているか。
6. `ja`（常体か・自然か）／`en` の訳の正確さ。
- 出力は**問題のある文だけ** `id | fr | 分類 | 問題 | 修正案`。
- **修正案が許可語彙外の語を使っていないか**は次の Step で機械判定する（蘭語版でレビュアーが語彙外語を提案し、spaCy ゲートが弾いた実績あり）。

**Step 2:** 修正を `tools/raw/a1_fixes.json` に集約し `node tools/apply_fixes.mjs A1` で適用（蘭語版のツールを流用。`SPELLING` 配列は仏語では空にする）。

**Step 3: 両ゲートを再実行**
```bash
node tools/validate_data.mjs A1 --no-audio && tools/.venv/bin/python tools/check_vocab.py A1
```
Expected: 両方 green。**語彙外の修正案が混じっていればここで落ちる**ので、許可語彙内の表現に差し替える。

**Step 4:** commit `fix(fr): apply grammar-review fixes (N sentences)`。

---

## Phase 8 — 音声（edge-tts・fr-FR）

### Task 20: TTS スクリプトをフランス語に

**Files:** `tools/tts_lemma.py`, `tools/tts_generate.py`

**Step 1:** 両ファイルの `VOICE` を `"fr-FR-DeniseNeural"` に。
**Step 2:** `tts_generate.py` の合成対象フィールドを `e["nl"]` → `e["fr"]` に。`boundary="WordBoundary"` は**維持**（無いと `timing` が空になりカラオケが壊れる）。
**Step 3:** `tts_lemma.py` の `speakable()` は**エリジオンを付けずに見出し語単体**を読ませる（`maison` を「la maison」ではなく「maison」と発音）。蘭語版のまま可。
**Step 4:** commit `feat(fr): TTS uses fr-FR-DeniseNeural, reads fr field`。

### Task 21: 音声生成（約1247＋2500クリップ）

**Step 1: 逐次実行（両スクリプトが words.json を書くので並列不可）＋デタッチ**
```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-fr
LOG=/tmp/fr-tts.log
nohup sh -c 'tools/.venv/bin/python tools/tts_lemma.py A1 && tools/.venv/bin/python tools/tts_generate.py A1; echo "ALLDONE rc=$?"' > "$LOG" 2>&1 &
```
> 前景実行はツールのタイムアウト（10分）で殺される。**デタッチして完了を待つ**。両スクリプトは再開可能（既存 mp3 はスキップ）。

**Step 2: 完了確認**
```bash
tail -3 /tmp/fr-tts.log            # done: made=..., failed=0 → ALLDONE rc=0
node tools/validate_data.mjs A1    # --no-audio 無し = audio/timing 必須
```
Expected: `✓ 1247 words valid`。

**Step 3: 音声ファイルの実在確認**（validator はフィールドしか見ない）
```bash
node -e "
const fs=require('fs');const a=require('./data/A1/words.json');
let ml=0,me=0;
for(const w of a){ if(!fs.existsSync('data/A1/'+w.lemmaAudio))ml++;
  for(const e of w.examples) if(!e.audio||!fs.existsSync('data/A1/'+e.audio))me++; }
console.log('missing lemma audio:',ml,'| missing example audio:',me);
"
```
Expected: 両方 0。

**Step 4:** commit `data(fr): generate A1 lemma + example audio (fr-FR)`。

---

## Phase 9 — ホーム登録と総合検証

### Task 22: ルート `js/content.js` にカード追加

**Files:** `js/content.js`（リポジトリ直下）

`vocabulary-nl` カードの直後に追記:
```js
{
  id: "vocabulary-fr",
  label: "単語（仏）",
  kind: "app",
  href: "apps/vocabulary-fr/",
  tagline:
    "フランス語 A1 単語のフラッシュカード（Leitner）＋ネイティブ音声＋例文（スパイラル）＋進捗トラッキング。",
},
```
`node --test tests/*.test.js`（ルート）が green のまま → commit `feat: add Français vocabulary app card to home launcher`。

### Task 23: 総合検証

**Step 1: テストとゲート**
```bash
cd /Users/soma/Documents/GitHub/study-deutsch/apps/vocabulary-fr
node --test                                    # slug / elision / parse_flelex / parse_lexique / srs / stats / session
node tools/validate_data.mjs A1
tools/.venv/bin/python tools/check_vocab.py A1
```

**Step 2: ブラウザで手動確認** — 直下 `./serve.sh` → `http://localhost:8000/`
- [ ] 「単語（仏）」カード → `apps/vocabulary-fr/` に遷移。
- [ ] **レベルタブは A1 のみ**（A2 タブが出ていないこと）。
- [ ] フラッシュカード表: **`l'école` のようにエリジオンが正しく表示**される（`la école` になっていない）。
- [ ] 裏: 意味(ja/en)・品詞・複数形・例文（fr/ja/en）＋▶でカラオケ再生とハイライト。
- [ ] 「読むだけ」で全1247語＋検索（仏語/日本語/英語/例文）。
- [ ] 見出し語 ▶ でフランス語音声。
- [ ] ワードマーク `FRANÇAIS A1`、localStorage キー `francais-vocab-v1`（DevTools で確認）。
- [ ] console error 0。

**Step 3: a11y** — `/web-design-guidelines`（コントラスト4.5:1 / `:focus-visible` / 44px / aria / reduced-motion / 横スクロール無し / emoji アイコン不使用）。

**Step 4: 既存アプリの無変更を確認**
```bash
cd /Users/soma/Documents/GitHub/study-deutsch
git diff --name-only main...HEAD -- apps/vocabulary/ apps/vocabulary-nl/ | wc -l    # 0 であること
```

---

### Task 24: changes-log と PR

**Step 1:** `apps/vocabulary-fr/docs/plans/changes-log.md` を新規作成し、語彙ソース（FLELex/Lexique383）・語数・検証結果・**Task 10 Step 3 の頻度クロスチェックで分かった事実**・既知の限界を記録する。

**Step 2:** REQUIRED SKILL `ship-pr`。issue を先に作り（このリポジトリは PR 本文の先頭に `Closes #<N>` が必須）、`feat/vocabulary-fr` → `main`。PR 要約は3行以内。確認方法に Task 23 のチェックリストを使う。

---

## まとめ（DRY / YAGNI / TDD）

- コアの SRS・セッション・統計・ダッシュボード・flashcard・reader は**コピーのまま流用**（3コピー目。共通バグ修正は3アプリ適用が必要な点を changes-log に注記）。
- フランス語固有の新規実装は **(1) 合字対応スラッグ / (2) エリジオン表示（`tools/elision.mjs` ＋ `js/elision.js`）/ (3) フランス語形態論の `check_vocab.py` / (4) 2つのソースパーサ** の4点。すべてテスト先行。
- **例文生成の前に**検証ツールの精度を実測して通す（蘭語版で検証ツールの偽陽性が例文の質を下げた反省）。
- **語彙リストを確定してから**例文を生成する（後から語を足すと再生成が必要になる）。
- 生成プロンプトに「常体」「許可語彙のみ」「性数一致・エリジオン」を最初から焼き込む。
- `LEVELS` はデータのあるレベルのみ。並列エージェントの scratch 名は一意に。
- こまめにコミット。`apps/vocabulary/`・`apps/vocabulary-nl/` には触れない。
