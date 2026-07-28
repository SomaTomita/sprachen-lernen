// numo NT2 語彙リスト PDF（公式）の抽出テキストから {lemma, pos} を取り出す。
//
// 取得と前処理（再現手順）:
//   curl -sL -o /tmp/numo-a0a1.pdf https://assets.numo.nl/wp/Woordenlijst-nt2.pdf
//   curl -sL -o /tmp/numo-a1a2.pdf https://assets.numo.nl/wp/Woordenlijst-nt2-modules-A1-A2.pdf
//   pdftotext -layout /tmp/numo-a0a1.pdf /tmp/numo-a0a1.txt      # poppler
// 実行:
//   node tools/parse_numo.mjs /tmp/numo-a0a1.txt > tools/raw/numo_a0a1.json
//
// PDF は「単語 | 技能/ルーブリック | 練習 | 品詞」の表。列の開始位置はページごとに違うので、
// 2 個以上の空白の連続で列を分割する（固定桁で切ると別ページで崩れる）。
// 品詞ラベルは複合形（"bijvoeglijk naamwoord of bijwoord" 等）があるため優先順で判定する。
import { readFileSync } from 'node:fs';

// 優先順が重要: "bijvoeglijk naamwoord" は "naamwoord" を含むので先に判定する。
const POS_RULES = [
  ['bijvoeglijk naamwoord', 'adjective'],
  ['voornaamwoord', 'pronoun'],
  ['zelfstandig naamwoord', 'noun'],
  ['werkwoord', 'verb'],
  ['voorzetsel', 'preposition'],
  ['voegwoord', 'conjunction'],
  ['bijwoord', 'adverb'],
  ['telwoord', 'numeral'],
  ['lidwoord', 'article'],
  ['tussenwerpsel', 'interjection'],
];

/** 品詞ラベル → 内部 pos。対象外（vaste constructie / grammaticaal begrip 等）は null。 */
export function classifyPos(label) {
  for (const [needle, pos] of POS_RULES) if (label.includes(needle)) return pos;
  return null;
}

/** 見出し語として採用するか（単一トークン・ラテン文字のみ）。 */
export function isUsableLemma(word) {
  if (!word || /\s/.test(word)) return false;              // 複合表現は採らない
  return /^[a-zäëïöüáéèçíóú'-]+$/i.test(word);
}

/** pdftotext -layout の出力テキスト → [{lemma, pos}]（lemma で重複排除、初出優先） */
export function parseNumoText(text) {
  const found = new Map();
  for (const line of text.split('\n')) {
    const cols = line.trimEnd().split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
    if (cols.length < 3) continue;                          // 表の行ではない
    const lemma = cols[0].toLowerCase();
    const pos = classifyPos(cols[cols.length - 1]);         // 品詞は最終列
    if (!pos || !isUsableLemma(lemma)) continue;
    if (!found.has(lemma)) found.set(lemma, { lemma, pos });
  }
  return [...found.values()];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node tools/parse_numo.mjs <pdftotext-output.txt>'); process.exit(2); }
  const out = parseNumoText(readFileSync(src, 'utf-8'));
  const by = {};
  for (const w of out) by[w.pos] = (by[w.pos] || 0) + 1;
  console.error(`parsed ${out.length} lemmas: ${JSON.stringify(by)}`);
  process.stdout.write(JSON.stringify(out) + '\n');
}
