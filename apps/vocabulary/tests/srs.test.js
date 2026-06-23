// tests/srs.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, review, isDue, shuffle, BOX_INTERVALS, MAX_BOX } from '../js/srs.js';

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

test('初回提示(timesSeen 0)の good は graduation しない（box1・間隔1日のまま翌日再提示）', () => {
  const c = newCard('x'); // box1, timesSeen 0
  const r = review(c, 'good', 10);
  assert.equal(r.box, 1);                        // 「一発で覚えた」は認めない＝箱は上がらない
  assert.equal(r.dueDay, 10 + BOX_INTERVALS[1]); // 間隔1＝翌日に再提示
  assert.equal(r.timesSeen, 1);
  assert.equal(r.timesGood, 1);                  // good 自体は記録される
});

test('2回目以降の good は通常どおり box+1', () => {
  const c = { id: 'x', box: 1, dueDay: 11, lastReviewedDay: 10, timesSeen: 1, timesGood: 1 };
  const r = review(c, 'good', 11);
  assert.equal(r.box, 2);
  assert.equal(r.dueDay, 11 + BOX_INTERVALS[2]);
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

// ---- 初回提示ゲートの境界 ----

test('初回 fuzzy（timesSeen 0）は box1 のまま、dueDay = today+1', () => {
  const c = newCard('x'); // box1, timesSeen 0
  const r = review(c, 'fuzzy', 10);
  assert.equal(r.box, 1);
  assert.equal(r.dueDay, 10 + BOX_INTERVALS[1]); // 1日後
  assert.equal(r.timesSeen, 1);
  assert.equal(r.timesGood, 0); // good は記録されない
});

test('初回 forgot（timesSeen 0）は box1 のまま、dueDay = today+1', () => {
  const c = newCard('x'); // box1, timesSeen 0
  const r = review(c, 'forgot', 10);
  assert.equal(r.box, 1);
  assert.equal(r.dueDay, 10 + BOX_INTERVALS[1]); // 1日後
  assert.equal(r.timesSeen, 1);
  assert.equal(r.timesGood, 0);
});

test('box5 かつ timesSeen>0 の good は box5 のまま（MAX_BOX 頭打ち）、dueDay=today+16', () => {
  const c = { id: 'x', box: MAX_BOX, dueDay: 0, lastReviewedDay: null, timesSeen: 5, timesGood: 5 };
  const r = review(c, 'good', 20);
  assert.equal(r.box, MAX_BOX);
  assert.equal(r.dueDay, 20 + BOX_INTERVALS[MAX_BOX]); // 16日後
  assert.equal(r.timesGood, 6); // good は記録される
});

test('lastReviewedDay は review の today になる', () => {
  const c = newCard('x');
  const r = review(c, 'good', 42);
  assert.equal(r.lastReviewedDay, 42);
});

test('fuzzy は timesGood を加算しない', () => {
  const c = { id: 'x', box: 3, dueDay: 0, lastReviewedDay: null, timesSeen: 3, timesGood: 2 };
  const r = review(c, 'fuzzy', 7);
  assert.equal(r.timesGood, 2);
});

test('forgot は timesGood を加算しない', () => {
  const c = { id: 'x', box: 3, dueDay: 0, lastReviewedDay: null, timesSeen: 3, timesGood: 2 };
  const r = review(c, 'forgot', 7);
  assert.equal(r.timesGood, 2);
});

test('初回 good → 2回目 good の連続性: box1→box2 への遷移', () => {
  // 初回 good は box1 据え置き（timesSeen 0→1）
  const c0 = newCard('x'); // box1, timesSeen 0
  const c1 = review(c0, 'good', 10);
  assert.equal(c1.box, 1);
  assert.equal(c1.timesSeen, 1);
  assert.equal(c1.timesGood, 1);

  // 翌日再提示（dueDay=11）で good → box2
  const c2 = review(c1, 'good', 11);
  assert.equal(c2.box, 2);
  assert.equal(c2.dueDay, 11 + BOX_INTERVALS[2]); // 13日
  assert.equal(c2.timesSeen, 2);
  assert.equal(c2.timesGood, 2);
});

// ---- 複数日シミュレーション（統合）----

test('新カードを毎日 good したときの箱推移: 1(初回据置)→2→3→4→5 で頭打ち', () => {
  // day0: 初回提示 good → box1, dueDay=1
  // day1: good → box2, dueDay=3
  // day3: good → box3, dueDay=7
  // day7: good → box4, dueDay=15
  // day15: good → box5, dueDay=31
  // day31: good → box5（頭打ち）, dueDay=47
  const c0 = newCard('sim');

  const r1 = review(c0, 'good', 0); // 初回
  assert.equal(r1.box, 1);
  assert.equal(r1.dueDay, 0 + BOX_INTERVALS[1]); // 1

  const r2 = review(r1, 'good', r1.dueDay); // day1
  assert.equal(r2.box, 2);
  assert.equal(r2.dueDay, r1.dueDay + BOX_INTERVALS[2]); // 1+2=3

  const r3 = review(r2, 'good', r2.dueDay); // day3
  assert.equal(r3.box, 3);
  assert.equal(r3.dueDay, r2.dueDay + BOX_INTERVALS[3]); // 3+4=7

  const r4 = review(r3, 'good', r3.dueDay); // day7
  assert.equal(r4.box, 4);
  assert.equal(r4.dueDay, r3.dueDay + BOX_INTERVALS[4]); // 7+8=15

  const r5 = review(r4, 'good', r4.dueDay); // day15
  assert.equal(r5.box, 5);
  assert.equal(r5.dueDay, r4.dueDay + BOX_INTERVALS[5]); // 15+16=31

  const r6 = review(r5, 'good', r5.dueDay); // day31: MAX_BOX 頭打ち
  assert.equal(r6.box, 5);
  assert.equal(r6.dueDay, r5.dueDay + BOX_INTERVALS[5]); // 31+16=47
});

test('forgot で box1 に戻り、再び good で箱が伸びる（回復シミュレーション）', () => {
  // box3 で forgot → box1 に戻る
  const c = { id: 'sim', box: 3, dueDay: 7, lastReviewedDay: 3, timesSeen: 3, timesGood: 3 };
  const afterForgot = review(c, 'forgot', 7);
  assert.equal(afterForgot.box, 1);
  assert.equal(afterForgot.dueDay, 7 + BOX_INTERVALS[1]);

  // 翌日 good → box2（timesSeen>0 なのでゲートは通過）
  const afterRecover = review(afterForgot, 'good', afterForgot.dueDay);
  assert.equal(afterRecover.box, 2);

  // さらに good → box3
  const afterGrow = review(afterRecover, 'good', afterRecover.dueDay);
  assert.equal(afterGrow.box, 3);
});

test('fuzzy を繰り返しても同じ箱に留まる（全 box で検証）', () => {
  for (let box = 1; box <= MAX_BOX; box++) {
    const c = { id: `x${box}`, box, dueDay: 0, lastReviewedDay: null, timesSeen: box, timesGood: box - 1 };
    const r = review(c, 'fuzzy', 100);
    assert.equal(r.box, box, `box${box} の fuzzy で箱が変わってはいけない`);
    assert.equal(r.dueDay, 100 + BOX_INTERVALS[box]);
  }
});

// セッション選定（due全件＋新規）の責務は js/session.js へ移管。
// 選定の検証は tests/session.test.js を参照。
