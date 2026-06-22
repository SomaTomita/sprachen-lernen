# 例文生成・検証パイプライン (A1)

> Task 16 / Task 17 の生成・検証手順を明文化したもの。
> 生成プロンプトにも検証プロンプトにも、下記「A1 の天井」を**そのまま焼き込む**こと。
> バッチ（例: 20〜50語）で回し、各バッチ後に `node tools/validate_data.mjs A1` をゲートにする。

---

## A1 の天井（例文生成で厳守・超過禁止）

以下を**1つでも超えたら reject**。迷ったら必ず低い方（より単純な方）に倒す。

### 1. 時制
- **現在形（Präsens）が中心**。原則すべて現在形で書く。
- 過去は次のみ許可（控えめに）:
  - `sein` / `haben` の **Präteritum**: `war` / `hatte`（例: "Ich war zu Hause." / "Wir hatten Zeit."）。
  - **ごく一般的な動詞の Perfekt** のみ控えめに（例: "Ich habe das Buch gekauft."）。多用しない。
- 上記以外の Präteritum（ging, kam, machte … など本動詞の過去形）は**禁止**。
- 未来 `werden` 構文、接続法（würde / wäre / hätte 等）は**禁止**。

### 2. 格 (Kasus)
- **Nominativ / Akkusativ** を基本とする。
- **Dativ は定型のみ**許可:
  - "es geht mir gut" 系（mir / dir / ihm …）。
  - `helfen` / `danken` / `gefallen` ＋ 人（例: "Ich helfe dir." / "Das gefällt mir."）。
  - 前置詞句の定型: "mit dem Bus" / "mit der Bahn" / "zu Hause" / "nach Hause" など。
- **Genitiv 禁止**（"des Mannes" のような 2格、von+Dativ での所有迂言も避ける。所有は所有冠詞 mein/dein… を使う）。

### 3. 形容詞
- **述語用法・副詞用法のみ**。
  - OK: "Das Auto ist neu."（述語）／ "Er spricht gut Deutsch."（副詞）。
  - **禁止**: 付加語の格変化 "das neue Auto" / "ein neues Auto" / "der alte Mann" などの**語尾変化した付加語形容詞**。
- **比較級・最上級 禁止**（größer / am größten / besser / mehr als … すべて不可）。
- 例外的に許される付加語的表現は**冠詞を伴わない素の数詞・所有冠詞・指示詞**まで（例: "mein Haus", "zwei Kinder", "diese Frau"）。ただし形容詞そのものの語尾変化は付けない。

### 4. 文結合
- **主文＋等位接続**まで: `und` / `oder` / `aber` / `denn` / `dann`。
- **従属節 禁止**: `weil` / `dass` / `wenn` / `ob` / 間接疑問（"Ich weiß, wo …"）すべて不可。
- **関係文 禁止**（der/die/das/welche- を関係代名詞として使う節）。
- **受動態 禁止**（werden + Partizip II の受動）。
- 分離動詞は OK（"Der Zug fährt ab." のように主文内で分離して使う）。

### 5. 語彙
- できるだけ **A1 基本語＋基本的な機能語**の範囲。seed（約786語）と日常基本語に収める。
- 固有名詞・数詞・曜日・色・時刻表現（"um acht Uhr"）は可。
- 専門語・低頻度語・抽象度の高い語は避ける。

### 6. 文の形式
- **短く**: 目安 **3〜8 語**（句読点除く）。
- **対象の見出し語を必ず使う**（実現形で。下記「機能語」参照）。
- 各文に**自然な JA 訳**と**自然な EN 訳**を付ける（直訳すぎず、A1 学習者が意味を取れる訳）。
- ドイツ語として自然・正用法であること（語順・冠詞・主述一致）。

### 7. 例文数
- 各語 **2 文**。
- 意味（meanings）が **2 つ以上**ある語は **3 文以上**で、**各語義を最低 1 文ずつカバー**する。
- `validate_data.mjs` のしきい値と一致: `meanings.length >= 2` → `examples >= 3`、それ以外 → `examples >= 2`。

