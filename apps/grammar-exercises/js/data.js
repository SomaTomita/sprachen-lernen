// data.js — レッスンJSONを取得。fetch なのでサーバ必須。
export async function loadLesson(id) {
  const res = await fetch(`data/${id}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for data/${id}.json`);
  return res.json();
}

export const LESSONS = [
  { id: "01", title: "01 人称代名詞と sein" },
  { id: "02", title: "02 動詞の現在人称変化" },
  { id: "03", title: "03 名詞の性(der/die/das)" },
  { id: "04", title: "04 名詞の複数形(Plural)" },
  { id: "05", title: "05 名詞の格変化(4格)" },
  { id: "06", title: "06 定冠詞と不定冠詞" },
];
