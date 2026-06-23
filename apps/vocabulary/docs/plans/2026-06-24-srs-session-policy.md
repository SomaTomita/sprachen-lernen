# 2026-06-24 — SRS セッション選定の見直し（新規枠の確保・古い順バックログ・初回非graduation）

## 背景 / 問題
実データで「ある日、新規が一切出ず復習だけ」になった（history: 06-24 = new 0 / review 18）。

原因は2つ:
1. **新規が `max(0, goal − due)` で、復習が goal に達すると新規が 0 に絞られる**（`session.js`）。
   間隔1日のカードが溜まると goal を埋め切り、新規語の導入が止まる「死のスパイラル」。
2. **未消化のやり残しが翌日へ無制限に繰り越し**、due を押し上げる（出題上限が無い）。

加えて、現行 `srs.js` は **初回 good で即 box+1（間隔2日）** に飛ぶ。「一発で覚えた」は実際には起きにくく、初回提示で長期間隔へ送るのは忘却曲線として不適切。

当初要件（`2026-06-21-vocabulary-app-design.md` 7章「忘却曲線」）：「`dueDate ≤ 今日` を優先出題＋新規を毎日導入」。現行実装はここから逸脱していた。

## 決定（ユーザー合意済み）
- 新規は **ハイブリッド**: `new = max(minNew, goal − due)`、復習は `goal − newCount` で頭打ち。
- 期限超過は **古い順（FIFO）** に上限まで出題。残りは翌日へ。
- **初回提示の good は graduation させない**（新語は box1・1日のまま、2回目以降の good で間隔が伸び始める）。
- `minNew` 既定 = **5**（定数。settings 化は将来スコープ）。

## 変更内容

### 1. `js/srs.js` — 初回 non-graduation ゲート（純関数）
`review()` の good 分岐のみ変更:
```
good: box = (card.timesSeen === 0) ? 1 : min(card.box + 1, MAX_BOX)
```
- 初回（timesSeen 0→1）は good でも box1 据え置き＝間隔1日＝翌日また出る。`timesGood` は加算。
- 2回目以降の good は従来どおり box+1。fuzzy（据置）・forgot（box1）は不変。
- 帰結: 全ての新語が最低1回は翌日再提示される。box5（習得）到達には 5回の good が必要になり、「一発習得」を排除。
- `selectSession` は新ポリシーを表現できず不要になるため**撤去**（`shuffle` 等の素プリミティブは維持）。

### 2. `js/session.js` — 選定ポリシーを集約
```
export const MIN_NEW_PER_DAY = 5;

planSession(cards, today, dailyGoal, minNew = MIN_NEW_PER_DAY)
  → { dueAvail, freshAvail, newCount, reviewCount, total }
    reserve     = min(minNew, goal)
    newCount    = min(max(reserve, goal − dueAvail), freshAvail, goal)
    reviewCount = min(dueAvail, goal − newCount)
```
- `buildSession`: due を **dueDay 昇順→id** で並べ先頭 `reviewCount` 件（古い順FIFO）、未学習を shuffle して `newCount` 件、最終キューを shuffle（選定は決定論・表示順はランダム）。
- `dueCount` は据置（期日到来の総数＝バックログ表示用）。`newToIntroduce` は撤去し `planSession` に一本化。

挙動（goal=20, minNew=5）: due20→新規5/復習15、due18→5/15(3繰越)、due8→12/8、due0→20/0、未学習0→0/復習20。

### 3. 表示の整合（実際に出る数に合わせる）
- `js/main.js` renderHome / renderNav、`js/dashboard.js` を `planSession()` 起点に。
- ヒーロー文言を「復習 N・新規 M（目標 G）。期限超過は古い順、新規は毎日最低5語を確保」に修正。

### 4. テスト
- `tests/session.test.js`（新規）: planSession 各分岐、buildSession の古い順キャップ・決定論。
- `tests/srs.test.js`: `selectSession` の2テスト撤去、**初回 good 非graduation** テスト追加。
- `node --test` green 必須。

## 影響しない点
- 箱の間隔（1/2/4/8/16）・dueDay 計算・fuzzy/forgot 挙動は不変。
- localStorage スキーマ不変＝マイグレーション不要。
- データ（words.json/音声）不変。
