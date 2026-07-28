// NT2 TaalMenu の頻度順語彙リスト PDF（公式・2100語）の抽出テキストから
// {lemma, article, en, rank} を取り出す。numo の主題別リストに欠けるコア語の補完に使う。
//
// 取得と前処理（再現手順）:
//   curl -sL -o /tmp/nt2-freq.pdf https://nt2taalmenu.nl/nt2/lijsten/engels_fre.pdf
//   pdftotext -layout /tmp/nt2-freq.pdf /tmp/nt2-freq.txt
// 実行:
//   node tools/parse_freq.mjs /tmp/nt2-freq.txt > tools/raw/nt2_freq_parsed.json
//
// レイアウトは 2 段組（左右それぞれ「蘭語  英語」）。列の開始桁はページごとに違うので、
// 2 個以上の空白の連続で 4 フィールドに割り、(蘭,英) のペア 2 組として読む。
// 名詞は "mens de" のように冠詞が語の後ろに付く。`rank` は出現順（＝頻度帯順）。
import { readFileSync } from 'node:fs';

/** "mens de" → {lemma:'mens', article:'de'} / "lopen" → {lemma:'lopen', article:null} */
export function splitLemmaArticle(field) {
  const m = /^([a-zäëïöüáéèçíóú'-]+)(?:\s+(de|het))?$/i.exec(field.trim());
  if (!m) return null;
  return { lemma: m[1].toLowerCase(), article: m[2] ? m[2].toLowerCase() : null };
}

/** pdftotext -layout の出力テキスト → [{lemma, article, en, rank}]（lemma で重複排除） */
export function parseFreqText(text) {
  const found = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim() || /woorden op frekwentie/i.test(line)) continue;   // ヘッダ
    const f = line.trim().split(/\s{2,}/);
    for (const [nl, en] of [[f[0], f[1]], [f[2], f[3]]]) {               // 左段・右段
      if (!nl || !en) continue;
      if (/[[(]/.test(nl)) continue;            // "dat [aanw]" 等の注記付きは採らない
      const parsed = splitLemmaArticle(nl);
      if (!parsed) continue;
      if (parsed.lemma.length < 2 && parsed.lemma !== 'u') continue;
      if (found.has(parsed.lemma)) continue;
      found.set(parsed.lemma, { ...parsed, en: en.trim(), rank: found.size });
    }
  }
  return [...found.values()];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node tools/parse_freq.mjs <pdftotext-output.txt>'); process.exit(2); }
  const out = parseFreqText(readFileSync(src, 'utf-8'));
  console.error(`parsed ${out.length} lemmas (${out.filter(e => e.article).length} nouns with de/het)`);
  process.stdout.write(JSON.stringify(out) + '\n');
}
