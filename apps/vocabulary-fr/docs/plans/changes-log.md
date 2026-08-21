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
