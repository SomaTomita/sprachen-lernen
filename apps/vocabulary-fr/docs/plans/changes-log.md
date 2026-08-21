# 変更ログ — vocabulary-fr

計画本体: `docs/plans/2026-08-09-vocabulary-fr-a1.md`

- 2026-08-21 蘭語アプリ `apps/vocabulary-nl/` を複製して仏語アプリを新設。例文フィールド `nl`→`fr`、冠詞 `le`/`la`、localStorage `francais-vocab-v1`、音声 `fr-FR-DeniseNeural`。`LEVELS` は `['A1']`（データのあるレベルのみ）。
- 2026-08-21 **語彙ソースの事前確認（実データ）**: FLELex A1 = **1247語**（noun 633 / verb 262 / adjective 168 / adverb 93 / pronoun 34 / preposition 25 / conjunction 14 / interjection 10 / determiner 6 / article 2）。計画の想定と一致。
- 2026-08-21 **性(le/la)は Lexique383 から 595/633 (94%) が自動取得できる**、複数形は 579/633。**蘭語版では540名詞すべてを LLM 推定＋検証したが、仏語は残り38語のみ手当てで済む。**
  - 残り38語の内訳（要注意）:
    - **両性名詞（epicene）**: `adulte / aide / collègue / copine / journaliste / élève` 等 — Lexique の genre が空。文脈で le/la が変わるので既定を決めて注記する。
    - **同形異義（性で意味が変わる）**: `livre`（le livre=本 / la livre=ポンド）, `mode`（le mode=方法 / la mode=流行）, `pas`（le pas=歩 / 否定辞） — A1 として教える語義に合わせて性を決める。
    - **FLELex の品詞誤り**: `chère / drôle / gauche / pauvre / jeune / nouvelle` は NOM とタグされているが実際は**形容詞**。gloss パスで `pos` を訂正する。
    - **複数専用**: `gens`（複数のみ）。
- 2026-08-21 **パーサ実装と語彙リスト構築**: `parse_flelex.mjs`（CRLF・同形異義を品詞別に扱う）と `parse_lexique.mjs`（性・複数形）を TDD で追加。FLELex A1 = 1247語（内訳が事前確認と完全一致）、Lexique = 46,947 lemma（28,957 に le/la）。名詞の性は 595/633 が自動取得、欠落38語。
- 2026-08-21 **頻度クロスチェックの結果: 補完不要と判断。** Lexique 頻度上位100語のうち A1 に無いのは17語だが、**すべて A1 に既にある lemma の屈折形・エリジオン形**（`les/des/aux`←le/de/à、`sa/ses/ma/mes`←son/mon、`ils/elles`←il/elle、`cette/cet/ces`←ce、`l'/d'/t'/s'`）。基本動詞（être/avoir/aller/faire/vouloir/pouvoir/devoir/savoir/dire/venir/voir/prendre）は全て在。**蘭語版では上位100語のうち55語が真に欠落していたのに対し、仏語 FLELex には穴が無い。**
- 2026-08-21 **ただし数詞は欠落していたので補完（26語）。** FLELex は数詞を `NOM` としか扱わず、`deux`/`trois`/`cinq`/`dix` を **B2**、`six` を **C1** に格付けし、`huit`/`vingt`/`fois` は**収録すら無い**。これはコーパス上で数が算用数字で現れるための方法論的アーティファクトであり、CEFR 判定としては使えない。**DELF A1 は年齢・値段・日付・時刻で数を必須とする**ため、基数詞（zéro〜vingt, trente〜soixante, cent, mille）と `fois` を追加した → **A1 = 1273語**。
  - `neuf` は既に形容詞（=new）として A1 にあるため数詞9の重複エントリは作らず、gloss で `meanings` に両語義を併記する（`meanings.length>=2` → 例文3文以上で各語義をカバー）。
- 2026-08-21 `check_vocab.py` をフランス語形態論に書き換え（合字展開・アクセント除去・アポストロフィ/ハイフン除去・**2段の語尾除去**・不規則複数 `-aux→-al/-ail`・見出し語の複数形も許可集合に投入）。精度実測: **屈折形 37/37 通過・語彙外 10/10 検出**。アクセント欠落も lemma 化されないため**副次的にアクセント検査として機能する**。
- 2026-08-22 **グロス完了（1,222語）**: 4エージェント×5バッチで並列実行。検証は全項目 0 件（名詞の le/la 欠落0・非名詞への article 0・ja/en 欠落0・です/ます 0・meanings 不整合0）。同綴り異品詞49語は `meanings` 配列で複数語義を保持。
  - **FLELex の品詞タグ誤りを約25件訂正**: 形容詞を NOM としていたもの（`chère` `drôle` `gauche` `pauvre` `jeune` `nouvelle` `vieux` `fou` `long` `sportif` `premier`、国籍形容詞 `espagnol` `italien`）、`chaque`→determiner、`rien`/`tout`→pronoun、`si`→conjunction、`un`/`le`→article、`ensemble`/`mal`→adverb、`boulanger`→noun（逆方向の誤り）など。**FLELex の品詞は信頼できないという前提で扱うこと。**
- 2026-08-22 **Lexique パーサのバグを3段階で修正**（いずれも「行順に依存して任意の行を拾う」同一の根本原因）:
  1. 性と複数形を**別の性の行**から拾っていた（`le ami` に女性複数 `amies`、`amoureux` は先頭が女性形で性ごと誤り）。A1名詞634のうち**32件**該当 → `ortho == lemme` の行を基準にし複数形は同性の行から。
  2. 基準行の genre が**空**のとき別綴りの行から性を借りていた（`professeur` の基準行は genre 空 → 女性形 `professeure` の f を借りて **`la professeur`**）。→ 空なら null を返し gloss に補わせる。**誤った性より「不明」の方が良い。**
  3. 同性で複数形の綴りが2つある語で稀な方を拾っていた（`lieu`→`lieus`(魚) / `oeil`→`oeils`）。→ **語形頻度**が最大のものを選ぶ。
  それぞれ回帰テストを追加。
- 2026-08-22 **`build_seed` がアクセント違いの別語を無言で7語落としていた** — 重大。アクセントを除去した slug が衝突するため（`ou`/`où`、`sur`/`sûr`、`marche`/`marché`、`côte`/`côté`、`âge`/`âgé`、`pâte`/`pâté`、`la`/`là`）、`if(!byId.has(id))` の先勝ちで **`où`(どこ) や `sûr`(確かな) といった A1 必須語が消えていた**。
  → `accentSignature()`（`où`→`ug`、`sûr`→`uc`、`marché`→`ea`）を導入し、**衝突した組だけ** id に署名を付けて区別（`a1-ou` / `a1-ou-ug`）。解決できない衝突は**例外**にして黙って失わない。真の重複 lemma も例外。テスト追加。**A1 = 1,222語（1,215語ではない）。**
