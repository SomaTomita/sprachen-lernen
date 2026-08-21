// 検証パスで出た修正を words.json と seed(JSONL) に適用する。
// 実行: node tools/apply_fixes.mjs A1
//  1) tools/raw/a1_fixes.json の per-sentence 修正（fr/ja/en を差し替え）
//  2) 見出し語の正書法修正があれば SPELLING に追記して同様に適用する（現状フランス語は無し）
import { readFileSync, writeFileSync } from 'node:fs';
import { slugId } from './slug.mjs';

const level = process.argv[2] || 'A1';
const words = JSON.parse(readFileSync(`data/${level}/words.json`, 'utf-8'));
const fixesPath = `tools/raw/${level.toLowerCase()}_fixes.json`;
const fixes = JSON.parse(readFileSync(fixesPath, 'utf-8'));

// --- 1) per-sentence 修正 -----------------------------------------------
const byId = new Map();
for (const fx of fixes) {
  if (!byId.has(fx.id)) byId.set(fx.id, []);
  byId.get(fx.id).push(fx);
}
let applied = 0;
const unmatched = [];
let out = words.map(w => {
  const list = byId.get(w.id);
  if (!list) return w;
  const examples = w.examples.map(e => {
    const fx = list.find(x => x.match === e.fr);
    if (!fx) return e;
    applied++;
    const next = { ...e };
    if (fx.fr) next.fr = fx.fr;
    if (fx.ja) next.ja = fx.ja;
    if (fx.en) next.en = fx.en;
    // 文が変わったら音声とタイミングは無効
    if (fx.fr && fx.fr !== e.fr) { delete next.audio; delete next.timing; }
    return next;
  });
  for (const fx of list) if (!w.examples.some(e => e.fr === fx.match)) unmatched.push(`${fx.id}: ${fx.match}`);
  return { ...w, examples };
});

// --- 2) 見出し語の正書法（公式綴りへの一括置換。今は無し。将来必要になれば追記） --------
const SPELLING = [];
const renames = [];
for (const sp of SPELLING) {
  const re = new RegExp(`\\b${sp.from}\\b`, 'gi');
  out = out.map(w => {
    let next = w;
    if (w.lemma === sp.from) {
      next = { ...next, lemma: sp.to };
      if (sp.reid) {
        const nid = slugId(sp.to, w.level);
        renames.push(`${w.id} → ${nid}`);
        next = { ...next, id: nid, lemmaAudio: `audio/lemma/${nid}.mp3` };
      }
    }
    const examples = next.examples.map(e => {
      if (!re.test(e.fr)) return e;
      re.lastIndex = 0;
      const fr = e.fr.replace(re, m => (m[0] === m[0].toUpperCase() ? sp.to[0].toUpperCase() + sp.to.slice(1) : sp.to));
      re.lastIndex = 0;
      if (fr === e.fr) return e;
      const n = { ...e, fr };
      delete n.audio; delete n.timing;   // 文が変わったので音声は無効
      return n;
    });
    return { ...next, examples };
  });
}

writeFileSync(`data/${level}/words.json`, JSON.stringify(out, null, 2) + '\n');

if (SPELLING.length) {
  const seedPath = `tools/raw/${level.toLowerCase()}.jsonl`;
  const seed = readFileSync(seedPath, 'utf-8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const seedOut = seed.map(r => {
    const sp = SPELLING.find(s => s.from === r.lemma);
    return sp ? { ...r, lemma: sp.to } : r;
  });
  writeFileSync(seedPath, seedOut.map(r => JSON.stringify(r)).join('\n') + '\n');
}

console.log(`✓ sentence fixes applied: ${applied} / ${fixes.length}`);
if (unmatched.length) { console.error('✗ unmatched fix targets:'); for (const u of unmatched) console.error('  ' + u); }
if (SPELLING.length) console.log(`✓ spelling: ${SPELLING.map(s => s.from + '→' + s.to).join(', ')}`);
if (renames.length) console.log(`✓ id renames: ${renames.join(', ')}`);
process.exit(unmatched.length ? 1 : 0);
