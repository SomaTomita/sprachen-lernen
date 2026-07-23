# 変更ログ — vocabulary-nl

計画本体: リポジトリ直下 `docs/plans/2026-07-21-vocabulary-nl-a1-a2.md`（ユーザー指定でルート docs 配下に保存）。

- 2026-07-23 独語アプリ `apps/vocabulary/` を複製して蘭語アプリを新設。例文フィールド `de`→`nl`、冠詞 de/het、蘭語スラッグ、localStorage `nederlands-vocab-v1`、音声 `nl-NL-ColetteNeural`。
- 2026-07-23 スラッグ・seed ビルダ・語彙 allowlist を TDD で追加。語彙スパイラル検証 `check_vocab.py`（spaCy `nl_core_news_sm`＋形態素正規化フォールバック）を追加。
- 2026-07-23 **A1 パイロット（40語）** を全工程で実施: 公式 numo A0–A1 PDF から見出し語→seed→例文80文（A1天井＋スパイラル語彙厳守）→文法検証(LLM, 0違反)→語彙検証(check_vocab, 0違反)→lemma+例文音声(nl-NL, 120 mp3)→UI 目視(カラオケ・reader 正常, console error 0)。パイロットで判明: check_vocab の spaCy 小モデルは活用形の偽陽性が出る→形態素正規化で吸収（残存限界は sentence_pipeline.md に記載）。
- 語彙ソース: numo NT2 A0–A1 PDF（一次）。文法天井は Taalprofielen 準拠（要継続裏取り）。
