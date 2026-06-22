// grade.js — 採点の純関数。DOM・副作用なし。node --test で担保。
export function normalize(s) {
  return String(s == null ? "" : s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ß/g, "ss")
    .replace(/\.$/, "");
}

// input が受理リスト accept のいずれかと（正規化後に）一致すれば true。
export function isCorrect(input, accept) {
  const n = normalize(input);
  if (n === "") return false;
  return (accept || []).some((a) => normalize(a) === n);
}

// match の採点（純関数）：各 left に正しい right が割り当てられているか。
export function matchAllCorrect(pairs, assignment) {
  return pairs.length > 0 && pairs.every((p) => assignment[p.left] === p.right);
}