### 8. 機能語の扱い（前置詞・接続詞・代名詞幹など）
- 機能語は、それが**実際に使われる自然な短文**で提示する。語そのものを浮かせない。
- **前置詞**（例: `ab`, `an`）: 自然な句で（"ab acht Uhr", "an der Wand" / "an die Tafel"）。`an` は Dativ/Akkusativ どちらも A1 基本句に限る。
- **接続詞**（例: `aber`, `also`）: 主文＋等位接続として実際に接続する文で。
- **代名詞幹**（`all-`, `ander-` のように seed が幹で登録されている語）: **実現形**で提示する。
  - `all-` → `alle` / `alles` / `alle` + 名詞（"Alle Kinder spielen." / "Alles ist gut."）。
  - `ander-` → `andere` / `ein anderer` など実現形（ただし付加語の格変化が A1 天井に触れない無冠詞・主格中心の自然形に留める。例: "Ich nehme ein anderes." を避け "Ich möchte etwas anderes." など中性代名詞用法を優先）。
- 見出しが分離動詞（`abfahren`）の場合、文中では分離して現れてよい（"… fährt … ab"）。検証では分離形も「対象語の使用」として扱う。

---

## 出力スキーマ（`A1/words.json`）

seed の `id` / `lemma` / `pos` / `article` / `plural` / `level` を**そのまま保持**し、`meanings` と `examples` を追加した配列。`audio` / `timing` は Task 18 で付与（この段階では付けない）。

```json
{
  "id": "a1-abfahren", "lemma": "abfahren", "pos": "verb", "level": "A1",
  "meanings": [{ "ja": "出発する", "en": "to depart" }],
  "examples": [
    { "de": "Der Zug fährt um acht Uhr ab.", "ja": "電車は8時に出発する。", "en": "The train departs at eight o'clock." },
    { "de": "Wir fahren morgen ab.", "ja": "私たちは明日出発する。", "en": "We depart tomorrow." }
  ]
}
```

- 名詞は `article`（必須）と `plural`（あれば）を保持する。
- `meanings` は A1 として代表的な語義に絞る（多義語でも 1〜3 程度）。各 meaning に `ja` と `en` の両方を必ず付ける。

---

## 生成プロンプト（雛形）

> あなたはドイツ語 A1 教材の編集者です。次の見出し語について、上記「A1 の天井」を**厳守**した例文を作ってください。天井を 1 つでも超える文は作らないこと（迷ったら単純な現在形・主文に倒す）。
>
> - 見出し語: `{lemma}`（品詞: `{pos}`{名詞なら + 性 `{article}` / 複数 `{plural}`}）
> - 語義: `{meanings}`（JA/EN）
> - 例文数: meanings が 2 件以上なら **3 文以上で各語義を 1 文以上カバー**、それ以外は **2 文**。
> - 各文は **3〜8 語**で短く、**見出し語（分離動詞は分離形可・代名詞幹は実現形）を必ず含める**。
> - 各文に自然な JA 訳と EN 訳を付ける。
>
> 出力 JSON のみ:
> `[{ "de": "...", "ja": "...", "en": "..." }, ...]`

---

## 検証プロンプト（雛形・別エージェント）

> 次のドイツ語例文が **A1 の文法・語彙の天井**（上記）を超えていないか厳密に判定してください。4 観点で確認:
> 1. **文法レベル超過**: 従属節 / 関係文 / 受動態 / 接続法 / 本動詞の Präteritum / 未来 werden / 付加語形容詞の語尾変化 / 比較級・最上級 / Genitiv が無いか。
> 2. **語彙範囲**: A1 基本語＋基本機能語の範囲か（低頻度・専門語が無いか）。
> 3. **独語の正しさ**: 語順・冠詞・主述一致・自然さ。
> 4. **対象語の使用**: 見出し語（分離動詞は分離形、代名詞幹は実現形）が実際に使われているか。JA/EN 訳が自然か。
>
> - 対象語: `{lemma}` ／ 文: `{de}` ／ 訳: `{ja}` / `{en}`
> - 出力: `{ "ok": true|false, "reasons": [...], "fix": "修正文(de/ja/en) or null" }`
> - `ok:false` の場合、可能なら A1 天井内の修正案 `fix` を出す。

---

## 自己チェック（生成側・最低限）

- [ ] 全語に `meanings`（`ja`/`en` 両方）と必要数の `examples` がある。
- [ ] 各 example で対象語が実際に使われている（分離動詞は分離形、代名詞幹は実現形）。
- [ ] 従属節・関係文・受動態・接続法・本動詞 Präteritum・付加語格変化・比較級/最上級・Genitiv が**混入していない**。
- [ ] 文が短い（3〜8 語目安）。JA/EN 訳が自然。
- [ ] seed の `id`/`lemma`/`pos`/`article`/`plural`/`level` を保持している。

