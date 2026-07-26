# 変更ログ — vocabulary-nl

計画本体: リポジトリ直下 `docs/plans/2026-07-21-vocabulary-nl-a1-a2.md`（ユーザー指定でルート docs 配下に保存）。

- 2026-07-23 独語アプリ `apps/vocabulary/` を複製して蘭語アプリを新設。例文フィールド `de`→`nl`、冠詞 de/het、蘭語スラッグ、localStorage `nederlands-vocab-v1`、音声 `nl-NL-ColetteNeural`。
- 2026-07-23 スラッグ・seed ビルダ・語彙 allowlist を TDD で追加。語彙スパイラル検証 `check_vocab.py`（spaCy `nl_core_news_sm`＋形態素正規化フォールバック）を追加。
- 2026-07-23 **A1 パイロット（40語）** を全工程で実施: 公式 numo A0–A1 PDF から見出し語→seed→例文80文（A1天井＋スパイラル語彙厳守）→文法検証(LLM, 0違反)→語彙検証(check_vocab, 0違反)→lemma+例文音声(nl-NL, 120 mp3)→UI 目視(カラオケ・reader 正常, console error 0)。パイロットで判明: check_vocab の spaCy 小モデルは活用形の偽陽性が出る→形態素正規化で吸収（残存限界は sentence_pipeline.md に記載）。
- 2026-07-26 **A1 本番化**: numo A0–A1 PDF から全766語を収集・glossし（11バッチ並列）、独立した article 検証パス（540名詞）を実施 → 修正14件（すべて「複数形見出し語の冠詞は de」の統一。実際の性の誤りは0件）。
- 2026-07-26 **語彙カバレッジの是正**: numo リストは主題別で高頻度コア語が欠落していると判明（NT2 頻度リスト上位100語のうち55語、上位200語のうち124語が不在＝`niet/en/goed/doen/komen/maken/kind/man/vrouw` 等）。NT2 TaalMenu 頻度リスト（`engels_fre.pdf`）の上位200帯から欠落124語を補完し **A1 = 890語**。頻度リスト200位以降の欠落語は A2 候補プール。
- **既知の限界（A1 語彙の切り方）**: A1 は「numo 全語＋頻度リスト上位200帯」で確定した（890語）。そのため頻度ランク200位以降の日常語（`school / dokter / snel / open / lekker / nodig / links / rechts / pijn / jas / broek` 等）は **A1 に含まれず A2 送り**。A1 例文でこれらを使えないため一部の例文は最も自然な共起語を避けている（例: 「痛い」を使わず `De darmen zitten in de buik.`）。スパイラル設計上 A2 例文では A1∪A2 が使えるので、A2 でこれらが登場して自然さが回復する。**A1 の例文生成をやり直す場合は、この帯の語を A1 に足すか否かを先に決めること**（語彙を後から足すと例文の再生成が必要になる）。
- 語彙ソース: numo NT2 A0–A1 PDF（主題別・一次）＋ NT2 TaalMenu 頻度リスト（コア語補完）。文法天井は Taalprofielen 準拠（要継続裏取り）。
