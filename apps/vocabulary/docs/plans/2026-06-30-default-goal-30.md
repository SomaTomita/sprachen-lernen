# 2026-06-30 — 既定の1日学習目標を 30 にする (#28)

## 目的
1回のフラッシュカードで出す枚数（＝`dailyGoal`、復習＋新規の合計）の既定値を 20 → 30 に上げる。

## 変更内容
- `js/storage.js`: `GOAL_DEFAULT = 20` → `30`。

## 妥当性
- セッションサイズは `planSession`/`buildSession` で `total ≤ clampGoal(dailyGoal)`。既定が 30 になると新規状態で最大 30 語。
- 30 は `GOAL_MIN(10)〜GOAL_MAX(100)`・設定UIの `step=5` に適合。
- `tests/session.test.js` はローカル定数 `GOAL=20` を使い `GOAL_DEFAULT` を参照しないため影響なし。

## 影響しない/対象外
- 既に localStorage に `dailyGoal` を保存済みのユーザーは保存値が優先（遡及しない）。アプリ内「1日の学習目標」設定で変更可能。
- `GOAL_MIN`/`GOAL_MAX`/step、SRS ロジック、スキーマは不変。
