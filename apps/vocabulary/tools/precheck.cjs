// 音声生成前の構造プリチェック（audio/timing は対象外）。
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/A1/words.json'), 'utf8'));
let errors = 0, totalEx = 0;
const fail = (id, msg) => { console.error(`✗ ${id}: ${msg}`); errors++; };
for (const w of data) {
  if (!w.id || !w.lemma || !w.pos || !w.level) fail(w.id || '?', 'missing core field');
  if (w.pos === 'noun' && !w.article) fail(w.id, 'noun missing article');
  if (!Array.isArray(w.meanings) || !w.meanings.length) fail(w.id, 'no meanings');
  for (const m of w.meanings || []) if (!m.ja || !m.en) fail(w.id, 'meaning missing ja/en');
  const need = (w.meanings && w.meanings.length >= 2) ? 3 : 2;
  if (!Array.isArray(w.examples) || w.examples.length < need) fail(w.id, `need >=${need} examples, has ${(w.examples||[]).length}`);
  for (const e of w.examples || []) {
    totalEx++;
    if (!e.de || !e.ja || !e.en) fail(w.id, 'example missing de/ja/en');
  }
}
console.log(`words: ${data.length}, total examples: ${totalEx}, errors: ${errors}`);
process.exit(errors ? 1 : 0);
