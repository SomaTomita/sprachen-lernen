# Match スピーカー伝播バグ修正 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** マッチング問題（match）で、ドラッグ/タップ配置したトークンの音声（スピーカー）をタップしてもトークンが外れず、配置を保ったまま発音を確認できるようにする。

**Architecture:** トークンは `<button draggable>`。その内側にスピーカー `<button class="ex-speak">` がネストされている。スピーカーの `click` を `stopPropagation` で止め、親トークンの `click` ハンドラ（`pickUp` / `vacateSlot`）へ伝播させない。1 行の修正。

**Tech Stack:** 素 HTML/CSS/JS（ES Modules）・ビルド無し・依存ゼロ。テストは `node --test`。Issue: #19。

---

## 背景・原因

`js/quiz.js`:

- `renderMatch()` の `makeToken(value)` がトークン `<button>` を作り、末尾に `maybeSpeak(value)`（= スピーカー `<button>`）を **子として append**（L500–501）。
- `speakButton()` の click は `speak(text)` を呼ぶだけで **伝播を止めていない**（L16）。
- トークン `<button>` 自身にも click ハンドラがある（L613–624）:
  - スロット内のトークン → `vacateSlot(slot)`（bank に戻す）
  - bank のトークン → `pickUp(token)`
- よって配置済みトークンのスピーカーを押すと、click がトークンへ伝播し `vacateSlot` が走ってトークンが bank に戻る。bank のトークンでは誤って `pickUp` される。キーボード（Enter/Space）起動も同じ click 経路。

他のタイプのスピーカー配置は親に click ハンドラを持たない（choice はスピーカーを label の外＝兄弟に置く設計、answer/free/table/left セルは span 内）。よって **`speakButton` 側で一律に伝播を止めるのが最小かつ安全**。

## テストについて（正直な前提）

このバグは **DOM のイベント伝播**で、純関数ではない。本リポジトリは**依存ゼロ**方針（jsdom 等を入れない）で、`node --test` の対象は `grade.js` 等の純関数のみ。したがって本修正に対する自動ユニットテストは追加しない（依存追加は方針違反）。回帰防止は **既存 `node --test` の green 維持**＋**手動動作確認**で担保する。

---

### Task 1: スピーカー click の伝播を止める

**Files:**
- Modify: `apps/grammar-exercises/js/quiz.js`（`speakButton`, L13–18）

**Step 1: 既存テストが green であることを確認（ベースライン）**

Run: `cd apps/grammar-exercises && node --test`
Expected: PASS（`fail 0`）

**Step 2: 最小実装（`speakButton` の click で `stopPropagation`）**

Before:
```js
function speakButton(text) {
  const btn = el("button", { type: "button", class: "ex-speak", "aria-label": `「${text}」を発音` });
  btn.innerHTML = ICON_SPEAKER;
  btn.addEventListener("click", () => speak(text));
  return btn;
}
```

After:
```js
function speakButton(text) {
  const btn = el("button", { type: "button", class: "ex-speak", "aria-label": `「${text}」を発音` });
  btn.innerHTML = ICON_SPEAKER;
  btn.addEventListener("click", (e) => {
    // スピーカーはトークン<button>等の内側に入りうる。click を親へ伝播させると
    // 配置済みトークンが vacateSlot で外れる/ bank トークンが pickUp される（#19）。
    e.stopPropagation();
    speak(text);
  });
  return btn;
}
```

**Step 3: テスト再実行（回帰なし）**

Run: `cd apps/grammar-exercises && node --test`
Expected: PASS（`fail 0`・件数は据え置き）

**Step 4: 手動動作確認（a11y 含む）**

`./serve.sh` → match を含むレッスン（例 `/apps/grammar-exercises/?lesson=03`）で:
1. トークンをスロットへ **ドラッグ**配置 → そのトークンのスピーカーを **タップ** → 音が鳴り、**トークンはスロットに残る**（外れない）。
2. 同じトークンのスピーカーを **Enter/Space** で起動 → 同上（外れない）。
3. **bank** のトークンのスピーカーをタップ → 音が鳴るが **pickUp されない**（選択状態にならない）。
4. 配置 → 全スロット充足で従来どおり自動採点される（採点ロジックに影響なし）。
5. 横スクロール無し・フォーカスリング維持（`/web-design-guidelines`）。

**Step 5: Commit**

```bash
git add apps/grammar-exercises/js/quiz.js apps/grammar-exercises/docs/plans/2026-06-24-match-speaker-stoppropagation.md
git commit -m "fix: stop speaker tap from dislodging placed match token (#19)"
```

---

## 検討した代替案
- **スピーカーをトークン `<button>` の外（兄弟）へ移す**: button-in-button の無効 HTML も解消できるが、DOM 構造＋CSS レイアウトの変更が必要で影響範囲が広い。今回はバグ修正に絞り、構造リファクタは別 issue とする（surgical change）。
