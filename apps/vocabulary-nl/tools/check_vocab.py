#!/usr/bin/env python3
"""例文の語彙スパイラルを機械検証する。
A1 例文は A1 見出し語のみ、A2 例文は A1∪A2 見出し語のみ（＋機能語 allowlist＋固有名詞/数詞）。
違反トークンを列挙して exit 1。実行: tools/.venv/bin/python tools/check_vocab.py A1
"""
import json, sys
from pathlib import Path
import spacy

FUNCTION_POS = {"ADP", "AUX", "CCONJ", "SCONJ", "DET", "PRON", "PART", "PUNCT",
                "NUM", "PROPN", "SYM", "X", "INTJ"}  # 語彙集合の対象外（機能語・固有名詞・数詞）

def load_lemmas(path: Path) -> set[str]:
    return {w["lemma"].lower() for w in json.loads(path.read_text(encoding="utf-8"))}

def main(level: str) -> int:
    base = Path("data")
    allowed = load_lemmas(base / "A1" / "words.json")
    if level == "A2":
        allowed |= load_lemmas(base / "A2" / "words.json")
    fn = {l.strip().lower() for l in Path("tools/function_words_nl.txt").read_text(encoding="utf-8").split() if l.strip()}
    allowed |= fn

    nlp = spacy.load("nl_core_news_sm")
    data = json.loads((base / level / "words.json").read_text(encoding="utf-8"))
    violations = []
    for w in data:
        # 見出し語自身とその実現形は当然許可（分離動詞の particle も許可）
        head = {w["lemma"].lower()}
        for e in w.get("examples", []):
            doc = nlp(e["nl"])
            for tok in doc:
                if tok.pos_ in FUNCTION_POS:
                    continue
                lem = tok.lemma_.lower()
                if lem in allowed or lem in head or tok.text.lower() in allowed:
                    continue
                violations.append(f'{w["id"]}: "{e["nl"]}" → 語彙外: {tok.text} (lemma={lem}, pos={tok.pos_})')

    for v in violations:
        print("✗ " + v)
    print(f"\n{len(violations)} vocab violations" if violations else f"✓ {level} examples within spiral vocabulary")
    return 1 if violations else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "A1"))
