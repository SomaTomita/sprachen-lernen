// tools/validate_data.mjs — オランダ語スキーマ検証（例文フィールドは nl、冠詞は de/het）
import { readFileSync } from 'node:fs';

const level = process.argv[2] || 'A1';
const data = JSON.parse(readFileSync(`data/${level}/words.json`, 'utf-8'));

let errors = 0;
const fail = (id, msg) => { console.error(`✗ ${id}: ${msg}`); errors++; };
const seen = new Set();

for (const w of data) {
  if (!w.id || !w.lemma || !w.pos || !w.level) fail(w.id || '?', 'missing core field');
  if (w.level !== level) fail(w.id, `level mismatch (expected ${level})`);
  if (seen.has(w.id)) fail(w.id, 'duplicate id');
  seen.add(w.id);
  if (w.pos === 'noun') {
    if (!w.article) fail(w.id, 'noun missing article');
    else if (w.article !== 'de' && w.article !== 'het') fail(w.id, `article must be de|het (got ${w.article})`);
  }
  if (w.article && w.pos !== 'noun') fail(w.id, 'article on non-noun');
  if (!Array.isArray(w.meanings) || !w.meanings.length) fail(w.id, 'no meanings');
  for (const m of w.meanings || []) if (!m.ja || !m.en) fail(w.id, 'meaning missing ja/en');
  const need = (w.meanings && w.meanings.length >= 2) ? 3 : 2;
  if (!Array.isArray(w.examples) || w.examples.length < need) fail(w.id, `need >=${need} examples`);
  for (const e of w.examples || []) {
    if (!e.nl || !e.ja || !e.en) fail(w.id, 'example missing text (nl/ja/en)');
    // audio/timing は音声生成後に必須化。生成前フェーズでは第2引数 --no-audio で緩める。
    if (!process.argv.includes('--no-audio')) {
      if (!e.audio) fail(w.id, 'example missing audio');
      if (!Array.isArray(e.timing) || !e.timing.length) fail(w.id, 'example missing timing');
    }
  }
}
console.log(errors ? `\n${errors} errors` : `✓ ${data.length} words valid`);
process.exit(errors ? 1 : 0);
