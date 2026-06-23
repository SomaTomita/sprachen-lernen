# A1 例文の不自然・ありえない表現の修正（記録）

> **issue:** #15 `fix: A1 例文の不自然な表現・ありえない状況を修正（A1語彙のみで）`
> **branch:** `fix/15-a1-unnatural-sentences`
> **対象:** `apps/vocabulary/data/A1/words.json`（A1 例文 1,654 件）

**Goal:** ネイティブが言わない不自然な表現・事実的にありえない状況を、**A1 語彙（786 見出し語＋機能語＋固有名詞）だけ**で自然な文に直し、学習教材として正しくする。

**スコープ方針（ユーザー指示）:**
- **「不自然」「ありえない状況」だけ**を直す。全部は変えない（自然・現実的なら A1 語彙を多少超える語が1つ入っていても放置）。
- 修正文は A1 語彙のみ。**見出し語は例文に残す**（その語を学ぶための例文だから）。
- 音声（mp3＋カラオケ timing）は edge-tts で**事前生成**。`de` を変えたら必ず再生成する。

---

## 方法

1. 全 1,654 例文を TSV（`id / 見出し語 / de / en`）に抽出。
2. 6 分割して **ネイティブ校正の並列レビュー**（独立した観点で unnatural / implausible / grammar のみ検出、A1語彙逸脱だけを理由には変えない）。
3. 返ってきた 13 フラグを 1 件ずつ**判定**（採用 / 訳のみ / 却下）。採用時は A1 語彙・見出し語維持・隣接例文との重複回避を確認して最終文を確定。
4. `de` を変えた 11 件は `audio`/`timing` キーを削除 → `tts_generate.py A1` で**差分のみ再生成**。
5. `validate_data.mjs A1` と `node --test` を green 確認。

---

## 変更一覧

### A. 独文を修正（音声 mp3＋timing を再生成）— 11 件

| id | 種別 | before | after | 理由 |
|----|------|--------|-------|------|
| `a1-alter-1` | unnatural | Wie ist Ihr Alter? | **Wir sind im gleichen Alter.** | 英語 "What is your age?" の直訳。独語の年齢質問は `Wie alt sind Sie?`。見出し語 `Alter` を残すため別表現に。 |
| `a1-alter-2` | implausible | Mein Alter steht im Pass. | **Sie fragt mich nach meinem Alter.** | パスポートに載るのは年齢でなく生年月日（`Geburtsdatum`、A1外）。自然で現実的な文に。 |
| `a1-glueckwunsch-2` | unnatural | Ich schicke dir einen Glückwunsch. | **Ich schicke dir viele Glückwünsche.** | `einen Glückwunsch schicken`（単数）は不自然。複数 `Glückwünsche` が自然。 |
| `a1-licht-1` | unnatural | Die Sonne gibt Licht. | **Im Zimmer ist viel Licht.** | `Licht geben` は英語的。`-2/-3`（an/aus）と重複しない自然文に。 |
| `a1-tot-2` | unnatural | Der Akku ist tot. | **Die Blume ist tot.** | "battery is dead" の直訳（独語は `leer`）。`Akku` も A1 外。`-1`（Pflanze）と別主語に。 |
| `a1-weiblich-2` | unnatural | Sie ist weiblich. | **Der Hund ist weiblich.** | 人を直接 `weiblich` と述べるのは不自然。`-1` がフォーム文脈なので動物の性で差別化。 |
| `a1-weiter-3` | grammar | Ich weiß das nicht weiter. | **Ich weiß nicht weiter.** | 文法破綻。慣用句は `Ich weiß nicht weiter.`（行き詰まる）で `das` は不要。 |
| `a1-welt-2` | implausible | Kinder spielen in der Welt. | **Ich möchte die Welt sehen.** | 「世界の中で遊ぶ」は無意味。自然で現実的な文に。 |
| `a1-woher-2` | unnatural | Woher ist dieses Buch? | **Woher hast du dieses Buch?** | 物の出所に `Woher ist…?` は不自然。`woher + haben`（どこで手に入れた）が自然。`-1` と重複も回避。 |
| `a1-siebzig-2` | grammar | Das Haus kostet siebzig tausend Euro. | **Das Haus kostet siebzigtausend Euro.** | ドイツ語の数詞は一語綴り。`siebzig tausend` は誤り。 |
| `a1-deutsch-2` | grammar | Sie spricht gut deutsch. | **Sie spricht gut Deutsch.** | 言語名は名詞扱いで大文字 `Deutsch`。 |

### B. 独文は自然なので維持し、英/日訳のみ修正（音声そのまま）— 1 件

| id | de（維持） | 修正前訳 | 修正後訳 |
|----|-----------|----------|----------|
| `a1-da-3` | Da kommt der Bus. | en: "Then the bus came." / ja: 「そのときバスが来た。」 | en: **"There comes the bus."** / ja: **「ほら、バスが来るよ。」** |

→ 独文は現在形で自然（提示の `da`）。訳が過去・時間的意味で誤訳だったため訳だけ修正。`de` 不変なので音声・timing は据え置き。

### C. 却下（変更しない）— 1 件

| id | de | 判断 |
|----|----|------|
| `a1-dame-2` | Guten Tag, meine Dame. | 接客（店員→女性客）で自然に使う定型。過剰修正を避け維持。 |

---

## A1 語彙チェック（採用した新文）

すべて 786 見出し語＋機能語＋固有名詞の範囲内（活用・格変化・複数形・複合数詞は可）。
例: `gleich`→gleichen, `fragen`→fragt, `mein`→meinem, `Glückwunsch`→Glückwünsche, `siebzig`+`tausend`→siebzigtausend, `deutsch`→Deutsch(言語名)。新規の A1 外内容語は持ち込んでいない。

---

## 再現手順

```bash
cd apps/vocabulary
# 1) words.json の該当例文を編集（de 変更分は audio/timing キーを削除）
# 2) 音声＋timing を差分再生成（既存 mp3+timing がある例文はスキップ）
tools/.venv/bin/python tools/tts_generate.py A1
# 3) 検証
node tools/validate_data.mjs A1     # → ✓ 786 words valid
node --test                          # → 全 pass
```

## 検証結果

- `validate_data.mjs A1` … ✓ 786 words valid
- `node --test` … 全 pass
- 再生成 … made=11, already=1643, failed=0（音声 mp3 11 件 modified）
- 各修正例文の `timing` の語列が新 `de` と一致することを確認済み。

---

## 対象外（スコープ外）

- **A2**（`apps/vocabulary/data/A2`）。今回は A1 のみ。同方針で別 issue にて実施予定。
- 別作業の **SRS/セッション方針**（`js/{srs,session,dashboard,main}.js`・`tests/srs.test.js` の未コミット WIP、`docs/plans/2026-06-24-srs-session-policy.md`）。本 issue では一切触れていない。
