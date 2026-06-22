import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, activeIndexAt, flattenSentences } from '../js/util.js';

test('slugify: ウムラウト/ß/句読点を正規化', () => {
  assert.equal(slugify('Anna.'), 'anna');
  assert.equal(slugify('Österreich'), 'oesterreich');
  assert.equal(slugify('heißt'), 'heisst');
  assert.equal(slugify('Hund,'), 'hund');
  assert.equal(slugify('Müller'), 'mueller');
  assert.equal(slugify('München.'), 'muenchen');
});

test('activeIndexAt: 区間に応じてアクティブ index を返す', () => {
  const timing = [
    { w: 'A', s: 0.0, e: 0.5 },
    { w: 'B', s: 0.5, e: 1.0 },
    { w: 'C', s: 1.0, e: 1.5 },
  ];
  assert.equal(activeIndexAt(timing, 0.0), 0);
  assert.equal(activeIndexAt(timing, 0.6), 1);
  assert.equal(activeIndexAt(timing, 1.4), 2);
  assert.equal(activeIndexAt([], 1.0), -1);
});

test('flattenSentences: 読み上げ順に文を平坦化', () => {
  const text = {
    paragraphs: [
      { id: 'p1', sentences: [{ id: 'p1-s1' }, { id: 'p1-s2' }] },
      { id: 'p2', sentences: [{ id: 'p2-s1' }] },
    ],
  };
  assert.deepEqual(flattenSentences(text).map(s => s.id), ['p1-s1', 'p1-s2', 'p2-s1']);
});
