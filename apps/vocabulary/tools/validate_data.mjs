// tools/validate_data.mjs
import { readFileSync } from 'node:fs';
const level = process.argv[2] || 'A1';
const data = JSON.parse(readFileSync(`data/${level}/words.json`, 'utf-8'));
let errors = 0;
const fail = (id, msg) => { console.error(`✗ ${id}: ${msg}`); errors++; };
for (const w of data) {
  if (!w.id || !w.lemma || !w.pos || !w.level) fail(w.id || '?', 'missing core field');
  if (w.pos === 'noun' && !w.article) fail(w.id, 'noun missing article');
  if (!Array.isArray(w.meanings) || !w.meanings.length) fail(w.id, 'no meanings');
  for (const m of w.meanings || []) if (!m.ja || !m.en) fail(w.id, 'meaning missing ja/en');
  const need = (w.meanings && w.meanings.length >= 2) ? 3 : 2;
  if (!Array.isArray(w.examples) || w.examples.length < need) fail(w.id, `need >=${need} examples`);
  for (const e of w.examples || []) {
    if (!e.de || !e.ja || !e.en) fail(w.id, 'example missing text');
    if (!e.audio) fail(w.id, 'example missing audio');
    if (!Array.isArray(e.timing) || !e.timing.length) fail(w.id, 'example missing timing');
  }
}
console.log(errors ? `\n${errors} errors` : `✓ ${data.length} words valid`);
process.exit(errors ? 1 : 0);
