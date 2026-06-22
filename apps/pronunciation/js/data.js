export async function loadText() {
  const res = await fetch('data/text.json');
  if (!res.ok) throw new Error('failed to load data/text.json');
  return res.json();
}

/** rules 配列 → id 索引 */
export function indexRules(rules) {
  const m = {};
  for (const r of rules || []) m[r.id] = r;
  return m;
}
