// 合字は NFD で分解されないため、正規化の前に明示的に展開する（sœur→soeur）。
const LIGATURES = [[/œ/g, 'oe'], [/Œ/g, 'OE'], [/æ/g, 'ae'], [/Æ/g, 'AE']];

export function slug(lemma) {
  let s = lemma;
  for (const [re, to] of LIGATURES) s = s.replace(re, to);
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
export function slugId(lemma, level) {
  return `${level.toLowerCase()}-${slug(lemma)}`;
}
