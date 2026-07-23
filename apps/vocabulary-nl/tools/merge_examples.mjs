// 例文ファイル { "<id>": [ {nl,ja,en}, ... ] } を words.json にマージ（イミュータブル）。
// 実行: node tools/merge_examples.mjs A1 tools/raw/a1_examples.json
import { readFileSync, writeFileSync } from 'node:fs';

const [, , level, exFile] = process.argv;
if (!level || !exFile) { console.error('usage: node tools/merge_examples.mjs <level> <examples.json>'); process.exit(2); }

const words = JSON.parse(readFileSync(`data/${level}/words.json`, 'utf-8'));
const ex = JSON.parse(readFileSync(exFile, 'utf-8'));

let missing = 0;
const out = words.map(w => {
  const e = ex[w.id];
  if (!e || !Array.isArray(e) || !e.length) { console.error(`✗ no examples for ${w.id}`); missing++; return w; }
  return { ...w, examples: e };
});

if (missing) { console.error(`\n${missing} words missing examples — aborting write`); process.exit(1); }
writeFileSync(`data/${level}/words.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`✓ merged examples into ${out.length} words → data/${level}/words.json`);
