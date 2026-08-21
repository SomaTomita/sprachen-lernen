// FLELex（CEFRLex, UCLouvain）の CEFR レベル判定つき仏語語彙 TSV をパースする。
//
// 取得（再現手順）:
//   curl -sL -o tools/sources/flelex.tsv \
//     https://cental.uclouvain.be/cefrlex/static/resources/fr/FleLex_TT_Beacco.tsv
// 実行:
//   node tools/parse_flelex.mjs tools/sources/flelex.tsv A1 > tools/raw/flelex_a1.json
//
// 列: word, tag, freq_A1..freq_C2, freq_total, level
// 注意1: 改行は CRLF。`\r` を除去しないと level 列が "A1\r" になり全件外れる。
// 注意2: 同一語に品詞ごとの行がある（être は NOM=B1 / VER=A1）。word だけで
//        1行に畳むと基本動詞を取り落とすので、必ず (word, tag) 単位で扱う。
import { readFileSync } from 'node:fs';

export const FLELEX_POS = {
  NOM: 'noun', VER: 'verb', ADJ: 'adjective', ADV: 'adverb', PRO: 'pronoun',
  PRP: 'preposition', 'PRP:det': 'preposition', KON: 'conjunction', INT: 'interjection',
  NUM: 'numeral', 'DET:ART': 'article', 'DET:POS': 'determiner',
};

/** TSV 文字列 → [{lemma, pos, tag, freq}]（指定レベルの行のみ） */
export function parseFlelex(text, level = 'A1') {
  const out = [];
  const seen = new Set();
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].replace(/\r/g, '').split('\t');
    if (cols.length < 10) continue;
    const [word, tag] = cols;
    if (cols[9] !== level) continue;
    const pos = FLELEX_POS[tag];
    if (!pos) continue;
    const key = `${word}${pos}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ lemma: word.toLowerCase(), pos, tag, freq: Number(cols[2]) || 0 });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , src, level = 'A1'] = process.argv;
  if (!src) { console.error('usage: node tools/parse_flelex.mjs <flelex.tsv> [level]'); process.exit(2); }
  const out = parseFlelex(readFileSync(src, 'utf-8'), level);
  const by = {};
  for (const r of out) by[r.pos] = (by[r.pos] || 0) + 1;
  console.error(`${level}: ${out.length} entries ${JSON.stringify(by)}`);
  process.stdout.write(JSON.stringify(out) + '\n');
}
