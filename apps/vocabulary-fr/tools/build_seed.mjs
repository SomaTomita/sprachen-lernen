import { readFileSync, writeFileSync } from 'node:fs';
import { slugId } from './slug.mjs';

export function buildEntry(row, level) {
  const id = slugId(row.lemma, level);
  const e = { id, lemma: row.lemma, pos: row.pos };
  if (row.pos === 'noun' && row.article) e.article = row.article;
  if (row.plural) e.plural = row.plural;
  e.level = level;
  e.lemmaAudio = `audio/lemma/${id}.mp3`;
  e.meanings = [{ ja: row.ja, en: row.en }];
  return e;
}
export function buildAll(rows, level) {
  const byId = new Map();
  for (const row of rows) {
    const e = buildEntry(row, level);
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  return [...byId.values()];
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , level, src] = process.argv;
  const rows = readFileSync(src, 'utf-8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const out = buildAll(rows, level);
  writeFileSync(`data/${level}/words.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${out.length} seed words → data/${level}/words.json`);
}
