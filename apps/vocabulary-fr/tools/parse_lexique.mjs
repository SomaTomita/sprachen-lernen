// Lexique 3.83（lexique.org）から見出し語ごとの 性 / 複数形 / 頻度 を取り出す。
//
// 取得（再現手順）:
//   curl -sL -o tools/sources/Lexique383.tsv http://www.lexique.org/databases/Lexique383/Lexique383.tsv
// 実行:
//   node tools/parse_lexique.mjs tools/sources/Lexique383.tsv > tools/raw/lexique.json
//
// 使う列: ortho(表層) / lemme(見出し) / cgram(品詞) / genre(m,f) / nombre(s,p) / freqlemlivres
// 性は genre 列から le/la に落とす。複数形は同じ lemme の nombre=p 行の ortho を採る
// （journal→journaux のような不規則も自然に拾える）。
import { readFileSync } from 'node:fs';

/** TSV 文字列 → Map<lemma, {article, plural, cgram, freq}>
 *
 * 性と複数形は**同じ性の行から**取らないといけない。Lexique は同一 lemma に
 * 男性形・女性形の行を別々に持つ（ami の行順は ami(m,s) / amie(f,s) / amies(f,p) / amis(m,p)）。
 * 素朴に「最初の行」「最初の nombre=p 行」を採ると `le ami` に `amies`(女性複数) が付き、
 * amoureux では先頭が amoureuse(f) なので性まで取り違える（実測: A1 名詞 634 のうち 32 件が該当）。
 * そこで **ortho == lemme の行（= 見出しの標準形）を基準**にし、複数形はその性の行から採る。
 */
export function parseLexique(text) {
  const lines = text.split('\n');
  const head = lines[0].replace(/\r/g, '').split('\t');
  const ix = (name) => head.indexOf(name);
  const [iO, iL, iC, iG, iN, iF] =
    ['ortho', 'lemme', 'cgram', 'genre', 'nombre', 'freqlemlivres'].map(ix);

  // lemma ごとに NOM 行を集める（性の整合を取るため行を保持する）
  const nounRows = new Map();
  const out = new Map();
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].replace(/\r/g, '').split('\t');
    if (c.length <= iF) continue;
    const lemma = (c[iL] || '').toLowerCase();
    if (!lemma) continue;
    if (!out.has(lemma)) out.set(lemma, { article: null, plural: null, cgram: c[iC] || '', freq: Number(c[iF]) || 0 });
    if (c[iC] !== 'NOM') continue;
    if (!nounRows.has(lemma)) nounRows.set(lemma, []);
    nounRows.get(lemma).push({ ortho: c[iO], genre: c[iG], nombre: c[iN] });
  }

  const toArticle = (g) => (g === 'f' ? 'la' : g === 'm' ? 'le' : null);
  for (const [lemma, rows] of nounRows) {
    // 基準行: ortho が lemma と一致し性が入っている行。無ければ性が入っている任意の行。
    const canon = rows.find(r => r.ortho.toLowerCase() === lemma && r.genre)
      || rows.find(r => r.genre)
      || rows[0];
    const article = toArticle(canon.genre);
    // 複数形は基準行と同じ性の行から。性が不明なら任意の複数行。
    const plural = (rows.find(r => r.nombre === 'p' && r.genre === canon.genre)
      || (canon.genre ? null : rows.find(r => r.nombre === 'p')) || {}).ortho || null;
    const rec = out.get(lemma);
    rec.article = article;
    rec.plural = (plural && plural.toLowerCase() !== lemma) ? plural : null;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node tools/parse_lexique.mjs <Lexique383.tsv>'); process.exit(2); }
  const lx = parseLexique(readFileSync(src, 'utf-8'));
  const withArt = [...lx.values()].filter(r => r.article).length;
  console.error(`${lx.size} lemmas (${withArt} with le/la)`);
  process.stdout.write(JSON.stringify(Object.fromEntries(lx)) + '\n');
}
