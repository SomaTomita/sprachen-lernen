# 設計: 文法練習アプリ (apps/grammar-exercises)

作成日: 2026-06-22 / 状態: 承認済み（実装計画は別途 writing-plans で作成）

## 目的

`content/grammar/` の各文法レッスン（解説）に対応する**インタラクティブな練習問題**を提供する。
解説を読んだあと、同じレッスンの内容で問題を解いて復習できる状態をつくる。トラッキング（進捗保存）はしない ──「問題を解いて、その場で答え合わせ・解説を得る」ことに集中する。

参照: [[no-npm-deps]] 方針（ビルド無し・素HTML/CSS/JS・オフライン・外部CDN禁止）を厳守。

## スコープ

- 対象: レッスン 01（人称代名詞と sein）と 02（動詞の現在人称変化）。
- 既存 `03-nomen-genus.md`（解説のみ・問題なし）は今回の問題化対象外。ただし後述の規約の最初の適用候補。
- **音声は今回スコープ外**。必要になれば後から edge-tts（`de-DE-KatjaNeural`、他アプリと同声）で追加する。`say`(macOS) は compact 音声しかなく質が劣り、プレミアム音声は再配布がグレーなので採用しない。

## 配置（独立アプリ）

「docs=リーダー / app=対話的」というリポジトリの既存分離に合わせ、練習問題は `apps/` の独立アプリにする。
解説は今までどおり `content/grammar/NN-*.md`（リーダー表示）に残す。

```
apps/grammar-exercises/
  index.html            エントリ（レッスン選択 → 問題。?lesson=01 で直接遷移も可）
  css/styles.css        BMW corporate-automotive 共通デザイン
  js/
    main.js             初期化・?lesson ルーティング・レッスン切替
    data.js             data/<lesson>.json の fetch
    grade.js            純関数（正規化・正誤判定）── テスト対象
    quiz.js             問題UIの描画・即時採点・フィードバック
  data/
    01.json             01-personalpronomen-sein.md に準拠した問題
    02.json             02-verben-praesens.md に準拠した問題
  tests/
    grade.test.js       採点純関数（node --test）
  README.md
  CLAUDE.md             このアプリの仕様
```

**ルート側の変更は最小**:

- `js/content.js` … ホームに「文法練習」カード追加（`kind:'app', href:'apps/grammar-exercises/'`）。
- `content/grammar/01,02-*.md` … 練習問題＋解答セクションを削除（解説と「よくある間違い」は残す）。末尾に「→ このレッスンの練習問題」リンクを追加。
- `js/markdown.js` / `js/router.js` / `js/reader.js` は**無改変**（問題はmarkdownでなくJSON、リンクは通常のmarkdownリンクで成立するため）。

## 復習しやすい相互リンク

- **ホーム → 練習**: 新カードから `apps/grammar-exercises/`。
- **解説 → 練習**: `content/grammar/01-*.md` 内に `apps/grammar-exercises/?lesson=01`（リーダーは root 配信なので root 相対でそのまま動く）。
- **練習 → 解説**: アプリ各レッスンに「← 解説を読む」= `../../#/grammar/personalpronomen`（01）/ `../../#/grammar/verben-praesens`（02）。アプリは実ファイル `apps/grammar-exercises/` なので `../../` で root のリーダールートへ。
- アプリ内: `?lesson=01` 深リンク＋レッスン切替で 01⇄02 を行き来。

## 問題は各 md に厳密準拠

問題は対応する md の論点だけで構成する（＝解説の復習になる）。

- `data/01.json` ← `01-personalpronomen-sein.md`: 人称代名詞6つ / sein の活用 / 同音の3つの sie / 人称代名詞は主語専用 / 語順V2・Ja-Nein疑問文・W-Fragen / よくある間違い。
- `data/02.json` ← `02-verben-praesens.md`: 規則語尾 e-st-t-en-t-en / 語幹 -t,-d で e を挟む / 語幹 -s,-ß,-z で du=er / 分離動詞 / 不規則 a→ä・e→i・e→ie / よくある間違い。

## 問題データ形式（5タイプ）

各問題は「解く前の軽い法則紹介 `rule`」と「解いた後の解説 `explain`（正解・不正解どちらでも表示・多論点）」を持つ。
`fill` は複数ブランクで 1 問に複数論点を載せる（語順・活用・大文字化を同時に問う等）。

