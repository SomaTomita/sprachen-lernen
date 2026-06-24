# A2 例文の不自然・ありえない表現の修正（記録）

> **issue:** #24 `fix: A2 例文の不自然な表現・ありえない状況を修正（A1∪A2語彙のみで）`
> **branch:** `fix/24-a2-unnatural-sentences`
> **対象:** `apps/vocabulary/data/A2/words.json`（A2 例文 1,286 件）
> **前段:** A1 は #15（`docs/plans/2026-06-24-a1-sentence-fixes.md`）で対応済み。本件はその A2 版。

**Goal:** ネイティブが言わない不自然な表現・事実的にありえない状況・文法誤りを、**A1∪A2 語彙（累計 1,370 見出し語＋機能語＋固有名詞）だけ**で自然な文に直す。

**スコープ方針:** 「不自然」「ありえない状況」「明確な文法誤り」だけを直す（全部は変えない）。修正文は A1∪A2 語彙のみ・**見出し語は残す**。`de` を変えたら音声（mp3＋timing）を edge-tts で再生成。

---

## 方法

1. 全 1,286 例文を TSV 抽出 → 6 分割で**ネイティブ並列レビュー**（unnatural / implausible / grammar のみ）。
2. 返ってきた 15 フラグを 1 件ずつ判定（採用 12 / 却下 1 / 統合 2）。採用時は A1∪A2 語彙・見出し語維持・隣接例文との重複回避を確認。
3. `de` を変えた 12 件は `audio`/`timing` を削除 → `tts_generate.py A2` で差分再生成。
4. `validate_data.mjs A2` green 確認。

---

## 変更一覧（独文修正＋音声再生成）— 12 件

| id | 種別 | before | after | 理由 |
|----|------|--------|-------|------|
| `a2-ausserhalb-1` | grammar | Sie wohnt außerhalb **von der** Stadt. | Sie wohnt außerhalb **der** Stadt. | `außerhalb` は2格支配。`von der` は崩れた口語。 |
| `a2-ausserhalb-2` | grammar | …außerhalb **vom** Zentrum. | …außerhalb **des Zentrums**. | 同上（2格 `des Zentrums`）。 |
| `a2-begruenden-3` | unnatural | Sie haben eine neue Firma **begründet**. | **Bitte begründe deine Antwort.** | 会社設立は `gründen`。`begründen`＝理由づける。語の誤用を正しい意味に（`-1/-2` と別表現）。 |
| `a2-fundsachen-1` | implausible | Ich habe meine Tasche im Fundbüro abgegeben — dort gibt es alle Fundsachen. | **Ist meine Tasche bei den Fundsachen?** | 自分の鞄を「遺失物として届ける」は不自然。`Fundbüro` も範囲外。自然な問い合わせ文に。 |
| `a2-fundsachen-2` | unnatural | Haben Sie Fundsachen **von einem roten Regenschirm**? | **Ist ein roter Schirm bei den Fundsachen?** | 「一本の傘の遺失物」は非文（英語的）。`Regenschirm`→範囲内の `Schirm`。 |
| `a2-gewitter-2` | grammar | **Wegen dem** Gewitter sind wir zu Hause geblieben. | **Wegen des Gewitters** … | `wegen` は標準で2格。 |
| `a2-handtuch-1` | unnatural | Bitte hänge das Handtuch **ans Bad**. | Bitte hänge das Handtuch **ins Bad**. | 「浴室そのものに掛ける」はコロケーション違反。`ins Bad`（中に）。 |
| `a2-kuendigen-3` | grammar | Der Chef hat zwei **Mitarbeiter** gekündigt. | …zwei **Mitarbeitern** gekündigt. | 人を解雇する `kündigen` は与格目的語（jemandem kündigen）。 |
| `a2-reiten-2` | grammar | Als Kind **habe** ich oft auf dem Bauernhof **geritten**. | Als Kind **bin** ich oft geritten. | `reiten`（移動・活動）の完了は標準で `sein`。`Bauernhof` も範囲外なので削除。 |
| `a2-schimpfen-1` | grammar | Die Lehrerin hat **die Kinder** geschimpft. | …hat **mit den Kindern** geschimpft. | `schimpfen` は自動詞（mit＋3格）。4格目的語は非標準。 |
| `a2-typisch-1` | grammar | Das ist **typisch deutsches** Frühstück. | Das ist **ein** typisch deutsches Frühstück. | 可算名詞単数に不定冠詞が必要。 |
| `a2-wieder-2` | unnatural | Kannst du das bitte **noch einmal wieder** sagen? | **Wir sehen uns morgen wieder.** | `noch einmal` と `wieder` が重複し冗長。見出し語 `wieder` を残しつつ自然な別文に（`-1` と重複回避）。 |

## 却下（変更しない）— 1 件

| id | de | 判断 |
|----|----|------|
| `a2-uebersetzung-2` | Ich brauche eine Übersetzung auf Deutsch. | 独文と英訳（"in German"）が整合し自然。directional を強いる過剰修正は避け維持。 |

---

## A1∪A2 語彙チェック（採用した新文）

すべて 1,370 見出し語＋機能語＋固有名詞の範囲内。範囲外候補（`Tradition`/`Entscheidung`/`Bauernhof`/`Regenschirm`/`Fundbüro`）は新規採用せず、範囲内語（`Antwort`/`Schirm`/`Zentrum` 等）で置換。

---

## 再現手順

```bash
cd apps/vocabulary
tools/.venv/bin/python tools/tts_generate.py A2   # de 変更分のみ差分再生成
node tools/validate_data.mjs A2                    # → ✓ 584 words valid
```

## 検証結果

- `validate_data.mjs A2` … ✓ 584 words valid
- 再生成 … made=12, already=1274, failed=0（音声 mp3 12 件 modified）
- 各修正例文の `timing` 語列が新 `de` と一致することを確認済み。

---

## 対象外（スコープ外）

- A1（#15 で対応済み）。
- 別作業の SRS/セッション方針（`js/*` の #16 系コミット）。本 issue では一切触れていない。
