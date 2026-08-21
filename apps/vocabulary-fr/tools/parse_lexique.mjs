// Lexique 3.83（lexique.org）から見出し語ごとの 性 / 複数形 / 頻度 を取り出す。
//
// 取得（再現手順）:
//   curl -sL -o tools/sources/Lexique383.tsv http://www.lexique.org/databases/Lexique383/Lexique383.tsv
// 実行:
//   node tools/parse_lexique.mjs tools/sources/Lexique383.tsv > tools/raw/lexique.json
//
// 使う列: ortho(表層) / lemme(見出し) / cgram(品詞) / genre(m,f) / nombre(s,p) / freqlemlivres
// 性は genre 列から le/la に落とす。複数形は同じ lemme の nombre=p 行の ortho を採る
// （journal→journaux のような不規則も自然に拾える）。
import { readFileSync } from 'node:fs';

/** TSV 文字列 → Map<lemma, {article, plural, cgram, freq}> */
export function parseLexique(text) {
  const lines = text.split('\n');
  const head = lines[0].replace(/\r/g, '').split('\t');
  const ix = (name) => head.indexOf(name);
  const [iO, iL, iC, iG, iN, iF] =
    ['ortho', 'lemme', 'cgram', 'genre', 'nombre', 'freqlemlivres'].map(ix);

  const out = new Map();
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].replace(/\r/g, '').split('\t');
    if (c.length <= iF) continue;
    const lemma = (c[iL] || '').toLowerCase();
    if (!lemma) continue;
    const cgram = c[iC] || '';
    const isNoun = cgram === 'NOM';
    const rec = out.get(lemma) || { article: null, plural: null, cgram, freq: Number(c[iF]) || 0 };
    if (isNoun && !rec.article) {
      if (c[iG] === 'f') rec.article = 'la';
      else if (c[iG] === 'm') rec.article = 'le';
    }
    if (isNoun && c[iN] === 'p' && !rec.plural) rec.plural = c[iO];
    out.set(lemma, rec);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node tools/parse_lexique.mjs <Lexique383.tsv>'); process.exit(2); }
  const lx = parseLexique(readFileSync(src, 'utf-8'));
  const withArt = [...lx.values()].filter(r => r.article).length;
  console.error(`${lx.size} lemmas (${withArt} with le/la)`);
  process.stdout.write(JSON.stringify(Object.fromEntries(lx)) + '\n');
}
