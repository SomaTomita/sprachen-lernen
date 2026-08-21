// 生成済み例文（tools/raw/<level>_examples.json ＋ tools/raw/exgen/out_*.json）を
// data/<level>/words.json にマージする。既存の audio/timing は保持する（再生成を避ける）。
// 実行: node tools/merge_exgen.mjs A1
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const level = process.argv[2] || 'A1';
const words = JSON.parse(readFileSync(`data/${level}/words.json`, 'utf-8'));

// 1) 例文ソースを集約（後から読んだものが優先されないよう先勝ちで固定）
const bank = new Map();
const addAll = (obj, src) => {
  for (const [id, ex] of Object.entries(obj)) {
    if (!Array.isArray(ex) || !ex.length) continue;
    if (!bank.has(id)) bank.set(id, { ex, src });
  }
};
const pilot = `tools/raw/${level.toLowerCase()}_examples.json`;
if (existsSync(pilot)) addAll(JSON.parse(readFileSync(pilot, 'utf-8')), 'pilot');
const dir = 'tools/raw/exgen';
if (existsSync(dir))
  for (const f of readdirSync(dir).filter(f => /^out_\d+\.json$/.test(f)).sort())
    addAll(JSON.parse(readFileSync(`${dir}/${f}`, 'utf-8')), f);

// 2) マージ（イミュータブル）。既存の audio/timing は文が同一なら引き継ぐ。
const missing = [];
const out = words.map(w => {
  const hit = bank.get(w.id);
  if (!hit) { missing.push(w.id); return w; }
  const prev = new Map((w.examples || []).map(e => [e.fr, e]));
  const examples = hit.ex.map(e => {
    const old = prev.get(e.fr);
    return old && old.audio && old.timing ? { ...e, audio: old.audio, timing: old.timing } : e;
  });
  return { ...w, examples };
});

const total = out.reduce((n, w) => n + (w.examples ? w.examples.length : 0), 0);
const kept = out.reduce((n, w) => n + (w.examples || []).filter(e => e.audio && e.timing).length, 0);
console.log(`sources: ${bank.size} ids | words: ${out.length} | sentences: ${total} | audio kept: ${kept}`);
if (missing.length) {
  console.error(`\n✗ ${missing.length} words have NO examples:`);
  console.error('  ' + missing.slice(0, 40).join(', ') + (missing.length > 40 ? ' …' : ''));
  process.exit(1);
}
writeFileSync(`data/${level}/words.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`✓ merged → data/${level}/words.json`);
