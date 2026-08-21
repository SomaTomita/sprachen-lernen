// FLELex（レベル判定）× Lexique383（性・複数形）→ seed 素データ JSONL。
// 実行: node tools/build_wordlist.mjs tools/raw/flelex_a1.json tools/raw/lexique.json A1 > tools/raw/a1.jsonl
import { readFileSync } from 'node:fs';

const [, , flelexPath, lexiquePath, level = 'A1'] = process.argv;
const flelex = JSON.parse(readFileSync(flelexPath, 'utf-8'));
const lexique = JSON.parse(readFileSync(lexiquePath, 'utf-8'));

const missingGender = [];
const rows = flelex.map(r => {
  const lx = lexique[r.lemma] || {};
  const row = { lemma: r.lemma, pos: r.pos };
  if (r.pos === 'noun') {
    if (lx.article) row.article = lx.article;
    else missingGender.push(r.lemma);
    if (lx.plural && lx.plural !== r.lemma) row.plural = lx.plural;
  }
  return row;
});

console.error(`${rows.length} words | nouns missing gender: ${missingGender.length}`);
if (missingGender.length) console.error('  ' + missingGender.join(', '));
process.stdout.write(rows.map(r => JSON.stringify(r)).join('\n') + '\n');
