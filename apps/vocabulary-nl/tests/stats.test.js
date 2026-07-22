// tests/stats.test.js — pure aggregation functions for the progress dashboard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BOX,
  masteryCount,
  masteryRate,
  weightedCoverage,
  startedRate,
  boxDistribution,
  todayCount,
  currentStreak,
} from '../js/stats.js';

// A small, hand-checkable card set. `cards` may be an array OR a map of id→card;
// every stat function accepts both. We assert with the array form and re-check
// one function with the map form to prove parity.
//
//  - mastered (timesSeen>0 && box>=5): m1, m2            → 2
//  - seen but not mastered:            s3(box3), s4(box1) → 2
//  - never seen (timesSeen===0):       u5, u6            → 2 unseen
const cards = [
  { id: 'm1', box: 5, timesSeen: 4, timesGood: 4 },
  { id: 'm2', box: 5, timesSeen: 9, timesGood: 7 },
  { id: 's3', box: 3, timesSeen: 2, timesGood: 1 },
  { id: 's4', box: 1, timesSeen: 1, timesGood: 0 },
  { id: 'u5', box: 1, timesSeen: 0, timesGood: 0 },
  { id: 'u6', box: 1, timesSeen: 0, timesGood: 0 },
];
const total = 10; // total words in the level (cards may be fewer than total)

test('MAX_BOX は 5', () => {
  assert.equal(MAX_BOX, 5);
});

test('masteryCount は timesSeen>0 かつ box>=5 の語数', () => {
  assert.equal(masteryCount(cards), 2);
});

test('masteryCount は box5 でも未学習(timesSeen0)なら数えない', () => {
  const c = [{ id: 'x', box: 5, timesSeen: 0, timesGood: 0 }];
  assert.equal(masteryCount(c), 0);
});

test('masteryRate は mastered / total', () => {
  // 2 / 10 = 0.2
  assert.equal(masteryRate(cards, total), 0.2);
});

test('masteryRate は total=0 で 0（ゼロ除算なし）', () => {
  assert.equal(masteryRate(cards, 0), 0);
});

test('weightedCoverage は Σ(seen ? box : 0) / (total*MAX_BOX)', () => {
  // boxes of seen cards: 5 + 5 + 3 + 1 = 14 ; unseen contribute 0
  // 14 / (10 * 5) = 14 / 50 = 0.28
  assert.equal(weightedCoverage(cards, total), 0.28);
});

test('weightedCoverage は total=0 で 0', () => {
  assert.equal(weightedCoverage(cards, 0), 0);
});

test('startedRate は timesSeen>0 の語数 / total', () => {
  // 4 seen / 10 = 0.4
  assert.equal(startedRate(cards, total), 0.4);
});

test('boxDistribution は学習済みの箱別件数 + unseen', () => {
  const d = boxDistribution(cards);
  assert.deepEqual(d, { 1: 1, 2: 0, 3: 1, 4: 0, 5: 2, unseen: 2 });
});

test('boxDistribution は map(id→card) でも同じ結果（配列/マップ両対応）', () => {
  const map = Object.fromEntries(cards.map(c => [c.id, c]));
  assert.deepEqual(boxDistribution(map), boxDistribution(cards));
});

test('masteryCount/weightedCoverage は map 入力でも一致', () => {
  const map = Object.fromEntries(cards.map(c => [c.id, c]));
  assert.equal(masteryCount(map), masteryCount(cards));
  assert.equal(weightedCoverage(map, total), weightedCoverage(cards, total));
});

test('todayCount は new+review、欠損は 0', () => {
  const history = { '2026-06-21': { new: 12, review: 8 }, '2026-06-20': { new: 0, review: 5 } };
  assert.equal(todayCount(history, '2026-06-21'), 20);
  assert.equal(todayCount(history, '2026-06-20'), 5);
  assert.equal(todayCount(history, '2026-06-19'), 0); // no entry
  assert.equal(todayCount({}, '2026-06-21'), 0);
});

test('todayCount は new/review が欠けていても落ちない', () => {
  assert.equal(todayCount({ '2026-06-21': { new: 3 } }, '2026-06-21'), 3);
  assert.equal(todayCount({ '2026-06-21': { review: 4 } }, '2026-06-21'), 4);
  assert.equal(todayCount({ '2026-06-21': {} }, '2026-06-21'), 0);
});

// ---- ストリーク ----
// activity = (new+review) > 0 のある日。連続日をローカル日付文字列で遡って数える。

test('currentStreak: 今日に活動があれば今日を含めて連続日数', () => {
  const history = {
    '2026-06-21': { new: 5, review: 3 },
    '2026-06-20': { new: 2, review: 0 },
    '2026-06-19': { new: 0, review: 4 },
    '2026-06-18': { new: 0, review: 0 }, // 活動なし → ここで途切れる
    '2026-06-17': { new: 1, review: 0 },
  };
  // 21,20,19 の3連続。18は0で途切れる。
  assert.equal(currentStreak(history, '2026-06-21'), 3);
});

test('currentStreak: 今日が未実施でも昨日に活動があれば継続中扱い', () => {
  const history = {
    '2026-06-20': { new: 4, review: 1 },
    '2026-06-19': { new: 2, review: 0 },
  };
  // 今日(21)は未実施だが、昨日(20)から遡って 20,19 の2連続を継続中とみなす
  assert.equal(currentStreak(history, '2026-06-21'), 2);
});

test('currentStreak: 今日も昨日も活動なしなら 0（ストリーク途切れ）', () => {
  const history = {
    '2026-06-19': { new: 9, review: 9 }, // 一昨日のみ
  };
  assert.equal(currentStreak(history, '2026-06-21'), 0);
});

test('currentStreak: 月またぎの連続も日付計算で正しく遡る', () => {
  const history = {
    '2026-07-01': { new: 1, review: 0 },
    '2026-06-30': { new: 1, review: 0 },
    '2026-06-29': { new: 1, review: 0 },
  };
  assert.equal(currentStreak(history, '2026-07-01'), 3);
});

test('currentStreak: 空履歴は 0', () => {
  assert.equal(currentStreak({}, '2026-06-21'), 0);
});
