# 読むだけ刷新 ＋ 単一再生ロック ＋ 見出し語発音 Implementation Plan

> **For Claude:** 素の JS（ビルドなし）。`js/srs.js` と `tests/` は触らない。BMW 意匠（`docs/design/bmw-corporate-automotive.md`）・カラオケ・アクセシビリティを保つ。

**Goal:** 読むだけモードを「クリック不要で各語の意味＋全例文がインライン表示される読み物」に作り替え、音声を単一再生ロック化し、見出し語（単体）の発音再生をフラッシュカード表と読むだけに追加する。

**Architecture:** 既存の `playKaraoke`（例文）に加え、`audio.js` にページ全体で単一再生を保証するロック（再生中は全 `.button-play` を無効化、終了で復帰）と、見出し語再生ヘルパ `playLemma`（`word.lemmaAudio` があればそれを再生、無ければ Web Speech フォールバック）を実装。見出し語音声は `tools/tts_lemma.py`（edge-tts）で事前生成し `words.json` に `lemmaAudio` を付与。

**Tech Stack:** HTML/CSS/Vanilla JS (ES Modules), `<audio>`, Web Speech API（フォールバック）, Python edge-tts（事前生成）。

---

### Task 1: 見出し語音声の事前生成（`tools/tts_lemma.py`）

**Files:** Create `tools/tts_lemma.py` / Modify `data/A1/words.json`（`lemmaAudio` 付与）/ Create `data/A1/audio/lemma/*.mp3`

- 各 `word.lemma`（語幹末尾の `-` は除去、複合/多語はそのまま）を edge-tts `de-DE-KatjaNeural` で合成 → `data/A1/audio/lemma/<id>.mp3`、`word.lemmaAudio = "audio/lemma/<id>.mp3"`。
- リトライ＋失敗継続＋定期保存（`tts_generate.py` と同方針）。再実行で途中再開可。
- 検証: `ls data/A1/audio/lemma/*.mp3 | wc -l` がほぼ語数、`words.json` に `lemmaAudio` が入る。`validate_data.mjs` は lemmaAudio を必須にしない（best-effort＋Web Speech フォールバックのため）。

### Task 2: 単一再生ロック ＋ 見出し語再生（`js/audio.js`）

**Files:** Modify `js/audio.js`（必要なら `css/styles.css` に `.is-playing` / disabled 表示）

- モジュール状態 `currentAudio` と `setPlaybackLock(on)` を追加。`setPlaybackLock(true)` で `document.querySelectorAll('.button-play')` を `disabled=true`＋`aria-disabled`、再生中ボタンに `.is-playing`（▶→⏸ 表示・`aria-label` を「再生中」に）。`ended`/`error`/`pause` で `setPlaybackLock(false)` し復帰。
- 新規再生開始時は `currentAudio` を停止してから（多重再生防止）。
- `playKaraoke(level, example, spans, {button})` は再生ボタン要素を受け取り、上記ロックを適用。
- 新規 `playLemma(word, {button})`: `word.lemmaAudio` があれば `new Audio(\`data/A1/${word.lemmaAudio}\`)` を同じロックで再生、無ければ `speakLemma(word.lemma)`（Web Speech, `de-DE`）。Web Speech 中も可能なら `onstart/onend` でロック。
- `prefers-reduced-motion` でもカラオケ rAF は機能として維持。

擬似コード（ロック）:
```js
let currentAudio = null;
function lockPlay(on, activeBtn) {
  document.querySelectorAll('.button-play').forEach(b => {
    b.disabled = on && b !== activeBtn ? true : (on ? true : false);
    b.setAttribute('aria-disabled', String(b.disabled));
  });
}
```
（実装では「再生中は全ボタン disabled、active は .is-playing 表示」を満たすこと。）

### Task 3: 読むだけを読み物リストに（`js/reader.js` + `css`）

**Files:** Modify `js/reader.js`, `css/styles.css`

- 「一覧→クリック→最下部に詳細」を廃止。**各語をインライン展開した縦リスト**にする:
  - カード: 見出し語（名詞は `article` 付き）・`plural`・品詞・意味（JA/EN すべて）。
  - その下に**全例文**を inline 表示: de（カラオケ spans）＋ ▶（例文音声）＋ ja/en 訳。
  - 見出し語の隣に ▶（`playLemma`）を置き、単体発音を再生可能に。
- 上部に検索（`text-input`）＋ヒット件数（`aria-live`）＋空状態。検索は語・意味・例文文字列にヒット。
- パフォーマンス: 各カードに `content-visibility:auto; contain-intrinsic-size: auto 220px`。DocumentFragment で構築。スクロール位置を勝手に飛ばさない。
- BMW 意匠（canvas/surface-card・hairline・0px・影なし）。

### Task 4: フラッシュカード表で見出し語発音（`js/flashcard.js`）

**Files:** Modify `js/flashcard.js`

- カード表（めくる前）の見出し語の近くに ▶（`aria-label="発音を再生"`）を追加し `playLemma(word)` を呼ぶ。**クリックはカードのめくり操作と競合させない**（▶ の onclick で `event.stopPropagation()`）。
- めくった後の例文 ▶ は従来どおり（ロック適用）。

### Task 5: 検証

- `node --test` → 12 pass（srs 未変更）。
- `node tools/validate_data.mjs A1` → ✓ 786。
- `grep -rIn -E "periwinkle|halftone|carbon|chamfer|nintendo|chrome-indigo|📖|🎉|☰" css js index.html` → 0。
- Playwright（`python3 -m http.server 8000`）: 読むだけが**クリックなしで意味＋全例文表示**／詳細が最下部に飛ばない／見出し語▶で発音／例文▶でカラオケ。**再生中は他▶が disabled→終了で復帰**を assert。フラッシュカード表の見出し語▶が動作（めくりと競合しない）。desktop1280/mobile390 横スクロール無し、コンソールエラー0。

---

## 完了の定義
- [ ] 読むだけ: クリック不要で各語の意味＋全例文がインライン表示、詳細が最下部に飛ばない
- [ ] 見出し語単体の発音（フラッシュカード表・読むだけ）が再生できる（edge-tts、無い語は Web Speech）
- [ ] 音声単一再生ロック（再生中は他▶不可、終了で復帰）
- [ ] `node --test` 12 pass / `validate_data.mjs A1` 786 / nintendo・emoji grep 0
- [ ] desktop/mobile 横スクロール無し・コンソールエラー0・BMW 意匠維持
