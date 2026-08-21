import { readFileSync, writeFileSync } from 'node:fs';
import { slugId, accentSignature } from './slug.mjs';

export function buildEntry(row, level) {
  const id = slugId(row.lemma, level);
  const e = { id, lemma: row.lemma, pos: row.pos };
  if (row.pos === 'noun' && row.article) e.article = row.article;
  if (row.plural) e.plural = row.plural;
  e.level = level;
  e.lemmaAudio = `audio/lemma/${id}.mp3`;
  // 同綴り異義語（devoir 動/名 など）は複数語義を持つので meanings 配列をそのまま通す。
  // gloss が配列を出していればそれを使い、無ければ ja/en の1語義に落とす。
  e.meanings = Array.isArray(row.meanings) && row.meanings.length
    ? row.meanings.map(m => ({ ja: m.ja, en: m.en }))
    : [{ ja: row.ja, en: row.en }];
  return e;
}
export function buildAll(rows, level) {
  // アクセントを落とした slug は**別語同士で衝突する**（ou/où, sur/sûr, marche/marché,
  // côte/côté, âge/âgé, pâte/pâté, la/là）。以前はここで黙って後勝ち／先勝ちに落として
  // **7語を無言で失っていた**。衝突した組だけアクセント署名を id に足して区別し、
  // それでも解決しない場合は例外にする（黙って失わない）。
  const groups = new Map();
  for (const row of rows) {
    const base = slugId(row.lemma, level);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(row);
  }
  const out = [];
  const taken = new Set();
  for (const [base, members] of groups) {
    for (const row of members) {
      const sig = members.length > 1 ? accentSignature(row.lemma) : '';
      const id = sig ? `${base}-${sig}` : base;
      if (taken.has(id)) {
        throw new Error(
          `id collision that the accent signature cannot resolve: "${id}" ` +
          `(lemmas: ${members.map(m => m.lemma).join(', ')}). ` +
          `Add an explicit disambiguation rather than dropping a word.`);
      }
      taken.add(id);
      out.push({ ...buildEntry(row, level), id, lemmaAudio: `audio/lemma/${id}.mp3` });
    }
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , level, src] = process.argv;
  const rows = readFileSync(src, 'utf-8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const out = buildAll(rows, level);
  writeFileSync(`data/${level}/words.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${out.length} seed words → data/${level}/words.json`);
}
