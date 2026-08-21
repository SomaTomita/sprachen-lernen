// 例文が使ってよい見出し語 lemma の集合（スパイラル）。
// A1 → A1 見出し語のみ。A2 → A1 ∪ A2 見出し語。機能語は常に許可。
export function allowedLemmas(level, byLevel, functionWords) {
  const set = new Set(functionWords.map(w => w.toLowerCase()));
  const levels = level === 'A2' ? ['A1', 'A2'] : ['A1'];
  for (const lv of levels)
    for (const w of (byLevel[lv] || [])) set.add(w.lemma.toLowerCase());
  return set;
}
