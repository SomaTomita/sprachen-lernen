# レッスン06「定冠詞と不定冠詞」追加 実装計画

> **For Claude:** スキーマ・テスト・デザインは既存(01〜05)に確立済み。本計画は**コンテンツ追加**(解説md＋problem JSON＋登録＋相互リンク)であり、新しいコード/UIは書かない。

**Goal:** 動画「ドイツ語文法6 定冠詞と不定冠詞・使い分け13例」に準拠した解説 `content/grammar/06-artikel.md` と練習 `apps/grammar-exercises/data/06.json` を、既存レッスンと同品質で追加する。

**Architecture:** 既存の「docs=リーダー解説 / app=対話的練習」分離を踏襲。解説は純Markdown(リーダーが `#/grammar/artikel` で表示)、練習は `data/06.json`(6タイプ・約20問・冒頭サクサク系)。コードは無改変、`data.test.js` がデータ駆動で自動検証。

**Tech Stack:** 素 HTML/CSS/JS(ES Modules)・ビルド無し・依存無し。テストは `node --test`。

---

## 設計上の判断

### 解説 06 の構成(content/grammar/06-artikel.md)
05(格変化)の続き。スライド/トランスクリプトの柱:
1. 定冠詞(bestimmter Artikel `der/die/das`=「その/特定」)と不定冠詞(unbestimmter Artikel `ein/eine`=「ある一つの/不特定・数の1」)の意味。**不定冠詞に複数形は無い**。
2. **不定冠詞 ein- の格変化表**(男/女/中 × 4格)。der- と同じ語尾、ただし**男1格・中1格・中4格の3か所だけ語尾ゼロ**(ein)。
3. **使い分け13例 → 法則に蒸留**:
   - 定冠詞:① 特定済み・目の前で話題 ② 一度出た再言及 ③ 世界に一つ(地球) ④ 一般常識(氷は冷たい) ⑤ 恋人(die Freundin von …=特定)
   - 不定冠詞:① 数の1 ② 特定の1つだが話題でない(存在文「〜がある」) ③ 不特定の1つ(いつか彼女が欲しい) ④ カテゴリの一員(eine Freundin von …=友達の一人)
4. **無冠詞(Nullartikel)**:不可算(雨・粉・米・飲み物)、国籍・職業・言語(sein のあと)。
5. (補足)**kein-**=不定冠詞の否定。ein- と同じ変化＋**複数 keine** あり、と一言だけ。
6. 英語の a/the への応用。
7. 「❌ よくある間違い」表。**解説に練習問題・解答は書かない**(規約)。

検証済み例文(後で独語ファクトチェック必須):Das Buch ist von Haruki Murakami. / Ein Buch liegt unter der Tasche. / Hier liegt ein Buch. / Das Buch liegt auf dem Stuhl. / Das ist ein Bahnhof. / Das ist der Hauptbahnhof. / Die Erde ist rund. / Das Eis ist kalt. / Anna ist eine Freundin von Kevin. / Julia ist die Freundin von Leon. / Ich möchte irgendwann eine Freundin. / Der Vater holt die Zeitung. / Ich möchte das Buch kaufen. / Ich bin Student. / Ich lerne Deutsch.

### 練習 06 の構成(data/06.json)— 約22問
`data.test.js` 制約:`lesson:"06"`・≥20問・match≥1・instant choice≥1・冒頭6問は match か instant choice・全6タイプ(fill/table/choice/transform/free)・各問 prompt＋explain・自動採点 accept[0] が自身を通過。

- 冒頭6問(サクサク):match×2(意味の対応 / ein- 男性の格)→ instant choice×4(初出=不定、特定=定、世界に一つ=定、存在文=不定)
- 中盤:choice(恋人=die / 友達の一人=eine / 駅=ein vs 固有名=der)、fill(ein- の4格 einen・3格 einer・中性 ein)、table(ein- 格変化表)、fill二空欄(初出 ein→再言及 der)
- 終盤:transform(無冠詞化:職業 Ich bin Student. / 不可算 Reis)、free(和訳3問)

---

## Task 1: 解説 `content/grammar/06-artikel.md` を作成

**Files:**
- Create: `content/grammar/06-artikel.md`

**Steps:**
1. 上記構成で執筆。冒頭・末尾に練習リンク `> 🔗 **練習問題**: [...](apps/grammar-exercises/?lesson=06)`。
2. 03〜05 と同じ見出し様式(🎯 大原則 / 表 / 🧾 まとめ / ❌ 落とし穴)。
3. 例文・冠詞表は標準ドイツ語として確認。

## Task 2: 練習 `apps/grammar-exercises/data/06.json` を作成

**Files:**
- Create: `apps/grammar-exercises/data/06.json`

**Steps:**
1. `lesson:"06"`, `title:"06 定冠詞と不定冠詞"`, `doc:"../../#/grammar/artikel"`, `intro`。
2. 上記22問を配置(冒頭6問=match/instant choice、全6タイプ)。
3. 各問に `rule`＋`explain`(①②③の多論点)。

## Task 3: 登録と相互リンク

**Files:**
- Modify: `js/content.js`(grammar セクションに `{slug:"artikel", title:"06 定冠詞と不定冠詞", path:"content/grammar/06-artikel.md"}` を追加)
- Modify: `apps/grammar-exercises/js/data.js`(`LESSONS` に `{id:"06", title:"06 定冠詞と不定冠詞"}` を追加)
- 必要なら content.js の grammar-exercises tagline を実態(01〜06)に更新。

## Task 4: 検証

**Steps:**
1. `cd apps/grammar-exercises && node --test`(grade＋data 整合)→ green。
2. リポジトリ直下 `node --check js/content.js`、`node --test tests/*.test.js`(Markdownレンダラ)→ green。
3. 独語ネイティブ基準のファクトチェック(別エージェント):ein- 格変化表・全例文・無冠詞の扱い・練習解答。
