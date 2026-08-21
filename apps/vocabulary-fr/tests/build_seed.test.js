import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry, buildAll } from '../tools/build_seed.mjs';

test('maps row → seed entry (no examples yet)', () => {
  const e = buildEntry({ lemma:'huis', pos:'noun', article:'het', plural:'huizen', ja:'家', en:'house' }, 'A1');
  assert.deepEqual(e, {
    id:'a1-huis', lemma:'huis', pos:'noun', article:'het', plural:'huizen',
    level:'A1', lemmaAudio:'audio/lemma/a1-huis.mp3',
    meanings:[{ ja:'家', en:'house' }],
  });
  assert.equal('examples' in e, false);
});
test('omits article/plural for non-nouns, and rejects a truly duplicated lemma', () => {
  const rows = [
    { lemma: 'parler', pos: 'verb', ja: '話す', en: 'to speak' },
    { lemma: 'maison', pos: 'noun', article: 'la', ja: '家', en: 'house' },
  ];
  const out = buildAll(rows, 'A1');
  assert.equal(out.length, 2);
  assert.equal('article' in out[0], false);      // 動詞に article は付かない
  assert.equal(out[1].article, 'la');

  // 同じ lemma が2回来るのはデータ不整合。以前は黙って1件に畳んでおり、
  // アクセント違いの別語（ou/où 等）まで無言で失っていた。今は例外にする。
  const dup = [
    { lemma: 'maison', pos: 'noun', article: 'la', ja: '家', en: 'house' },
    { lemma: 'maison', pos: 'noun', article: 'la', ja: '住宅', en: 'house' },
  ];
  assert.throws(() => buildAll(dup, 'A1'), /cannot resolve/);
});

test('passes a multi-sense meanings array through (homographs like devoir)', () => {
  const e = buildEntry({
    lemma: 'devoir', pos: 'verb',
    meanings: [{ ja: '〜しなければならない', en: 'must, to have to' },
               { ja: '宿題、義務', en: 'homework, duty' }],
  }, 'A1');
  assert.equal(e.meanings.length, 2);
  assert.equal(e.meanings[0].ja, '〜しなければならない');
  assert.equal(e.meanings[1].en, 'homework, duty');
  assert.equal('article' in e, false);
});
test('falls back to flat ja/en when no meanings array is given', () => {
  const e = buildEntry({ lemma: 'maison', pos: 'noun', article: 'la', plural: 'maisons', ja: '家', en: 'house' }, 'A1');
  assert.deepEqual(e.meanings, [{ ja: '家', en: 'house' }]);
  assert.equal(e.article, 'la');
});

test('disambiguates accent-only slug collisions instead of dropping words', () => {
  // ou/où, sur/sûr, marche/marché は別語だがアクセントを落とすと同じ slug になる。
  const rows = [
    { lemma: 'ou', pos: 'conjunction', ja: 'または', en: 'or' },
    { lemma: 'où', pos: 'adverb', ja: 'どこに', en: 'where' },
    { lemma: 'sur', pos: 'preposition', ja: '〜の上に', en: 'on' },
    { lemma: 'sûr', pos: 'adjective', ja: '確かな', en: 'sure' },
    { lemma: 'marche', pos: 'noun', article: 'la', ja: '歩くこと', en: 'walking' },
    { lemma: 'marché', pos: 'noun', article: 'le', ja: '市場', en: 'market' },
  ];
  const out = buildAll(rows, 'A1');
  assert.equal(out.length, 6, 'no word may be dropped');
  assert.equal(new Set(out.map(w => w.id)).size, 6, 'ids must be unique');
  const id = (l) => out.find(w => w.lemma === l).id;
  assert.equal(id('ou'), 'a1-ou');
  assert.equal(id('où'), 'a1-ou-ug');
  assert.equal(id('sur'), 'a1-sur');
  assert.equal(id('sûr'), 'a1-sur-uc');
  assert.equal(id('marché'), 'a1-marche-ea');
  // lemmaAudio must follow the disambiguated id
  assert.equal(out.find(w => w.lemma === 'où').lemmaAudio, 'audio/lemma/a1-ou-ug.mp3');
});
test('an unresolvable collision throws instead of silently losing a word', () => {
  const rows = [
    { lemma: "l'un", pos: 'pronoun', ja: '一方', en: 'one' },
    { lemma: 'l un', pos: 'pronoun', ja: '一方', en: 'one' },   // 同じ slug・署名なし
  ];
  assert.throws(() => buildAll(rows, 'A1'), /cannot resolve/);
});
