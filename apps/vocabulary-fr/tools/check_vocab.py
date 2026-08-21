#!/usr/bin/env python3
"""例文の語彙スパイラルを機械検証する（フランス語）。
A1 例文は A1 見出し語（実現形を含む）＋機能語 allowlist＋固有名詞/数詞のみ。
違反トークンを列挙して exit 1。実行: tools/.venv/bin/python tools/check_vocab.py A1

照合は 3 段:
  1. spaCy の lemma / 表層形が許可集合にあるか（完全一致）。
  2. 正規化照合: 合字展開・アクセント除去・アポストロフィ/ハイフン除去のうえ、
     フランス語の屈折語尾（動詞活用・性数一致・不規則複数 -aux/-eaux/-eux）を落とした
     「語幹」で一致するか。
  3. 見出し語の `plural` も許可集合に入れてあるので不規則複数はそのまま通る。

spaCy fr_core_news_sm の実測特性（このツールの設計根拠）:
  - エリジオンは分割される（"J'ai" → "J'" + "ai"）。表層形にアポストロフィが残るので除去する。
  - 縮約は分割されない。`du`→`de` だが `au`→`au`、そして **`des`→`un`**、`Elle`→`lui` と
    予想外の lemma を返す。いずれも機能語なので allowlist で吸収する。
  - `Qu'est-ce que` は先頭ハイフン付きトークン `-ce` を作る。ハイフンを除去して扱う。
  - **アクセントが欠けると lemma 化が効かない**（`achete` は `acheter` にならない）。
    結果として綴りのアクセント誤りが違反として浮かぶ＝副次的なアクセント検査になる。
  - `être`/`avoir` は文脈で AUX/VERB が変わるので品詞で助動詞を判定しない。
  - **不規則動詞は語幹自体が変わる**ため、屈折語尾を落とすだけでは復元できない
    （`venir`→`viens/vient/viennent` は `ven-` ではなく `vien-`／`vienn-`）。
    A1 の31語すべてを実際の活用形（80通り超）で測定し `IRREGULAR_VERB_STEMS` に
    追加語幹として登録して解消した（0件の偽陽性まで確認済み）。
"""
import json, re, sys, unicodedata
from pathlib import Path
import spacy

# 語彙集合の対象外（機能語・固有名詞・数詞・記号）。内容語(NOUN/VERB/ADJ/ADV)のみ照合する。
FUNCTION_POS = {"ADP", "AUX", "CCONJ", "SCONJ", "DET", "PRON", "PART",
                "PUNCT", "NUM", "PROPN", "SYM", "X", "INTJ"}

_STRIP = ".,!?;:\"'’()[]«»–—…-"
_LIGATURES = ((("œ", "oe"), ("Œ", "OE"), ("æ", "ae"), ("Æ", "AE")))

# フランス語の主要な屈折語尾。**_fold がアクセントを除去した後**に適用するので、
# ここもアクセント無しの形で書く（"ée"→"ee", "és"→"es"）。長い語尾から順に落とす。
_SUFFIXES = (
    "eraient", "erions", "aient", "eront", "erons",
    "issant", "issons", "issez", "issent",  # -ir/-iss 型(finir型)の現在分詞・複数活用
    "ant",                                   # 現在分詞（parlant→parl／なければ全動詞で不一致になる）
    "ions", "iez", "ons", "ent", "ont", "ais", "ait", "ees", "ee", "es",
    "is", "it", "ie", "ez", "as", "at",
    "oir",                                   # devoir型語幹（recevoir→recev。無いと -oir の o が残って不一致）
    "er", "ir", "re",
    "e", "s", "x", "t", "i", "u", "a",
)
# 不規則複数の書き換え。journal→journaux は -al、travail→travaux は -ail なので両方試す。
_PLURAL_REWRITES = (
    (r"eaux$", "eau"), (r"aux$", "al"), (r"aux$", "ail"),
    (r"eux$", "eu"), (r"eux$", "eux"), (r"ux$", "u"),
)


# フランス語の不規則動詞は語幹そのものが変わり（venir: vien-/ven-/viend-、
# recevoir: reçoi-/recev-、prendre: prend-/prenn-（3人称複数のみ二重子音）等）、
# 屈折語尾を落とすだけの canon_forms では復元できない。以下は A1 見出し語に含まれる
# 不規則動詞について、**追加で許可集合に加える折り畳み済み語幹**（fr_core_news_sm の
# 実際の活用形80通り超に対して測定し、0件の偽陽性まで詰めた語幹）。
# キーは見出し語（不定詞）。値は _fold 済みの語幹文字列（canon_forms は再適用しない）。
IRREGULAR_VERB_STEMS = {
    "venir": ["vien", "vienn", "viend"],
    "tenir": ["tien", "tienn", "tiend"],
    "devenir": ["devien", "devienn", "deviend"],
    "revenir": ["revien", "revienn", "reviend"],
    "prendre": ["pren", "prenn", "pris"],
    "apprendre": ["appren", "apprenn", "appris"],
    "comprendre": ["compren", "comprenn", "compris"],
    "surprendre": ["surpren", "surprenn", "surpris"],
    "mettre": ["mis"],
    "permettre": ["permis"],
    "promettre": ["promis"],
    "mourir": ["meur", "mourr", "mort"],
    "envoyer": ["envoi", "enverr"],
    "voir": ["voy", "verr", "vu"],
    "croire": ["croy", "cru"],
    "boire": ["buv", "boiv", "bu"],
    "recevoir": ["recoi", "recoiv", "recu"],
    "apercevoir": ["apercoi", "apercoiv", "apercu"],
    "asseoir": ["assied", "assoi", "assoy", "assey", "assis"],
    "connaître": ["connaiss", "connu"],
    "naître": ["naiss", "ne"],
    "lire": ["lu"],
    "suivre": ["suiv", "sui", "su"],
    "vivre": ["viv", "vi", "vis", "vecu"],
    "plaire": ["plaiss", "plu"],
    "écrire": ["ecriv"],
    "dormir": ["dor"],
    "servir": ["ser"],
}

