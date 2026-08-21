export function slug(lemma) {
  return lemma
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
export function slugId(lemma, level) {
  return `${level.toLowerCase()}-${slug(lemma)}`;
}
