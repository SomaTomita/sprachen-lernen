# 例文生成・検証パイプライン（フランス語 A1）

> 生成プロンプトにも検証プロンプトにも、下記「A1 の天井」と「スパイラル語彙規則」を**そのまま焼き込む**こと。
> バッチ（40〜50語）で回し、各バッチ後に次の3ゲートを通す:
> 1. `node tools/validate_data.mjs A1 --no-audio`（スキーマ）
> 2. **文法検証**（別 LLM エージェント／本書の検証プロンプト）
> 3. `tools/.venv/bin/python tools/check_vocab.py A1`（**決定的な語彙スパイラル検証**）
> 3 つすべて 0 エラーで初めて音声生成へ進む。

---

## 0. スパイラル語彙規則（最重要・必須）

- **A1 の例文で使ってよい語** = 「A1 見出し語（その `plural`・活用形を含む実現形）」＋「機能語 allowlist（`tools/function_words_fr.txt`）」＋「固有名詞・数詞」**だけ**。
- それ以外の内容語は**一切使わない**。自然な文が書けない場合は、許可語彙内で言い換える。
- この規則は LLM 判定に委ねず `check_vocab.py`（spaCy `fr_core_news_sm` ＋ フランス語形態素正規化）で機械的にゲートする。
- 許可集合には**見出し語の複数形も入れている**（`journal`→`journaux` のような不規則複数の偽陽性を根本的に防ぐため）。

> **蘭語版の教訓:** 検証ツールが正しい言語表現を偽陽性で弾くと、生成側が不自然な言い換えを強いられて**教材の質が落ちる**。偽陽性を見つけたら**例文を歪めるのではなく、まずツール側を直す**。

---

## 1. A1 の天井（厳守・超過禁止）

1つでも超えたら reject。迷ったら必ず単純な方（現在形・単文）に倒す。

**時制・法**
- **直説法現在（présent）が中心。**
- **複合過去（passé composé）**は `avoir`/`être` ＋ ごく一般的な動詞に限り**控えめに**可（`J'ai mangé du pain.` / `Je suis allé à Paris.`）。
- **近接未来（futur proche）** `aller` + 不定詞 可（`Je vais manger.`）。
- **命令法の基本形** 可（`Regarde !` / `Écoutez !`）。
- **禁止:** 半過去（imparfait）／単純未来（futur simple）／条件法（conditionnel）／接続法（subjonctif）／単純過去（passé simple）／大過去（plus-que-parfait）／ジェロンディフ（`en faisant`）。

**語順・否定・疑問**
- 平叙は SVO。否定は **`ne … pas`** を完全形で書く（口語の `pas` 単独は使わない）。`ne … jamais/rien/plus` も可。
- 疑問はイントネーション（`Tu viens ?`）・**`est-ce que`**・基本の倒置（`Parlez-vous français ?`）。疑問詞 `qui / que / où / quand / comment / combien / pourquoi`。

**冠詞・名詞**
- 定冠詞・不定冠詞・**部分冠詞（`du` / `de la` / `des`）**可。
- **エリジオンとアポストロフィを正しく書く**（`j'ai` / `l'école` / `d'accord` / `qu'est-ce que`）。
- 否定の `de`（`Je n'ai pas de pain.`）可。

**形容詞**
- **性数一致を必ず正しく**（`une grande maison` / `des livres verts` / `elle est petite`）。
- 位置は原則**名詞の後**（`une voiture rouge`）。ただし BAGS 系の短い常用語は前置（`un grand homme` / `une belle ville` / `un bon livre` / `un petit chat`）。
- **比較級・最上級は禁止**（`plus grand que` / `le plus` / `meilleur` 不可）。

**代名詞**
- 主語代名詞は自由。**直接・間接目的語代名詞（`le/la/les/lui/leur`）の多用は避ける**（A2 域）。
- **`y` / `en` は原則禁止**（定型 `il y a` は可）。

**禁止（A2 以上）**
- **関係節**（`qui` / `que` を関係代名詞として使う節）。
- **受動態**（`être` + 過去分詞の受動用法）。
- **代名動詞の複雑な用法**（基本の `se lever` 程度は下記例外表に従う）。

**文の形式**
- **3〜8語**（句読点を除く）。対象見出し語を必ず含む（活用形・実現形で可）。
- 自然な **`ja`（日本語・常体）** と **`en`（英語）** の訳を付ける。**`ja` は「〜する / 〜だ」の常体で統一。です・ます体は使わない。**

**例文数**
- 各語 **2文**。`meanings.length >= 2` の語は **3文以上で各語義を最低1文カバー**（`validate_data.mjs` のしきい値と一致）。

---

## 2. 見出し語の自己使用の例外（重要）

見出し語自身が天井で禁止のカテゴリに属する場合、**その語の例文に限り**最小限の形で使用してよい（見出し語は自分の例文に必ず登場しなければならないため）。**他の語の例文では引き続き禁止。**

