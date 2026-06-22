// A1/parts/words-*.json（00=パイロット20語, 01..16=本番）を順に結合して A1/words.json を再生成。
// 再実行可能（常に parts から再構築）。使い方: node tools/merge_parts.cjs
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'data/A1/parts');
const files = fs.readdirSync(dir).filter(f => /^words-\d+\.json$/.test(f)).sort();
let all = [];
for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!Array.isArray(arr)) { console.error(`${f}: not an array`); process.exit(1); }
  all = all.concat(arr);
  console.log(`${f}: ${arr.length}`);
}
const ids = all.map(w => w.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) { console.error('DUPLICATE ids:', [...new Set(dup)]); process.exit(1); }
const outPath = path.join(ROOT, 'data/A1/words.json');
// 再発防止ガード: 音声付き words.json を、音声なし parts で上書きしない。
// parts は de/ja/en のみ。audio/timing は tts_generate.py、lemmaAudio は tts_lemma.py が words.json に直接付与する。
if (fs.existsSync(outPath) && !process.argv.includes('--force')) {
  const cur = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const curHasAudio = cur.some(w => w.lemmaAudio || (w.examples || []).some(e => e.audio || (e.timing && e.timing.length)));
  const newHasAudio = all.some(w => w.lemmaAudio || (w.examples || []).some(e => e.audio));
  if (curHasAudio && !newHasAudio) {
    console.error('REFUSING: data/A1/words.json は音声付き、parts は音声なし。上書きすると audio/timing/lemmaAudio が失われます。意図的なら --force。');
    process.exit(1);
  }
}
fs.writeFileSync(outPath, JSON.stringify(all, null, 2) + '\n');
console.log(`merged ${all.length} words into data/A1/words.json (parts: ${files.length}, unique ids: ${new Set(ids).size})`);
