# 進捗トラッキング（到達度・1日の目標・日次履歴）Implementation Plan

> **For Claude:** 素の JS（ビルドなし）。localStorage のみ（DB不要）。BMW意匠（`docs/design/bmw-corporate-automotive.md`）・既存機能（SRS・カラオケ・読むだけ・再生ロック）を保つ。`js/srs.js` と `tests/srs.test.js` は変更しない（純関数性・12テスト維持）。

**Goal:** A1 の到達度（習得率を見出しに）・1日の学習目標（新規＋復習の合計、10〜100で設定可）に対する達成・日付ごとの学習量履歴を記録/表示する進捗ダッシュボードを追加する。

**Architecture:** すべて localStorage（キー `deutsch-vocab-v1`）に格納。設定 `dailyGoal` と日次ログ `history` を追加。集計は純関数 `js/stats.js`（テスト付き）。セッションは「due 全件＋目標到達まで新規を補充」。

**Tech Stack:** HTML/CSS/Vanilla JS (ES Modules), localStorage, node:test。

---

## データモデル（localStorage `deutsch-vocab-v1`・後方互換で field 追加）
```jsonc
{
  "cards": { "<id>": { "box":1, "dueDay":0, "lastReviewedDay":null, "timesSeen":0, "timesGood":0 } },
  "settings": { "level":"A1", "dailyGoal": 20 },        // dailyGoal: 10–100, 既定20（新規＋復習の合計/日）
  "history": { "2026-06-21": { "new": 12, "review": 8 } } // 日付ごとの学習量
}
```
- 既存ステートに `dailyGoal`/`history` が無ければ既定で補完（マイグレーション不要）。総語数は `words.length`（786）を使い、ハードコードしない。

## 指標の定義（`js/stats.js` 純関数）
- **習得率（見出し）** `masteryRate = (timesSeen>0 && box>=5 の語数) / total`
- **加重カバレッジ** `weightedCoverage = Σ(timesSeen>0 ? box : 0) / (total * MAX_BOX)`
- **学習開始率** `startedRate = (timesSeen>0 の語数) / total`
- **箱分布** `boxDistribution = {1..5: 学習済みのうち各箱の語数, unseen: 未学習数}`
- **今日の実績** `todayCount(history, dayKey) = (h.new + h.review) || 0`
- **ストリーク** `currentStreak(history, todayKey)` = 今日（未実施なら昨日）から遡って連続して活動のある日数。

---

### Task 1: 集計の純関数 `js/stats.js` ＋ `tests/stats.test.js`（TDD）
**Files:** Create `js/stats.js`, `tests/stats.test.js`
- `masteryCount/masteryRate`, `weightedCoverage`, `startedRate`, `boxDistribution`, `todayCount`, `currentStreak` を純関数で実装（引数: cards配列 or map, total, history, dayKey, MAX_BOX=5）。日付に依存する処理は dayKey 文字列を引数で受ける（決定論テスト）。
- テスト: 既知の cards/history で各指標を検証。ストリークは「今日有・連続」「今日無・昨日有（継続中扱い）」「ギャップで途切れ」を網羅。
- `node --test` が **srs(12)＋stats** すべて green。

### Task 2: storage 拡張 `js/storage.js`
**Files:** Modify `js/storage.js`
- 既定 `settings.dailyGoal = 20`（読み込み時 10–100 にクランプ）。`history` 既定 `{}`。
- `dayKey(date=new Date()) -> "YYYY-MM-DD"`（ローカル）を追加。
- `recordActivity(state, isNew, date=new Date())`: `state.history[dayKey]` の `new` or `review` を+1（イミュータブルに新オブジェクトを返すか、呼び出し側で保存）。
- `setDailyGoal(state, n)`（10–100 クランプ）。

