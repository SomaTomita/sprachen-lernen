# レッスン07「冠詞類(所有・指示・疑問・数量)」追加 実装計画

> **For Claude:** スキーマ・テスト・デザインは既存(01〜06)に確立済み。本計画は**コンテンツ追加**(解説md＋problem JSON＋登録＋相互リンク)であり、新しいコード/UIは書かない。06(`2026-06-25-lesson-06-artikel.md`)と同手順。

**Goal:** 動画「ドイツ語文法7 冠詞のいろいろな種類」に準拠した解説 `content/grammar/07-artikelwoerter.md` と練習 `apps/grammar-exercises/data/07.json` を、既存レッスンと同品質で追加し、PR→main マージ(Refs #10)まで行う。

**Architecture:** 既存の「docs=リーダー解説 / app=対話的練習」分離を踏襲。解説は純Markdown(リーダー `#/grammar/artikelwoerter`)、練習は `data/07.json`(6タイプ・約22問・冒頭サクサク系)。コード無改変、`data.test.js` がデータ駆動で自動検証。

**Tech Stack:** 素 HTML/CSS/JS(ES Modules)・ビルド無し・依存無し。テスト `node --test`。

---

## 設計上の判断 — 統一原理

**冠詞類(Artikelwörter)はすべて [05](定冠詞)か [06](不定冠詞)の変化型のどちらか**で活用する。これを軸に4種を整理する:
- **der型(強変化・der/die/das と同じ語尾)**: `dieser/jener/solcher`(指示)、`welcher`(疑問)、`jeder`(数量・単数)、`alle/viele/manche/einige`(数量・複数)
- **ein型(ein/eine と同じ・男1格/中1格/中4格は語尾ゼロ)**: `mein/dein/sein/ihr/unser/euer/ihr/Ihr`(所有)、`kein`(数量)、`was für ein-`(疑問)。ただし所有冠詞と kein は **複数形を持つ**(ein と違う点)。

### 解説 07 の構成(content/grammar/07-artikelwoerter.md)
1. 大原則:冠詞類は der型 / ein型の2系統。05/06 を知っていれば全部読める。
2. **所有冠詞**:人称→所有冠詞一覧(mein/dein/sein/ihr/unser/euer/ihr/Ihr)、mein- の格変化表、euer→eure の e 脱落、例(Das Auto meines Vaters ist echt cool. / Ich schenke meinen Eltern ein Buch.)。
3. **指示冠詞**:dieser(近)/jener(遠)/solcher(そのような)。独は2段階(日本語の3段階と違う)。der型変化。dieser の用法(強調・時間表現 dieses Jahr / diese Woche / an diesem Tag)。
4. **疑問冠詞**:welcher(特定の集合から「どの」・der型)vs was für ein(不特定「どんな」・ein型)。答えが定/不定。感嘆用法(Was für eine wunderbare Hochzeit!)。
5. **数量冠詞**:alle(100%)>viele(80%)>manche(~50%)>einige(~20%)=複数・der型/ jeder(各・単数のみ・der型)/ kein(ein型・複数あり)。例文。
6. まとめ早見表(der型/ein型の一覧)、❌よくある間違い。**解説に練習問題・解答は書かない**。

検証済み例文(後で独語ファクトチェック必須):Das Auto meines Vaters ist echt cool. / Ich schenke meinen Eltern ein Buch. / Dieses Jahr fahre ich Ski. / An diesem Tag war es warm. / Welchen Wein möchtest du? / Was für ein Auto willst du? / Was für eine wunderbare Hochzeit! / Jedes Kind ist einzigartig. / Alle Menschen sterben. / Manche Politiker machen gute Politik. / Dieses Wort hat viele Bedeutungen. / Ich habe keinen Hund.

### 練習 07 の構成(data/07.json)— 約22問
`data.test.js` 制約:`lesson:"07"`・≥20問・match≥1・instant choice≥1・冒頭6問は match か instant choice・全6タイプ・各問 prompt＋explain・自動採点 accept[0] が自身を通過。
- 冒頭6問:match×2(人称→所有冠詞 / 冠詞類→種類)→ instant choice×4(mein 4格、dieser 中性、近称=dieser、welcher)
- 中盤:choice(jeder/alle/was für ein 感嘆)、fill(meinen Eltern 3格複数・meines Vaters 2格・eure・dieses Jahr)、table(mein- 格変化・dieser der型)
- 終盤:transform(der→diesem 強調・ein→kein 否定・jedes→alle 複数)、free(和訳3問)

---

## Task 1: 解説 `content/grammar/07-artikelwoerter.md` を作成
- 上記構成。冒頭・末尾に練習リンク `> 🔗 **練習問題**: [...](apps/grammar-exercises/?lesson=07)`。03〜06 と同じ見出し様式。例文・冠詞表は標準ドイツ語として確認。

## Task 2: 練習 `apps/grammar-exercises/data/07.json` を作成
- `lesson:"07"`, `title:"07 冠詞類(所有・指示・疑問・数量)"`, `doc:"../../#/grammar/artikelwoerter"`, `intro`。約22問・冒頭サクサク系・全6タイプ・各問 rule＋explain。

## Task 3: 登録と相互リンク
- `js/content.js` grammar に `{slug:"artikelwoerter", title:"07 冠詞類(所有・指示・疑問・数量)", path:"content/grammar/07-artikelwoerter.md"}`、tagline を 01〜07 に。
- `apps/grammar-exercises/js/data.js` の `LESSONS` に `{id:"07", title:"07 冠詞類(所有・指示・疑問・数量)"}`。

## Task 4: 検証 → PR → merge
1. `cd apps/grammar-exercises && node --test`、ルート `node --check js/content.js`＋`node --test tests/*.test.js` → green。
2. 独語ファクトチェック(別エージェント):所有/指示/疑問/数量の全変化表・例文・練習解答。
3. PR(`Refs #10`・epic は close しない)→ rebase merge → epic #10 チェックリスト 07 を [x]・08 プレースホルダ追加。
