// 純粋関数のみ。DOM/音声に依存しない（node --test でテスト可能）。

/**
 * ドイツ語の語 → 音声ファイル名スラッグ。
 * @param {string} word
 * @returns {string}
 */
export function slugify(word) {
  return String(word)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // 余分なダイアクリティクス除去
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 再生位置 t(秒) に対応するアクティブ単語 index（audio.js の tick と同じ規則）。
 * @param {{s:number,e:number}[]} timing
 * @param {number} t
 * @returns {number} アクティブ index（該当なしは -1）
 */
export function activeIndexAt(timing, t) {
  let active = -1;
  for (let i = 0; i < timing.length; i++) {
    if (t >= timing[i].s) active = i;
    if (t < timing[i].e) break;
  }
  return active;
}

/**
 * paragraphs[].sentences[] を読み上げ順に平坦化。
 * @param {{paragraphs?: {sentences?: any[]}[]}} text
 * @returns {any[]}
 */
export function flattenSentences(text) {
  const out = [];
  for (const p of text.paragraphs || []) {
    for (const s of p.sentences || []) out.push(s);
  }
  return out;
}
