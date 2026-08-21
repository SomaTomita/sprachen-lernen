# 例文生成・検証パイプライン（オランダ語 A1 / A2）

> 生成プロンプトにも検証プロンプトにも、対象レベルの「天井」と「スパイラル語彙規則」を**そのまま焼き込む**こと。
> バッチ（20〜50 語）で回し、各バッチ後に次の3ゲートを通す:
> 1. `node tools/validate_data.mjs <level> --no-audio`（スキーマ）
> 2. **文法検証**（別 LLM エージェント／本書の検証プロンプト）
> 3. `tools/.venv/bin/python tools/check_vocab.py <level>`（**決定的な語彙スパイラル検証**）
> 3 つすべて 0 エラーで初めて音声生成へ進む。

---

## 0. スパイラル語彙規則（最重要・必須）

例文で使ってよい語を**レベルの累積集合に厳密に限定**する。これがスパイラルラーニングの担保。

- **A1 の例文** = 「A1 見出し語」＋「機能語 allowlist（`tools/function_words_nl.txt`）」＋「固有名詞・数詞」だけ。
- **A2 の例文** = 「A1 ∪ A2 見出し語」＋「機能語 allowlist」＋「固有名詞・数詞」だけ。
- 見出し語は**実現形**で使ってよい（活用・複数・指小 -je・分離動詞の分離形）。例: `lopen`→loop/loopt/liep/gelopen、`huis`→huizen、`opstaan`→"sta … op"。
- この規則は LLM 判定に委ねず、`check_vocab.py`（spaCy `nl_core_news_sm` で形態素解析→見出し語照合）で機械的にゲートする。
- **照合方式:** `check_vocab.py` は (1) spaCy lemma / 表層形の完全一致、(2) 語尾変化・複数・二重母音(oo→o)・有声無声(z→s, v→f)・規則的過去分詞(ge-)を吸収した**正規化語幹**での一致、の 2 段で判定する。小モデルは蘭語活用の見出し語化を外しやすい（"werk"→"werken" にならない等）ため、(2) が活用形の偽陽性を吸収する。
- **正規化が吸収する形:** 活用語尾（-en/-t/-e/-s/-n）・不規則複数（`kinderen`→kind, `eieren`→ei, `koeien`→koe）・**末尾重子音**（`krokodillen`→krokodil, `krabt`↔krabben, `zit`↔zitten, `mappen`→map）・二重母音（`lopen`↔loopt）・有声無声（z↔s, v↔f）・規則的過去分詞（ge-）。
- **既知の残存限界:** (a) **母音が変わる強変化複数**（`stad`→`steden`, `schip`→`schepen`）は語幹一致せず**偽陽性**になる → 例文でこの型の複数形を使うのは避けるか、違反候補として目視確認する。(b) 不規則過去分詞（`gegeten` 等）も同様。(c) 2〜3 字の短語は近い許可語と語幹衝突しうる＝**偽陰性**（例: `kat`↔`kan`）。(d) 許可語の派生語（`regen` があると `regenen` も通る）は通過しうる。
- 残った違反候補は (a) `function_words_nl.txt` 追補、(b) 正当な派生語を seed に追加、(c) changes-log に理由記録、で運用。精度が要れば `nl_core_news_md` へ上げる。**本ツールは backstop であり、一次担保は生成時の allowlist 遵守と LLM 文法検証。**

---

## 1. A1 の天井（A1 例文で厳守・超過禁止）

1つでも超えたら reject。迷ったら必ず単純な方（現在形・主文）に倒す。

**時制**
- **現在形（onvoltooid tegenwoordige tijd）が中心**。原則すべて現在形。
- 過去は次のみ控えめに: `zijn`(was/waren)・`hebben`(had/hadden) と、ごく一般的動詞の **Perfectum**（`heb/ben` + voltooid deelwoord、例: "Ik heb brood gegeten."）。
- 一般動詞の imperfectum 叙述（liep, maakte, kocht…）は**禁止**。未来 `zullen`・条件法は**禁止**（近接未来 `gaan` + inf は可: "Ik ga eten."）。

