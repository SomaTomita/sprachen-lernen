// tests/srs.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, review, isDue, selectSession, shuffle, BOX_INTERVALS, MAX_BOX } from '../js/srs.js';

// Deterministic rng: cycles through a fixed sequence of floats in [0,1).
// Makes shuffle / sampling reproducible so order and membership can be asserted.
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('newCard は box1・未学習', () => {
  const c = newCard('a1-haus');
  assert.equal(c.box, 1);
  assert.equal(c.timesSeen, 0);
});

test('good は box を +1 し due を伸ばす', () => {
  const c = { id: 'x', box: 2, dueDay: 5, lastReviewedDay: null, timesSeen: 1, timesGood: 1 };
  const r = review(c, 'good', 10);
  assert.equal(r.box, 3);
  assert.equal(r.dueDay, 10 + BOX_INTERVALS[3]);
  assert.equal(r.timesSeen, 2);
  assert.equal(r.timesGood, 2);
});

test('good は MAX_BOX を超えない', () => {
  const c = { id: 'x', box: MAX_BOX, dueDay: 0, lastReviewedDay: null, timesSeen: 9, timesGood: 9 };
  assert.equal(review(c, 'good', 0).box, MAX_BOX);
});

test('forgot は box1 に戻す', () => {
  const c = { id: 'x', box: 4, dueDay: 0, lastReviewedDay: null, timesSeen: 3, timesGood: 2 };
  const r = review(c, 'forgot', 7);
  assert.equal(r.box, 1);
  assert.equal(r.dueDay, 7 + BOX_INTERVALS[1]);
  assert.equal(r.timesGood, 2); // good は増えない
});

test('fuzzy は同じ箱に留置', () => {
  const c = { id: 'x', box: 3, dueDay: 0, lastReviewedDay: null, timesSeen: 2, timesGood: 1 };
  const r = review(c, 'fuzzy', 7);
  assert.equal(r.box, 3);
  assert.equal(r.dueDay, 7 + BOX_INTERVALS[3]);
});

test('review は元オブジェクトを変更しない（不変）', () => {
  const c = newCard('x');
  const snapshot = JSON.stringify(c);
  review(c, 'good', 5);
  assert.equal(JSON.stringify(c), snapshot);
});

test('不明な rating は例外', () => {
  assert.throws(() => review(newCard('x'), 'maybe', 0));
});

test('isDue は学習済みかつ期日到来で true', () => {
  assert.equal(isDue({ timesSeen: 1, dueDay: 5 }, 5), true);
  assert.equal(isDue({ timesSeen: 1, dueDay: 6 }, 5), false);
  assert.equal(isDue({ timesSeen: 0, dueDay: 0 }, 5), false); // 未学習は due 扱いしない
});

test('shuffle は新配列を返し元を変更しない（不変）', () => {
  const src = [1, 2, 3, 4, 5];
  const snapshot = JSON.stringify(src);
  const out = shuffle(src, seqRng([0.9, 0.1, 0.7, 0.3]));
  assert.notEqual(out, src);                       // 別オブジェクト
  assert.equal(JSON.stringify(src), snapshot);     // 元は不変
  assert.deepEqual([...out].sort(), [...src].sort()); // 同じ要素集合
});

test('shuffle は固定rngで決定論的な順序になる', () => {
  // Fisher–Yates: i=3 j=floor(.5*4)=2 swap → [a,b,d,c]
  //               i=2 j=floor(.5*3)=1 swap → [a,d,b,c]
  //               i=1 j=floor(.5*2)=1 swap(self) → [a,d,b,c]
  const out = shuffle(['a', 'b', 'c', 'd'], seqRng([0.5]));
  assert.deepEqual(out, ['a', 'd', 'b', 'c']);
  // 同じ rng シードなら再現する
  const out2 = shuffle(['a', 'b', 'c', 'd'], seqRng([0.5]));
  assert.deepEqual(out2, out);
});

test('selectSession は due 全件 + 新規(上限) をメンバーとして含む', () => {
  const cards = [
    { id: 'due1', box: 1, dueDay: 3, timesSeen: 1, timesGood: 0 },
    { id: 'due2', box: 2, dueDay: 5, timesSeen: 2, timesGood: 1 },
    { id: 'notdue', box: 2, dueDay: 99, timesSeen: 1, timesGood: 1 },
    { id: 'new1', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
    { id: 'new2', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
    { id: 'new3', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
    { id: 'new4', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
  ];
  // 固定rng（常に 0）で決定論化。order に依らずメンバーシップ/件数を検証。
  const ids = selectSession(cards, 5, 2, seqRng([0])).map(c => c.id);
  // due は全件（2件）含まれる
  assert.ok(ids.includes('due1'));
  assert.ok(ids.includes('due2'));
  // notdue は含まれない
  assert.ok(!ids.includes('notdue'));
  // 新規は newPerDay=2 件だけ（4件中2件サンプル）
  const newCount = ids.filter(id => id.startsWith('new')).length;
  assert.equal(newCount, 2);
  // 合計 = due全件(2) + 新規上限(2) = 4
  assert.equal(ids.length, 4);
});

test('selectSession は固定rngで決定論的な出題順になる', () => {
  const cards = [
    { id: 'due1', box: 1, dueDay: 3, timesSeen: 1, timesGood: 0 },
    { id: 'due2', box: 2, dueDay: 5, timesSeen: 2, timesGood: 1 },
    { id: 'new1', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
    { id: 'new2', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
    { id: 'new3', box: 1, dueDay: 0, timesSeen: 0, timesGood: 0 },
  ];
  const run1 = selectSession(cards, 5, 2, seqRng([0.5, 0.2, 0.8, 0.1])).map(c => c.id);
  const run2 = selectSession(cards, 5, 2, seqRng([0.5, 0.2, 0.8, 0.1])).map(c => c.id);
  // 同じシードなら完全に同一順序で再現する（決定論）
  assert.deepEqual(run1, run2);
  // due 全件は順序に関わらず必ず含まれる
  assert.ok(run1.includes('due1') && run1.includes('due2'));
});