> 最終的な合否判定は Task 17 で**別の検証エージェント**が行う。生成側は上記の自己チェックまで。

---

## 運用明確化（パイロット検証のフィードバック反映）

本番766語の生成で繰り返し問題になりやすい点を明文化する。生成側・検証側ともにこれを適用すること。

1. **比較級「形」の時間副詞を避ける**: `später` / `früher` / `lieber` / `mehr` は意味が定型でも**形態的に比較級**で A1 天井違反。`morgen` / `heute` / `dann` / `bald` / `gern` / `viel` 等の**非比較級語**に必ず倒す。
2. **動詞支配の必須3格は許可**（天井 §2 の「Dativ は定型のみ」の例外として明記）: `anbieten` / `geben` / `schicken` / `zeigen` / `bringen` 等の ditransitive 動詞は、見出し語自体が3格を要求するため `Ich gebe dir das Buch.` のような必須3格は**OK**。これを禁止して不自然な回避文を作らないこと。禁止対象は「自由・余剰な3格の濫用」と Genitiv。
3. **`etwas + 中性代名詞` の正書法を統一**: `etwas anderes`（小文字）で統一する（`etwas Anderes` と混在させない）。
4. **`möchte` は A1 標準として許可**（Konjunktiv II 形だが定着した丁寧表現）。接続法禁止ルールの例外。同様に `würde`/`wäre`/`hätte` 等の他の接続法は引き続き**禁止**。

---

## A2 の天井（A2例文生成で厳守・超過禁止）

> 出典: Goethe-Zertifikat A2 *Prüfungsziele, Testbeschreibung*（公式）。A2 例文の生成プロンプト・検証プロンプトに、この節を**そのまま焼き込む**こと。
> A1 セクションは上に残してある。**A1 例文は引き続き「A1 の天井」で、A2 例文だけがこの節に従う**。
> A2 は A1 の上位互換（累計）なので、**A1 の天井で許可されていたものは A2 でも当然 OK**。本節は A2 で**追加解禁される範囲**と**A2 でもなお禁止（= B1 以上）の範囲**を定義する。
> 迷ったら必ず低い方（より単純な方）に倒す。1 つでも B1 域に触れたら reject。

### 1. 時制
- **現在形（Präsens）が中心**。これに加えて以下を解禁する。
- **全動詞の Perfekt 可**（A1 の「ごく一般的な動詞のみ」という制限を解除）。一般動詞でも `Ich habe gestern Fußball gespielt.` のように完了形で過去を語ってよい。
- **Präteritum は限定**: `haben` / `sein` / `kommen` / `sagen` ＋ **話法助動詞（können/müssen/wollen/sollen/dürfen/mögen）** の過去形のみ許可（`war` / `hatte` / `kam` / `sagte` / `konnte` / `musste` / `wollte` …）。
  - **一般動詞の Präteritum 叙述は禁止**（`ging` / `machte` / `spielte` / `kaufte` … で過去を語るのは B1）。一般動詞の過去は必ず **Perfekt** で表す。
- **接続法 II は基本的な丁寧・仮定まで**: `möchte` / `hätte` / `könnte` / `wäre` / `würde` の定型的・丁寧・控えめな仮定（`Ich hätte gern …` / `Könnten Sie …?` / `Das wäre schön.` / `Ich würde gern …`）。複雑な非現実条件文の連鎖や過去の接続法は避ける。
- **禁止**: Plusquamperfekt（`hatte … gemacht`）、Futur I/II 体系（`werden` + 不定詞の未来用法）。

### 2. 格 (Kasus)
- **Nominativ / Akkusativ / Dativ を全面解禁**（A1 の「Dativ は定型のみ」を解除）。Wechselpräposition の Dat/Akk 使い分け含め、3 格を自由に使ってよい。
- **n 変化名詞（schwache Nomen）可**（`der Junge → den Jungen` / `der Kollege → dem Kollegen` / `der Name → den Namen` など）。
- **Genitiv は固有名詞のみ**許可（`Annas Auto` / `Peters Haus`）。
  - 普通名詞の所有・Genitiv は**禁止**。所有は **von + Dativ**（`das Auto von meinem Bruder`）か**所有冠詞**（`mein/dein/sein …`）で表す。