**語順**
- 主文 V2。文頭に副詞句が出れば倒置（"Vandaag werk ik."）。分離動詞は主文で分離（"Ik sta om zeven uur op."）。
- 疑問は倒置（"Werk jij vandaag?" — jij 倒置で -t が落ちる）。

**従属・接続**
- 等位接続 `en / of / maar / want / dus` まで。
- **従属節は禁止**（`omdat / dat / als / toen / terwijl` の動詞後置節）。**関係節（die/dat）禁止**。**受動態（worden + 過去分詞）禁止**。

**形容詞**
- 述語用法（"Het huis is groot."）＋**基本的な付加語 -e 変化**（de 語 → -e：`de grote stad` / `een grote stad`；het 語 + `een` → 無語尾：`een groot huis`；het 語 + `het/dit` → -e：`het grote huis`）。
- **比較級・最上級は禁止**（groter / grootst / … 不可）。

**否定・その他**
- 否定は `niet` / `geen`。指小 `-je` は一般的なもの可。
- 数詞・固有名詞・曜日・色・時刻は可。

**文の形式**
- **短く 3〜8 語**（句読点除く）。対象見出し語を必ず含む（実現形可）。
- 自然な JA 訳・EN 訳を付ける（直訳すぎない）。オランダ語として正用法（語順・冠詞 de/het・主述一致）。

**見出し語の自己使用の例外（重要・A1/A2 共通）**

見出し語そのものが天井で禁止された文法カテゴリに属する場合、**その語の例文に限り**最小限の形で使用してよい（見出し語は自分の例文に必ず登場しなければならないため）。**他の語の例文では引き続き禁止**。独語版が `möchte` に与えた例外と同じ扱い。A1 での具体例:

| 見出し語 | 天井上の問題 | 許す形（自己使用のみ） |
|---|---|---|
| `meer` / `beter` / `verder` | 比較級形 | "Ik wil meer water." / "Dat is beter." / "Wij lopen verder." |
| `omdat` | 従属節（動詞後置）が必須 | 最小の従属節1つ・正しい動詞後置: "Ik blijf binnen, omdat het koud is." |
| `zich` | 再帰は A2 解禁項目 | "Zij voelt zich niet goed." |
| `zullen` | 未来 `zullen` は禁止 | **未来叙述には使わない**。提案・申し出の定型のみ: "Zullen wij samen eten?" / "Zal ik je helpen?" |
| `als` / `toen` / `wie` / `waarin` / `zoals` | 従属節・関係節を誘発 | **節を作らない用法に限定**する。`als`＝前置詞「〜として」("Hij werkt als kapper.")、`toen`＝V2 倒置の副詞("Toen was ik klein.")、`wie`/`waarin`＝疑問詞、`zoals`＝定動詞を伴わない句("fruit, zoals appels")。 |

**分離動詞は主文で分離させてよい**（"Ik check in met mijn ov-chipkaart." / "Ik sta om zeven uur op."）。`check_vocab.py` は分離動詞の本体語幹を許可済みなので、分離形でゲートは通る。

**例文数**
- 各語 **2 文**。`meanings.length >= 2` の語は **3 文以上で各語義を最低 1 文カバー**（`validate_data.mjs` のしきい値と一致）。

---

## 2. A2 の天井（A1 に追加解禁。A1 で許可のものは A2 でも当然可）

**時制** — 全動詞の Perfectum 可。一般動詞・話法助動詞の imperfectum を限定的に（kon/moest/wilde/zou/ging/kwam/zei など基本語）。条件 `zou + inf` の基本形可。

**従属・接続** — **従属節解禁**（`omdat / dat / als / want / toen`、動詞後置を正しく）。**間接疑問解禁**（"Ik weet niet waar hij woont."）。

**形容詞** — 比較級・最上級解禁（`groter / grootst / beter / meer … dan / net zo … als`）。

**その他解禁** — 再帰動詞（`zich voelen / zich vergissen`）。

**禁止（B1 へ・A2 でも超過＝reject）** — 関係節（die/dat/wie/wat の関係代名詞）、受動態（worden + 過去分詞）、拡張従属接続詞（`hoewel / zodat / terwijl`）、一般動詞の自由な imperfectum 叙述の多用。