```jsonc
{
  "lesson": "01",
  "title": "01 人称代名詞と sein",
  "doc": "../../#/grammar/personalpronomen",   // 「解説を読む」リンク先
  "exercises": [
    {
      "type": "fill",
      "prompt": "___ ___ Student?   (君は学生?)",
      "rule": "Ja/Nein疑問文は〈動詞 → 主語〉の語順。",
      "blanks": [{ "accept": ["Bist"] }, { "accept": ["du"] }],
      "explain": "① 疑問文は動詞 bist が文頭。② du 専用形は bist（×ist/×bin）。③ 文頭なので大文字 Bist。"
    },
    {
      "type": "choice",
      "prompt": "「君は学生?」にあたるのは?",
      "rule": "疑問文は動詞が先頭に立つ。",
      "options": ["Bist du Student?", "Du bist Student?", "Sind du Student?"],
      "answer": 0,
      "explain": "① Ja/Nein疑問文は動詞が文頭。② du の sein は bist（sind は wir/sie複/Sie）。"
    },
    {
      "type": "table",
      "prompt": "sein を埋めよう",
      "rule": "sein は不規則。sind は wir / sie(彼ら) / Sie(敬称) で共通。",
      "columns": ["人称", "sein"],
      "rows": [
        { "cells": ["ich", { "accept": ["bin"] }] },
        { "cells": ["wir", { "accept": ["sind"] }] },
        { "cells": ["ihr", { "accept": ["seid"] }] }
      ],
      "explain": "① bin/bist/ist/sind/seid/sind。② ihr だけ seid（sind と混同しやすい）。"
    },
    {
      "type": "transform",
      "prompt": "Ja/Nein疑問文に: Du bist Student.",
      "rule": "平叙文(動詞2番目)→疑問文は動詞を文頭へ。",
      "accept": ["Bist du Student?"],
      "explain": "① 動詞 bist を文頭へ。② 主語 du が続く。③ 文末は ? 。"
    },
    {
      "type": "free",
      "prompt": "和訳: 私はアンナです。",
      "rule": "名乗りは〈主語 + sein + 名前〉。",
      "answer": "Ich bin Anna.",
      "explain": "① ich の sein は bin。② 名前 Anna は大文字。自動採点せず模範解答で自己採点。"
    }
  ]
}
```

### タイプ別の挙動

| type | 入力 | 採点 |
|---|---|---|
| `fill` | ブランクごとにテキスト | 各 `accept` リストと正規化照合・即時 |
| `table` | 空セルごとにテキスト | 各セル `accept` と照合・即時 |
| `choice` | 選択肢を1つ | `answer`（index）一致・即時 |
| `transform` | 文を入力 | `accept`（複数可）と正規化照合・即時 |
| `free` | 自由入力 | 自動判定なし。「答えを見る」で `answer`＋`explain` 表示（自己採点） |

## 採点（純関数 grade.js）

- `normalize(s)`: trim・連続空白を1つに・小文字化・`ß↔ss` 許容。
- `isCorrect(input, acceptList)`: 正規化して受理リストのいずれかと一致で true。
- `transform`/`free` の文全体照合も同じ正規化を使う（句読点・大文字小文字の揺れを吸収）。
- `tests/grade.test.js` で担保（`node --test`）。`markdown.js` 同様、純関数はテストで守る。

## UI / フィードバック / a11y

- 解く前: `prompt` ＋ 小さく `rule`。
- 「チェック」後: 正誤を **SVGアイコン＋テキスト**（色のみに頼らない）で表示し、**必ず `explain`** を出す。不正解は正解を併記し「再挑戦」可。
- セッション内スコア（例「4/6」）は表示するが **localStorage 保存はしない**（トラッキングしない）。
- `aria-live` で正誤・解説を読み上げ。入力は `<label>` 紐付け。タッチ44px。`:focus-visible`。`prefers-reduced-motion` 尊重。横スクロール無し。
- デザイン正本 `docs/design/bmw-corporate-automotive.md`（白canvas / blue #1c69d4 / 0px矩形 / Inter 700・300 / ドロップシャドウ禁止）に従う。CSS は vocabulary からトークンを流用。

## ドキュメント / 規約（CLAUDE.md 2枚）

- `content/grammar/CLAUDE.md`（新規）… レッスン作成規約: **新しい文法レッスンは「md(解説) ＋ apps/grammar-exercises/data/NN.json(問題) ＋ js/content.js 登録 ＋ 相互リンク」を必ずセットで作る**。md に練習問題・解答を書かない。問題は対応 md の論点に準拠。`grade.js` を純関数で保ち `node --test` を green に。a11y/デザインはルート規約継承。既存 `03-nomen-genus.md` が最初の適用対象。
- `apps/grammar-exercises/CLAUDE.md`（新規）… 他アプリ同様、このアプリ自体の仕様（データ形式・5タイプ・採点・起動・テスト）。

## 非目標（YAGNI）

- 進捗トラッキング / SRS / localStorage 保存。
- 音声（将来 edge-tts で追加可能なよう設計を阻害しないだけ）。
- 自由記述の自動採点（自己採点に倒す）。
- リーダー（markdown.js/router.js/reader.js）の改造。