### 3. 形容詞
- **付加語の格変化を解禁**（A1 で禁止していた語尾変化付き付加語形容詞を許可）。
  - OK: `der neue Mantel` / `ein neuer Mantel` / `mit dem alten Auto` / `eine schöne Stadt` など、定・不定・無冠詞いずれの格変化も可。
- **比較級・最上級を解禁**: `größer` / `besser` / `mehr` / `am besten` / `der schönste …` / `… als …` / `so … wie …` すべて可。
- A1 セクションにあった「比較級形の時間副詞を避ける（später/früher/lieber/mehr）」制限は **A2 では不要**（比較級が解禁されているため自由に使ってよい）。

### 4. 前置詞
- **Wechselpräposition の Dativ / Akkusativ 使い分け**（場所＝Dat / 方向＝Akk）を正しく使う（`an der Wand` / `an die Wand`、`im Zimmer` / `ins Zimmer`）。
- `seit` / `bis` / `zu` / `bei` / `mit` / `nach` / `von` / `aus` などの基本前置詞を自然な格で。

### 5. 文結合
- 主文＋等位接続（A1 の `und` / `oder` / `aber` / `denn` / `dann`）に加えて、以下を解禁。
- **従属節を解禁**: `dass` / `weil` / `wenn`（条件・時）。動詞は文末に正しく置く。
- **間接疑問を解禁**: `Ich weiß nicht, wo er wohnt.` / `Weißt du, ob …?` / `wann/wie/warum …` の間接疑問節。
- **接続副詞 可**: `deshalb` / `dann` / `trotzdem`… のうち **`deshalb` / `dann` は可**（語順: 接続副詞は定動詞前域を占めるので倒置 `Deshalb komme ich nicht.`）。
- **禁止（B1 へ）**: 関係文（Relativsätze, der/die/das・welch- を関係代名詞とする節）、`obwohl` / `damit` / `trotzdem`〔従属接続詞的拡張〕 / `als ob` / `sodass` などの**拡張従属接続詞**。

### 6. 再帰動詞
- **再帰動詞を解禁**: `sich freuen` / `sich treffen` / `sich anmelden` / `sich ärgern` / `sich umziehen` など、再帰代名詞（mich/dich/sich/uns/euch）を伴う動詞を自然に使ってよい（Akk/Dat の再帰とも可）。

### 7. 禁止（B1 以上・A2 では超過＝reject）
1 つでも含めば reject。
- **関係文 Relativsätze**（関係代名詞による修飾節）。
- **受動態 Passiv**（`werden` + Partizip II の受動。状態受動 `sein` + PII も避ける）。
- **一般動詞の Präteritum 叙述**（§1 で許可した haben/sein/kommen/sagen＋話法助動詞**以外**の過去形）。
- **普通名詞の Genitiv**（固有名詞の所有のみ可）。
- **拡張従属接続詞** `obwohl` / `damit` / `trotzdem`〔従属〕 / `sodass` / `als ob` 等。
- **Plusquamperfekt**・**Futur 体系**。

### 8. 語彙
- **A1＋A2 の累計範囲（約1300語）**。A2 例文は **A1 語彙も自由に使ってよい**（A1 seed の語も A2 文に登場可）。
- 専門語・低頻度語・B1 以上の抽象語は避ける。固有名詞・数詞・曜日・色・時刻表現は可。

### 9. 例文数・出力スキーマ・機能語の扱い
- 上記の **A1 セクションと同じ方針**に従う。
  - 例文数: 各語 **2 文**。`meanings.length >= 2` の語は **3 文以上で各語義を最低 1 文ずつカバー**（`validate_data.mjs` のしきい値と一致）。
  - 出力スキーマ: seed の `id` / `lemma` / `pos` / `article` / `plural` / `level` を**そのまま保持**し、`meanings`（`ja`/`en` 両方）と `examples`（`de`/`ja`/`en`）を追加。`audio` / `timing` は音声生成タスクで付与（この段階では付けない）。
  - 機能語（前置詞・接続詞・代名詞幹・分離動詞）の扱いも A1 セクションと同じ（実現形で提示、分離動詞は分離形で出現可）。
- 文の長さは A1 より長くてよいが、**A2 学習者が一読で意味を取れる範囲**に収める（従属節 1 つ程度まで。節の入れ子は避ける）。