**語彙** — A1∪A2 累計（A2 文に A1 語も可）。長さは従属節1つ程度まで。

---

## 3. 出力スキーマ（`data/<level>/words.json`）

seed の `id / lemma / pos / article / plural / level / lemmaAudio / meanings` を**保持**し、`examples` を追加。`audio` / `timing` は音声生成タスクで付与（生成段階では付けない）。

```json
{
  "id": "a1-huis", "lemma": "huis", "pos": "noun", "article": "het", "plural": "huizen",
  "level": "A1", "lemmaAudio": "audio/lemma/a1-huis.mp3",
  "meanings": [{ "ja": "家", "en": "house" }],
  "examples": [
    { "nl": "Het huis is groot.", "ja": "その家は大きい。", "en": "The house is big." },
    { "nl": "Ik woon in een oud huis.", "ja": "私は古い家に住んでいる。", "en": "I live in an old house." }
  ]
}
```

生成の実務は `tools/raw/<level>_examples.json`（`{ "<id>": [ {nl,ja,en}, ... ] }`）に書き、`node tools/merge_examples.mjs <level> tools/raw/<level>_examples.json` で words.json にマージする。

---

## 4. 生成プロンプト（雛形）

> あなたはオランダ語 {LEVEL} 教材の編集者です。次の見出し語について、上記「{LEVEL} の天井」と「スパイラル語彙規則」を**厳守**した例文を作ってください。天井を1つでも超える文・許可語彙外の語を含む文は作らないこと（迷ったら単純な現在形・主文に倒す）。
>
> - 見出し語: `{lemma}`（品詞 `{pos}`{名詞なら + 冠詞 `{article}` / 複数 `{plural}`}）
> - 語義: `{meanings}`（JA/EN）
> - **使ってよい語**: {A1 の場合「A1 見出し語＋機能語＋固有名詞/数詞」／A2 の場合「A1∪A2 見出し語＋機能語＋固有名詞/数詞」}。それ以外の内容語は使わない。
> - 例文数: meanings が2件以上なら **3 文以上で各語義を1文以上カバー**、それ以外は **2 文**。各文 **3〜8 語**、見出し語（分離形・活用形可）を必ず含める。
> - 各文に自然な JA 訳・EN 訳。
> - 出力 JSON のみ: `[{ "nl": "...", "ja": "...", "en": "..." }, ...]`

---

## 5. 検証プロンプト（雛形・別エージェント＝文法ゲート）

> 次のオランダ語例文が **{LEVEL} の文法天井**（上記）を超えていないか厳密に判定してください。観点:
> 1. **文法レベル超過**: 従属節 / 関係節 / 受動態 / 一般動詞の imperfectum 叙述 / 未来 zullen /（A1 のみ）比較級・最上級・付加語 -e の誤り が無いか。
> 2. **オランダ語の正しさ**: 語順(V2/倒置/分離動詞)・冠詞(de/het)・主述一致・自然さ。
> 3. **対象語の使用**: 見出し語（分離形・活用形可）が実際に使われているか。JA/EN 訳が自然か。
> - 対象語 `{lemma}` ／ 文 `{nl}` ／ 訳 `{ja}` / `{en}`
> - 出力: `{ "ok": true|false, "reasons": [...], "fix": "修正文(nl/ja/en) or null" }`

> **語彙スパイラルの可否は本プロンプト（LLM）ではなく `check_vocab.py`（決定的）で最終判定する。**

---

## 6. 自己チェック（生成側・最低限）

- [ ] 全語に規定数の `examples`（各 nl/ja/en）がある。
- [ ] 各 example で対象見出し語が実際に使われている（実現形可）。
- [ ] **許可語彙集合の外の内容語が無い**（スパイラル）。
- [ ] 従属節・関係節・受動・一般動詞 imperfectum が混入していない（A1 は比較級・付加語語尾も確認）。
- [ ] 文が短い（3〜8 語）。冠詞 de/het と語順が正しい。JA/EN 訳が自然。
