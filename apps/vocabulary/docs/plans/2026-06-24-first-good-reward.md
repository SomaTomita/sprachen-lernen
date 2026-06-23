# 2026-06-24 — 初回 good の扱い見直し（#16 follow-up）

## 背景
#16 で「初回提示の good は graduation させない（box1 据置・翌日再提示）」を入れた。
しかし初回の `good`(覚えた) と `fuzzy`(まぁまぁ)・`forgot`(忘れた) が横並び（全部 box1・翌日 +1）になり、
**「覚えた」を選んでも得が無い**。fuzzy より上の評価なのだから、初回 good は次の復習に出づらくしたい。

## 決定（ユーザー選択）
初回 good も **箱2へ昇格（+2日）** にする＝#16 の初回 non-graduation ゲートを撤回し、good は常に box+1。
- 初回 fuzzy → box1（+1日, 翌日）
- 初回 forgot → box1（+1日, 翌日）
- 初回 good → box2（+2日, 翌日には出ない＝「出づらい」）
- 以降 good → box3(+4) → box4(+8) → box5(+16)。箱5(習得)まで good ×4。

「一発で完全習得」ではない点は箱5(習得)に複数回の good を要する設計で担保される（box2 は習得ではない）。

## 変更内容
- `js/srs.js`: `review()` の good 分岐を `box = min(card.box+1, MAX_BOX)` に戻す（timesSeen 条件を撤去）。
- `tests/srs.test.js`: 初回 good 系のテストを box2/+2 に更新（多日シミュレーションは 2→3→4→5）。
- session.js の minNew ポリシー（死のスパイラル対策, #16）は不変。

## 影響しない点
- fuzzy（据置）・forgot（box1）・箱間隔（1/2/4/8/16）・dueDay 計算・localStorage スキーマは不変。
- 新規語が毎日最低 `MIN_NEW_PER_DAY` 出る保証（#16）は不変。
