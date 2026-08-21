// 検証パスで出た修正を words.json と seed(JSONL) に適用する。
// 実行: node tools/apply_fixes.mjs A1
//  1) tools/raw/a1_fixes.json の per-sentence 修正（nl/ja/en を差し替え）
//  2) 見出し語の正書法修正（lemma と全例文中の綴りを置換。id が変わる場合は id/lemmaAudio も更新）
import { readFileSync, writeFileSync } from 'node:fs';
import { slugId } from './slug.mjs';

const level = process.argv[2] || 'A1';
const words = JSON.parse(readFileSync(`data/${level}/words.json`, 'utf-8'));
const fixes = JSON.parse(readFileSync(`tools/raw/${level.toLowerCase()}_fixes.json`, 'utf-8'));

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
    const fx = list.find(x => x.match === e.nl);
    if (!fx) return e;
    applied++;
    const next = { ...e };
    if (fx.nl) next.nl = fx.nl;
    if (fx.ja) next.ja = fx.ja;
    if (fx.en) next.en = fx.en;
    // 文が変わったら音声とタイミングは無効
    if (fx.nl && fx.nl !== e.nl) { delete next.audio; delete next.timing; }
    return next;
  });
  for (const fx of list) if (!w.examples.some(e => e.nl === fx.match)) unmatched.push(`${fx.id}: ${fx.match}`);
  return { ...w, examples };
});

// --- 2) 見出し語の正書法（公式綴りに合わせる） ---------------------------
// numo PDF 由来の綴りのうち、Woordenlijst の標準形に直すもの。
// t-shirt は抽出時に小文字化した自分のバグ（原典は T-shirt）。
const SPELLING = [
  { from: 'kado', to: 'cadeau', reid: true },   // 1996年の綴り改定で kado は廃止
  { from: 'mais', to: 'maïs', reid: false },    // 公式は trema つき（id は slug で mais のまま）
  { from: 't-shirt', to: 'T-shirt', reid: false },
];
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
    // 例文中の綴りも置換（大文字小文字を保つ簡易処理: 文頭のみ大文字化）
    const examples = next.examples.map(e => {
      if (!re.test(e.nl)) return e;
      re.lastIndex = 0;
      const nl = e.nl.replace(re, m => (m[0] === m[0].toUpperCase() ? sp.to[0].toUpperCase() + sp.to.slice(1) : sp.to));
      re.lastIndex = 0;
      if (nl === e.nl) return e;
      const n = { ...e, nl };
      delete n.audio; delete n.timing;   // 文が変わったので音声は無効
      return n;
    });
    return { ...next, examples };
  });
}

// --- 3) 個別データ修正 --------------------------------------------------
out = out.map(w => (w.id === 'a1-punt' && !w.plural) ? { ...w, plural: 'punten' } : w);

writeFileSync(`data/${level}/words.json`, JSON.stringify(out, null, 2) + '\n');

// seed JSONL 側の lemma も揃える（再ビルドしても綴りが戻らないように）
const seedPath = `tools/raw/${level.toLowerCase()}.jsonl`;
const seed = readFileSync(seedPath, 'utf-8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const seedOut = seed.map(r => {
  const sp = SPELLING.find(s => s.from === r.lemma);
  const next = sp ? { ...r, lemma: sp.to } : r;
  return (next.lemma === 'punt' && !next.plural) ? { ...next, plural: 'punten' } : next;
});
writeFileSync(seedPath, seedOut.map(r => JSON.stringify(r)).join('\n') + '\n');

console.log(`✓ sentence fixes applied: ${applied} / ${fixes.length}`);
if (unmatched.length) { console.error('✗ unmatched fix targets:'); for (const u of unmatched) console.error('  ' + u); }
console.log(`✓ spelling: ${SPELLING.map(s => s.from + '→' + s.to).join(', ')}`);
if (renames.length) console.log(`✓ id renames: ${renames.join(', ')}`);
process.exit(unmatched.length ? 1 : 0);
