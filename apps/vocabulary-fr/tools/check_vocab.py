#!/usr/bin/env python3
"""例文の語彙スパイラルを機械検証する。
A1 例文は A1 見出し語のみ、A2 例文は A1∪A2 見出し語のみ（＋機能語 allowlist＋固有名詞/数詞）。
違反トークンを列挙して exit 1。実行: tools/.venv/bin/python tools/check_vocab.py A1

照合は 3 段:
  1. spaCy lemma / 表層形が許可集合にあるか（完全一致）。
  2. 正規化照合: 語尾変化・複数・二重母音・有声無声の揺れを吸収した「語幹」で一致するか。
     （spaCy 小モデルは "werk"→"werken" のような蘭語活用の見出し語化を外すため、その偽陽性を吸収する。）
これでも外れた内容語だけを違反として報告する。精度が要れば nl_core_news_md/lg へ。
"""
import json, re, sys
from pathlib import Path
import spacy

# 語彙集合の対象外（機能語・固有名詞・数詞・記号）。内容語(NOUN/VERB/ADJ/ADV)のみ照合する。
FUNCTION_POS = {"ADP", "AUX", "CCONJ", "SCONJ", "DET", "PRON", "PART",
                "PUNCT", "NUM", "PROPN", "SYM", "X", "INTJ"}
_PUNCT = ".,!?;:\"'()[]«»–—-…"
_VOWEL2 = re.compile(r"(aa|ee|oo|uu)")
_SUFFIXES = ("eren", "'s", "en", "s", "e", "t", "n")  # 蘭語の主要な屈折語尾（-eren は kinderen/eieren 型）


def _canon(w: str) -> str:
    """二重母音の単母音化(aa→a)・有声無声の正規化(z→s, v→f)・末尾重子音の単一化。
    蘭語は短母音動詞で語幹末子音が重なる（krabben↔krabt / zitten↔zit / liggen↔ligt /
    pakken↔pakt）ため、末尾の重子音を1つに畳んで両者を同じ語幹に落とす。"""
    w = _VOWEL2.sub(lambda m: m.group(0)[0], w)
    w = w.replace("z", "s").replace("v", "f")
    if len(w) >= 3 and w[-1] == w[-2] and w[-1] not in "aeiou":
        w = w[:-1]
    return w


def canon_forms(word: str) -> set[str]:
    """表層形/見出し語から比較用の正規化語幹候補（無語尾＋主要語尾を落とした形）を作る。
    両側を同じ規則で語幹化するので、活用形と不定詞/単数が共通語幹で一致する
    （eten↔eet→"et"、lopen↔loopt→"lop"、huis↔huizen→"huis"、groot↔grote→"grot"）。
    2文字未満の語幹は誤一致を招くため除外する。"""
    w = word.lower().strip(_PUNCT)
    bases = {w}
    if w.startswith("ge") and len(w) > 4:  # 規則的な過去分詞 gewerkt→werk など
        bases.add(w[2:])
    forms = set(bases)
    for b in bases:
        for suf in _SUFFIXES:
            if b.endswith(suf) and len(b) - len(suf) >= 2:
                forms.add(b[: -len(suf)])
    # koe→koeien 型: -en を落とした語幹の末尾 i も落として koe に合わせる
    for f in list(forms):
        if f.endswith("i") and len(f) >= 3:
            forms.add(f[:-1])
    return {_canon(f) for f in forms if len(f) >= 2}


def load_lemmas(path: Path) -> set[str]:
    return {w["lemma"].lower() for w in json.loads(path.read_text(encoding="utf-8"))}


# 分離動詞の前つづり。主文では分離して現れる（"Ik check in." / "Ik sta op."）ため、
# spaCy は残った本体だけを lemma 化する（inchecken → check）。本体側も許可語幹に加える。
_PARTICLES = ("aan", "achter", "af", "bij", "binnen", "door", "in", "langs", "mee", "na",
              "neer", "om", "onder", "op", "over", "rond", "samen", "terug", "tegen",
              "toe", "uit", "van", "voor", "weg")


def separable_stems(path: Path) -> set[str]:
    """分離動詞見出し語の「本体」語幹を返す（inchecken→checken, opstaan→staan）。"""
    stems: set[str] = set()
    for w in json.loads(path.read_text(encoding="utf-8")):
        if w.get("pos") != "verb":
            continue
        lem = w["lemma"].lower()
        for p in _PARTICLES:
            if lem.startswith(p) and len(lem) - len(p) >= 4:
                stems.add(lem[len(p):])
                break
    return stems


def main(level: str) -> int:
    base = Path("data")
    allowed = load_lemmas(base / "A1" / "words.json")
    if level == "A2":
        allowed |= load_lemmas(base / "A2" / "words.json")
    fn = {l.strip().lower() for l in Path("tools/function_words_nl.txt").read_text(encoding="utf-8").split() if l.strip()}
    allowed |= fn
    # 分離動詞の本体語幹も許可（"Ik check in." の check ← inchecken）
    seps = separable_stems(base / "A1" / "words.json")
    if level == "A2":
        seps |= separable_stems(base / "A2" / "words.json")
    allowed_canon: set[str] = set()
    for a in allowed | seps:
        allowed_canon |= canon_forms(a)

    nlp = spacy.load("nl_core_news_sm")
    data = json.loads((base / level / "words.json").read_text(encoding="utf-8"))
    violations = []
    for w in data:
        for e in w.get("examples", []):
            doc = nlp(e["nl"])
            for tok in doc:
                if tok.pos_ in FUNCTION_POS:
                    continue
                text = tok.text.lower().strip(_PUNCT)
                lem = tok.lemma_.lower().strip(_PUNCT)
                if not text:
                    continue
                if lem in allowed or text in allowed:
                    continue
                if (canon_forms(text) | canon_forms(lem)) & allowed_canon:
                    continue
                violations.append(f'{w["id"]}: "{e["nl"]}" → 語彙外: {tok.text} (lemma={tok.lemma_}, pos={tok.pos_})')

    for v in violations:
        print("✗ " + v)
    print(f"\n{len(violations)} vocab violations" if violations else f"✓ {level} examples within spiral vocabulary")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "A1"))
