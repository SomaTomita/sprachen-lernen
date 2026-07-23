import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedLemmas } from '../tools/allowlist_lemmas.mjs';

test('A1 allows only A1 headword lemmas + function words', () => {
  const a1 = [{ lemma: 'huis' }, { lemma: 'lopen' }];
  const fn = ['de', 'het'];
  const set = allowedLemmas('A1', { A1: a1, A2: [{ lemma: 'winkel' }] }, fn);
  assert.equal(set.has('huis'), true);
  assert.equal(set.has('de'), true);
  assert.equal(set.has('winkel'), false); // A2 語は A1 では不許可
});
test('A2 allows A1 ∪ A2 headword lemmas', () => {
  const set = allowedLemmas('A2', { A1: [{ lemma: 'huis' }], A2: [{ lemma: 'winkel' }] }, ['de']);
  assert.equal(set.has('huis'), true);   // 累積
  assert.equal(set.has('winkel'), true);
});