| 見出し語 | 天井上の問題 | 許す形（自己使用のみ） |
|---|---|---|
| `plus` / `moins` / `mieux` / `meilleur` / `pire` | 比較級を誘発 | **`que` を使った明示比較（`plus grand que`）と `le/la` を伴う最上級（`le meilleur X`）は禁止。** `pire`/`meilleur` は比較対象を出さない裸の述語のみ許可（`C'est mieux.` / `Ce film est pire.`）。`pire` は `mauvais` の不規則比較級で非比較の語義を持たないため、この裸述語形が唯一の実現形になる。 |
| `qui` / `que` | 関係節を誘発 | **疑問詞用法のみ**（`Qui est-ce ?` / `Que fais-tu ?`） |
| `se` および代名動詞 | 代名動詞は A2 域 | 基本の日常動作のみ（`Je me lève à sept heures.`） |
| `y` / `en`（代名詞） | 天井で禁止 | 定型のみ（`Il y a un livre.` / `J'en ai un.`） |
| `être` の受動的な見え方 | 受動態は禁止 | `être` + **形容詞**は受動ではない（`La porte est ouverte.` は状態。可） |

---

## 3. 出力スキーマ

seed の `id / lemma / pos / article / plural / level / lemmaAudio / meanings` を**保持**し、`examples` を追加する。`audio` / `timing` は音声生成タスクで付与（生成段階では付けない）。

```json
{
  "id": "a1-maison", "lemma": "maison", "pos": "noun", "article": "la", "plural": "maisons",
  "level": "A1", "lemmaAudio": "audio/lemma/a1-maison.mp3",
  "meanings": [{ "ja": "家", "en": "house" }],
  "examples": [
    { "fr": "La maison est grande.", "ja": "その家は大きい。", "en": "The house is big." },
    { "fr": "Je vais à la maison.", "ja": "私は家に帰る。", "en": "I am going home." }
  ]
}
```

生成の実務は `tools/raw/exgen/out_NN.json`（`{ "<id>": [ {fr,ja,en}, ... ] }`）に書き、`node tools/merge_exgen.mjs A1` で words.json にマージする。

---

## 4. 生成プロンプト（雛形）

> あなたはフランス語 A1 教材の編集者です。次の見出し語について、上記「A1 の天井」と「スパイラル語彙規則」を**厳守**した例文を作ってください。天井を1つでも超える文・許可語彙外の内容語を含む文は作らないこと（迷ったら単純な現在形・単文に倒す）。
>
> - 見出し語: `{lemma}`（品詞 `{pos}`{名詞なら + 冠詞 `{article}` / 複数 `{plural}`}）
> - 語義: `{meanings}`（JA/EN）
> - **使ってよい語**: `tools/raw/a1_allowed.txt` にある語＋見出し語自身＋固有名詞/数詞のみ。
> - 例文数: meanings が2件以上なら **3文以上で各語義を1文以上カバー**、それ以外は **2文**。各文 **3〜8語**、見出し語を必ず含める。
> - **形容詞の性数一致・エリジオン（`j'ai` / `l'école`）・`ne … pas` の完全形**を正しく書く。
> - **`ja` は常体（〜する / 〜だ）。です・ます体は使わない。**
> - 出力 JSON のみ: `{ "<id>": [{ "fr": "...", "ja": "...", "en": "..." }, ...] }`

---

## 5. 検証プロンプト（雛形・別エージェント＝文法ゲート）

> 次のフランス語例文が **A1 の文法天井**（上記）を超えていないか厳密に判定してください。観点:
> 1. **天井超過**: 半過去 / 単純未来 / 条件法 / 接続法 / 単純過去 / 関係節 / 受動態 / 比較級・最上級 / `y`・`en` の乱用 が無いか（**自己使用の例外表に該当するものは flag しない**）。
> 2. **形容詞の性数一致と位置**（`une grande maison` / `des livres verts` / BAGS の前置）。
> 3. **エリジオン・アポストロフィ・冠詞**（`j'ai` / `l'école` / `du` / `de la` / `des` / 否定の `de`）。
> 4. **動詞の活用と主語一致。**
> 5. **対象語の使用**: 見出し語が実際に使われているか。
> 6. **訳**: `ja` が**常体**で自然か、`en` が正確か。
> - 出力は**問題のある文だけ**: `id | fr | 分類 | 問題 | 修正案（fr、必要なら ja/en）`
> - **修正案も許可語彙内の語だけで書くこと**（語彙外語を使うと `check_vocab.py` で落ちる。蘭語版で実際に起きた）。

---

## 6. 自己チェック（生成側・最低限）

- [ ] 全語に規定数の `examples`（各 fr/ja/en）がある。
- [ ] 各 example で対象見出し語が実際に使われている。
- [ ] **許可語彙集合の外の内容語が無い**（スパイラル）。
- [ ] 半過去・単純未来・条件法・接続法・関係節・受動・比較級が混入していない。
- [ ] 形容詞の性数一致が正しい。エリジオンが正しい。`ne … pas` が完全形。
- [ ] 文が短い（3〜8語）。`ja` が常体。
