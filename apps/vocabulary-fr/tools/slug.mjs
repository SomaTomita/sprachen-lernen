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

// アクセント記号の署名。フランス語ではアクセントだけで別語になる組があり
// （ou/où、sur/sûr、marche/marché、cote/côte/côté、age/âge/âgé、pate/pâte/pâté、la/là）、
// アクセントを落とした slug は衝突する。衝突した組の中で区別するために、
// 語が持つダイアクリティカルを「基底文字＋記号の頭文字」で並べた短い署名を作る。
//   é → 'ea'(acute) / à → 'ag'(grave) / û → 'uc'(circumflex) / ë → 'ud'(dieresis) / ç → 'cc'(cedilla)
// 例: où → 'ug' / sûr → 'uc' / marché → 'ea' / côté → 'ocea'
const ACCENT_KIND = {
  '\u0301': 'a', // acute
  '\u0300': 'g', // grave
  '\u0302': 'c', // circumflex
  '\u0308': 'd', // dieresis
  '\u0327': 'c', // cedilla（ç 用。基底が c なので 'cc' になり衝突しない）
};

export function accentSignature(lemma) {
  let s = lemma;
  for (const [re, to] of LIGATURES) s = s.replace(re, to);
  const d = s.normalize('NFD').toLowerCase();
  let sig = '';
  for (let i = 0; i < d.length; i++) {
    const kind = ACCENT_KIND[d[i]];
    if (!kind) continue;
    // 直前の基底文字（結合記号でない最後の文字）
    let j = i - 1;
    while (j >= 0 && ACCENT_KIND[d[j]]) j--;
    const base = j >= 0 ? d[j] : '';
    if (/[a-z]/.test(base)) sig += base + kind;
  }
  return sig;
}