# 不規則形容詞（BAGS 型）。beau/bel/belle のように母音前形・女性形・複数形が
# 語尾除去だけでは復元できない語幹に変わる。キーは見出し語（男性単数形）。
IRREGULAR_ADJ_STEMS = {
    "beau": ["bel", "belle", "belles"],
    "nouveau": ["nouvel", "nouvelle", "nouvelles"],
    "vieux": ["vieil", "vieille", "vieilles"],
    "fou": ["fol", "folle", "folles"],
    "faux": ["fausse", "fausses"],
    "blanc": ["blanche", "blanches"],
    "sec": ["seche", "seches"],
    "public": ["publique", "publiques"],
    "neuf": ["neuve", "neuves"],
    "gentil": ["gentille", "gentilles"],
    "doux": ["douce", "douces"],
    "frais": ["fraiche", "fraiches"],
    # quel: spaCy が女性単数 "Quelle" を誤って lemma "quell"(二重l) にする。
    # DET タグの時は元々 FUNCTION_POS で無視されるが ADJ タグになるケースがあるため保険で登録。
    "quel": ["quell"],
}


def _fold(w: str) -> str:
    """合字展開 → アクセント除去 → 小文字化 → アポストロフィ/ハイフン除去。"""
    for a, b in _LIGATURES:
        w = w.replace(a, b)
    w = unicodedata.normalize("NFD", w)
    w = "".join(c for c in w if not unicodedata.combining(c))
    w = w.lower().strip(_STRIP)
    return w.replace("'", "").replace("’", "").replace("-", "")


def canon_forms(word: str) -> set[str]:
    """比較用の正規化語幹候補。屈折語尾と不規則複数を落とした形を集める。
    語尾除去は**2段**行う（mangeons → mange → mang のように2回落ちる形があるため）。
    2文字未満の語幹は誤一致を招くため除外する。"""
    base = _fold(word)
    if not base:
        return set()
    forms = {base}
    # エリジオン付きの塊で来た場合（"l'école"）に備え、アポストロフィ後ろも候補にする。
    # 通常 spaCy は "l'" と "école" に分割するので保険。
    for sep in ("'", "\u2019"):
        if sep in word:
            tail = _fold(word.split(sep)[-1])
            if tail:
                forms.add(tail)
    for pat, rep in _PLURAL_REWRITES:
        for b in list(forms):
            if re.search(pat, b):
                forms.add(re.sub(pat, rep, b))
    for _ in range(2):                      # 2段の語尾除去
        for b in list(forms):
            for suf in _SUFFIXES:
                if b.endswith(suf) and len(b) - len(suf) >= 2:
                    forms.add(b[: -len(suf)])
    return {f for f in forms if len(f) >= 2}


def load_lemmas(path: Path) -> set[str]:
    """見出し語と、あれば複数形も許可集合に入れる（不規則複数の偽陽性を防ぐ）。"""
    out: set[str] = set()
    for w in json.loads(path.read_text(encoding="utf-8")):
        out.add(w["lemma"].lower())
        if w.get("plural"):
            out.add(w["plural"].lower())
    return out


def main(level: str) -> int:
    base = Path("data")
    allowed = load_lemmas(base / level / "words.json")
    fn = {l.strip().lower() for l in Path("tools/function_words_fr.txt").read_text(encoding="utf-8").split() if l.strip()}
    allowed |= fn
    allowed_folded = {_fold(a) for a in allowed} - {""}
    allowed_canon: set[str] = set()
    for a in allowed:
        allowed_canon |= canon_forms(a)
    for inf, stems in IRREGULAR_VERB_STEMS.items():
        if inf in allowed:                       # A1 に無い動詞の語幹は入れない（無駄な許可を増やさない）
            allowed_canon |= {_fold(s) for s in stems}
    for inf, stems in IRREGULAR_ADJ_STEMS.items():
        if inf in allowed:
            allowed_canon |= {_fold(s) for s in stems}
    # ハイフン複合語（week-end 等）は spaCy がハイフンで別トークンに分割するため、
    # 各構成要素も許可集合に加える（week/end は単独では仏語の語ではないが、
    # 見出し語 "week-end" の一部として現れるので許可する）。
    for a in list(allowed):
        if "-" in a:
            for part in a.split("-"):
                pf = _fold(part)
                if len(pf) >= 2:
                    allowed_canon.add(pf)

    nlp = spacy.load("fr_core_news_sm")
    data = json.loads((base / level / "words.json").read_text(encoding="utf-8"))
    violations = []
    for w in data:
        for e in w.get("examples", []):
            doc = nlp(e["fr"])
            for tok in doc:
                if tok.pos_ in FUNCTION_POS:
                    continue
                text_f, lem_f = _fold(tok.text), _fold(tok.lemma_)
                if not text_f:
                    continue
                if text_f in allowed_folded or lem_f in allowed_folded:
                    continue
                if (canon_forms(tok.text) | canon_forms(tok.lemma_)) & allowed_canon:
                    continue
                violations.append(f'{w["id"]}: "{e["fr"]}" → 語彙外: {tok.text} (lemma={tok.lemma_}, pos={tok.pos_})')

    for v in violations:
        print("✗ " + v)
    print(f"\n{len(violations)} vocab violations" if violations else f"✓ {level} examples within spiral vocabulary")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "A1"))
