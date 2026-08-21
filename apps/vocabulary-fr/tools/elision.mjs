// 見出し語の表示形を作る。le/la は母音・無音 h の前で l' に縮約する（エリジオン）。
// 有音 h（h aspiré）は縮約しないので例外集合で除外する。

/** 有音 h の語（A1 に登場するものを列挙。増えたらここに追加する）。 */
export const HARD_H = new Set([
  'héros', 'hall', 'haricot', 'hasard', 'haut', 'hauteur', 'hockey', 'hollandais',
  'homard', 'honte', 'hors', 'huit', 'huitième',
]);

const VOWELS = /^[aeiouâàäéèêëîïôöûüùœæ]/i;

/** 冠詞と見出し語から表示形を返す（`la`+`école` → "l'école"）。 */
export function displayHeadword(article, lemma) {
  if (!article) return lemma;
  const first = lemma.normalize('NFC');
  const startsVowel = VOWELS.test(first);
  const muteH = /^h/i.test(first) && !HARD_H.has(lemma.toLowerCase());
  return (startsVowel || muteH) ? `l'${lemma}` : `${article} ${lemma}`;
}
