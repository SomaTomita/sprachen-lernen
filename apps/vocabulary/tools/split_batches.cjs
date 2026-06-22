// seed を生成バッチに分割。先頭20語は生成済み(A1/words.json)なのでスキップ。
// 使い方: node tools/split_batches.cjs [batchSize=48]
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/a1_seed.json'), 'utf8'));
const DONE = 20; // 先頭20語は A1/words.json に生成済み
const SIZE = Number(process.argv[2] || 48);
const rest = seed.slice(DONE);
const dir = path.join(ROOT, 'tools/batches');
fs.mkdirSync(dir, { recursive: true });
let n = 0;
for (let i = 0; i < rest.length; i += SIZE) {
  n++;
  const slice = rest.slice(i, i + SIZE);
  const name = `seed-${String(n).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(dir, name), JSON.stringify(slice, null, 2) + '\n');
  console.log(`${name}: ${slice.length} words (seed idx ${DONE + i}..${DONE + i + slice.length - 1})`);
}
console.log(`total batches: ${n}, remaining words: ${rest.length}, done(first): ${DONE}`);