### Task 3: セッションの目標ロジック ＋ 履歴記録（`js/main.js`, `js/flashcard.js`）
**Files:** Modify `js/main.js`, `js/flashcard.js`（`js/srs.js` は不変）
- セッション構築: `due = cards.filter(isDue).length`; `newToIntroduce = clamp(dailyGoal - due, 0, dailyGoal)`; `selectSession(cards, today, newToIntroduce, rng)`（既存シグネチャ流用）。
- フラッシュカードの `rate()`: 評価直前の `card.timesSeen===0` で **新規/復習を判定**し、`recordActivity(state, isNew)` → `saveState`。その後 `review()`。
- ホームの「本日の学習」表示を「目標 `dailyGoal` に対する due＋新規の構成・実績」に更新。

### Task 4: 進捗ダッシュボード ＋ 設定 ＋ ナビ（`js/main.js` または新 `js/dashboard.js`）
**Files:** Modify `js/main.js`（必要なら `js/dashboard.js` 追加）, `index.html` ナビは main.js が描画
- ナビに「進捗」を追加（ホーム / 進捗 / フラッシュカード / 読むだけ）。
- ダッシュボード内容（BMW意匠）:
  - **到達度（見出し）**: 習得率を大きく（`display-lg`）。下に 加重カバレッジ・学習開始率 を `spec-cell` 風に併記。
  - **箱分布**: 箱1..5＋未学習の本数バー（BMW blue 濃淡、0px、影なし）。
  - **今日**: 目標 `dailyGoal` / 実績（new+review）。進捗バー。残り新規。
  - **ストリーク**: 連続日数。
  - **履歴（コントリビューショングラフ）**: 直近 ~12週(84日)の日セルを学習量で青濃淡に。0=hairline、少=淡青、多=濃青。下に直近数日の「日付: 新規n・復習m」一覧も。
  - **設定**: `dailyGoal` を 10–100 で変更（`<input type="number" min=10 max=100 step=5>` か range＋label）。変更で即保存・表示更新。
- 既存ステートに history が無くても箱分布/到達度は cards から算出（過去ログが無いだけ）。

### Task 5: CSS（`css/styles.css`）
**Files:** Modify `css/styles.css`
- ダッシュボードの stat カード、進捗バー、箱分布バー、コントリビューショングラフ（grid のセル）、設定コントロールを BMW で（白/canvas・hairline・0px・**影なし**・BMW blue 濃淡・Inter 700/300）。a11y: コントラスト4.5:1、`:focus-visible`、44px、`prefers-reduced-motion`、レスポンシブ（mobile 1列、横スクロール無し）、グラフは色だけでなく数値/`title`/`aria-label` も。

### Task 6: 検証
- `node --test` → srs(12)＋stats 全 green。
- `node tools/validate_data.mjs A1` → ✓ 786。
- `grep -rIn -E "periwinkle|halftone|carbon|chamfer|nintendo|chrome-indigo|📖|🎉|☰" css js index.html` → 0。
- Playwright（`python3 -m http.server 8000`）: フラッシュカードで数語評価→**localStorage の history に当日 new/review が加算**・到達度/箱分布/今日の実績/ストリークが更新表示。`dailyGoal` を変更→保存され、ホーム/ダッシュボードに反映。desktop1280/mobile390 横スクロール無し・コンソールエラー0。ダッシュボードのスクショ（desktop/mobile）を scratchpad に保存。サーバ終了。

---

## 完了の定義
- [ ] 到達度（習得率を見出し＋加重カバレッジ＋学習開始率）と箱分布を表示
- [ ] 1日の目標 `dailyGoal`（10–100）設定可、セッションは「due 全件＋目標まで新規補充」
- [ ] 今日の実績（new+review）・目標達成・ストリーク
- [ ] 日付ごとの学習量を `history` に記録しコントリビューショングラフ＋一覧で表示
- [ ] localStorage のみ（DB不要）。`node --test` 全green / validate 786 / grep0 / 横スクロール無し・a11y
