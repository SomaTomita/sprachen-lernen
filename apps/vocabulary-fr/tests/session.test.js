// tests/session.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSession, buildSession, dueCount, MIN_NEW_PER_DAY } from '../js/session.js';

// Deterministic rng: cycles through a fixed sequence of floats in [0,1).
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// n 枚の due カード（dueDay 指定・学習済み）。
const dueCardsN = (n, dueDay) =>
  Array.from({ length: n }, (_, i) => ({
    id: `due${dueDay}-${i}`, box: 1, dueDay,
    lastReviewedDay: dueDay - 1, timesSeen: 1, timesGood: 0,
  }));

// n 枚の未学習カード。
const freshCardsN = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `new${i}`, box: 1, dueDay: 0, lastReviewedDay: null, timesSeen: 0, timesGood: 0,
  }));

const TODAY = 100;
const GOAL = 20;

test('due が goal 以上でも新規は minNew を確保し、復習は goal−minNew で頭打ち', () => {
  const p = planSession([...dueCardsN(20, TODAY), ...freshCardsN(50)], TODAY, GOAL);
  assert.equal(p.newCount, MIN_NEW_PER_DAY);            // 5（0 に絞られない）
  assert.equal(p.reviewCount, GOAL - MIN_NEW_PER_DAY);  // 15
  assert.equal(p.total, GOAL);
});

test('due が少なければ新規で goal を埋める', () => {
  const p = planSession([...dueCardsN(8, TODAY), ...freshCardsN(50)], TODAY, GOAL);
  assert.equal(p.reviewCount, 8);
  assert.equal(p.newCount, 12);
  assert.equal(p.total, GOAL);
});

test('due=0（初日）は全部新規', () => {
  const p = planSession(freshCardsN(50), TODAY, GOAL);
  assert.equal(p.reviewCount, 0);
  assert.equal(p.newCount, GOAL);
});

test('未学習が尽きたら新規は0、復習が goal まで使える', () => {
  const p = planSession(dueCardsN(30, TODAY), TODAY, GOAL); // fresh なし
  assert.equal(p.newCount, 0);
  assert.equal(p.reviewCount, GOAL); // 20（残り10は翌日へ繰越）
});

test('新規の在庫が minNew 未満なら在庫分だけ', () => {
  const p = planSession([...dueCardsN(20, TODAY), ...freshCardsN(3)], TODAY, GOAL);
  assert.equal(p.newCount, 3);
  assert.equal(p.reviewCount, GOAL - 3); // 17
});

test('buildSession は期限超過を古い順(dueDay昇順)にキャップする', () => {
  const old = dueCardsN(10, 90);      // 古い（dueDay 90）
  const recent = dueCardsN(10, 100);  // 新しい（dueDay 100）
  const cards = [...recent, ...old, ...freshCardsN(50)];
  const ids = buildSession(cards, TODAY, GOAL, seqRng([0])).map(c => c.id);
  const reviewIds = ids.filter(id => id.startsWith('due'));
  // reviewCount=15：古い10枚は全部、新しい方からは5枚だけ
  assert.equal(reviewIds.length, 15);
  assert.equal(reviewIds.filter(id => id.startsWith('due90-')).length, 10);
  assert.equal(reviewIds.filter(id => id.startsWith('due100-')).length, 5);
  // 新規は minNew=5、合計 goal
  assert.equal(ids.filter(id => id.startsWith('new')).length, MIN_NEW_PER_DAY);
  assert.equal(ids.length, GOAL);
});

test('buildSession は固定rngで決定論的', () => {
  const cards = [...dueCardsN(8, TODAY), ...freshCardsN(50)];
  const r1 = buildSession(cards, TODAY, GOAL, seqRng([0.5, 0.2, 0.8, 0.1])).map(c => c.id);
  const r2 = buildSession(cards, TODAY, GOAL, seqRng([0.5, 0.2, 0.8, 0.1])).map(c => c.id);
  assert.deepEqual(r1, r2);
});

test('buildSession は入力配列を破壊しない（不変）', () => {
  const cards = [...dueCardsN(8, TODAY), ...freshCardsN(50)];
  const snapshot = JSON.stringify(cards);
  buildSession(cards, TODAY, GOAL, seqRng([0]));
  assert.equal(JSON.stringify(cards), snapshot);
});

test('dueCount は期日到来の総数（バックログ）を返す', () => {
  const cards = [...dueCardsN(12, 90), { id: 'future', box: 1, dueDay: 200, timesSeen: 1, timesGood: 0 }];
  assert.equal(dueCount(cards, TODAY), 12);
});

// ---- planSession の全分岐・境界 ----

test('due = goal − minNew ちょうど: newCount=minNew, reviewCount=goal−minNew', () => {
  // due=15, minNew=5, goal=20 → newCount=max(5, 20-15)=5, reviewCount=min(15,15)=15
  const p = planSession([...dueCardsN(15, TODAY), ...freshCardsN(50)], TODAY, GOAL);
  assert.equal(p.newCount, MIN_NEW_PER_DAY);
  assert.equal(p.reviewCount, GOAL - MIN_NEW_PER_DAY);
  assert.equal(p.total, GOAL);
});

test('due = goal: 死のスパイラル回帰テスト（goal=20, due≥20 でも新規 minNew 確保）', () => {
  // due=20（goal 以上）でも newCount は 0 にならず MIN_NEW_PER_DAY=5 を確保
  const p = planSession([...dueCardsN(20, TODAY), ...freshCardsN(50)], TODAY, GOAL);
  assert.equal(p.newCount, MIN_NEW_PER_DAY); // 5（死のスパイラル回避）
  assert.equal(p.reviewCount, GOAL - MIN_NEW_PER_DAY); // 15
  assert.equal(p.total, GOAL);
});

test('due > goal: due が goal を大きく超えても newCount=minNew を確保', () => {
  // due=50（goal 遥か超過）でも MIN_NEW_PER_DAY は守られる
  const p = planSession([...dueCardsN(50, TODAY), ...freshCardsN(50)], TODAY, GOAL);
  assert.equal(p.newCount, MIN_NEW_PER_DAY);
  assert.equal(p.reviewCount, GOAL - MIN_NEW_PER_DAY);
  assert.equal(p.total, GOAL);
});

test('freshAvail = 0 かつ due 大量: newCount=0, reviewCount=goal', () => {
  // 未学習ゼロ → 新規は 0、復習が goal を埋める
  const p = planSession(dueCardsN(30, TODAY), TODAY, GOAL);
  assert.equal(p.newCount, 0);
  assert.equal(p.reviewCount, GOAL);
  assert.equal(p.total, GOAL);
});

test('freshAvail < minNew: freshAvail=2 で newCount=2 に制限される', () => {
  // minNew=5 だが在庫 2 → newCount=2, reviewCount=18
  const p = planSession([...dueCardsN(20, TODAY), ...freshCardsN(2)], TODAY, GOAL);
  assert.equal(p.newCount, 2);
  assert.equal(p.reviewCount, GOAL - 2);
  assert.equal(p.total, GOAL);
});

test('minNew 引数オーバーライド: minNew=10 が反映される', () => {
  // due=15, minNew=10, goal=20 → newCount=max(10,20-15)=10, reviewCount=10
  const p = planSession([...dueCardsN(15, TODAY), ...freshCardsN(50)], TODAY, GOAL, 10);
  assert.equal(p.newCount, 10);
  assert.equal(p.reviewCount, 10);
  assert.equal(p.total, GOAL);
});

test('dailyGoal=5 はクランプされて 10 になる（GOAL_MIN=10）', () => {
  // goal=10（クランプ後）, due=0 → newCount=10
  const p = planSession(freshCardsN(50), TODAY, 5);
  assert.equal(p.total, 10); // クランプ後の goal
  assert.equal(p.reviewCount, 0);
  assert.equal(p.newCount, 10);
});

test('dailyGoal=1000 はクランプされて 100 になる（GOAL_MAX=100）', () => {
  // goal=100（クランプ後）, due=0 → newCount=100
  const p = planSession(freshCardsN(200), TODAY, 1000);
  assert.equal(p.total, 100);
  assert.equal(p.newCount, 100);
  assert.equal(p.reviewCount, 0);
});

test('total は常に newCount + reviewCount に一致する（複数シナリオ確認）', () => {
  const scenarios = [
    [...dueCardsN(0, TODAY), ...freshCardsN(50)],  // 初日
    [...dueCardsN(8, TODAY), ...freshCardsN(50)],  // 通常
    [...dueCardsN(20, TODAY), ...freshCardsN(50)], // due=goal
    [...dueCardsN(30, TODAY), ...freshCardsN(0)],  // fresh なし
    [...dueCardsN(3, TODAY), ...freshCardsN(2)],   // 両方少ない
  ];
  for (const cards of scenarios) {
    const p = planSession(cards, TODAY, GOAL);
    assert.equal(p.total, p.newCount + p.reviewCount,
      `total mismatch: due=${dueCount(cards, TODAY)}, fresh=${cards.filter(c => c.timesSeen === 0).length}`);
    assert.ok(p.total <= GOAL, `total ${p.total} exceeds goal ${GOAL}`);
  }
});

// ---- buildSession の追加検証 ----

test('buildSession: reviewCount=0（初日・新規のみ）でも動作する', () => {
  // 初日は due ゼロ → 全部新規
  const cards = freshCardsN(50);
  const result = buildSession(cards, TODAY, GOAL, seqRng([0.5]));
  assert.equal(result.length, GOAL);
  assert.ok(result.every(c => c.timesSeen === 0), '全カードが未学習のはず');
});

test('buildSession: newCount=0（未学習なし・復習のみ）でも動作する', () => {
  // fresh なし、due 大量 → 全部復習
  const cards = dueCardsN(30, TODAY);
  const result = buildSession(cards, TODAY, GOAL, seqRng([0.5]));
  assert.equal(result.length, GOAL);
  assert.ok(result.every(c => c.timesSeen > 0), '全カードが学習済みのはず');
});

test('buildSession: あふれた due カードは dueDay が不変（不変性・翌日繰越）', () => {
  // goal=20, minNew=5 → reviewCount=15。due は30枚あるが15枚しか選ばれない。
  // 選ばれなかった due カードは dueDay が変わっていないこと（入力配列の不変）。
  const duecards = dueCardsN(30, TODAY);
  const snapshot = duecards.map(c => c.dueDay);
  buildSession([...duecards, ...freshCardsN(50)], TODAY, GOAL, seqRng([0]));
  assert.deepEqual(duecards.map(c => c.dueDay), snapshot);
});

test('buildSession: 同じ dueDay 内は id 昇順（辞書順）で選ばれる', () => {
  // 3枚、同 dueDay、id: "due100-2" < "due100-9" の辞書順を確認。
  // reviewCount=GOAL−minNew=15、due=3枚全部選ばれる。
  const cards = [
    { id: 'due100-9', box: 1, dueDay: TODAY, lastReviewedDay: TODAY - 1, timesSeen: 1, timesGood: 0 },
    { id: 'due100-2', box: 1, dueDay: TODAY, lastReviewedDay: TODAY - 1, timesSeen: 1, timesGood: 0 },
    { id: 'due100-5', box: 1, dueDay: TODAY, lastReviewedDay: TODAY - 1, timesSeen: 1, timesGood: 0 },
    ...freshCardsN(50),
  ];
  // seqRng([0]) は shuffle で常に先頭に置く → review カードはシャッフル後も特定できる。
  // ここでは選定（sort 順）を確認するため、sort 後の slice を直接検証する。
  // buildSession の内部選定ロジック: sort by dueDay asc, id asc → ['due100-2','due100-5','due100-9']
  const sorted = [...cards]
    .filter(c => c.timesSeen > 0 && c.dueDay <= TODAY)
    .sort((a, b) => a.dueDay - b.dueDay || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  assert.deepEqual(sorted.map(c => c.id), ['due100-2', 'due100-5', 'due100-9']);
});

test('buildSession: dueDay が異なる場合、古い（dueDay が小さい）カードを優先選択する', () => {
  // due カードを3グループ（dueDay 80, 90, 100）各5枚、reviewCount=15で全選択。
  // shuffleを固定0にすれば順序は shuffle 後でも id で確認できる。
  const old1 = dueCardsN(5, 80);   // 最も古い
  const old2 = dueCardsN(5, 90);
  const old3 = dueCardsN(5, 100);  // 今日期限
  const result = buildSession([...old3, ...old1, ...old2, ...freshCardsN(50)], TODAY, GOAL, seqRng([0]));
  const reviewInResult = result.filter(c => c.timesSeen > 0);
  // reviewCount=15: 3グループ全15枚が選ばれる
  assert.equal(reviewInResult.length, 15);
  assert.ok(reviewInResult.some(c => c.id.startsWith('due80-')));
  assert.ok(reviewInResult.some(c => c.id.startsWith('due90-')));
  assert.ok(reviewInResult.some(c => c.id.startsWith('due100-')));
});

test('buildSession: due が reviewCount を超えるとき古い due のみ選択、新しい due は翌日扱い', () => {
  // due=20, reviewCount=15 → 古い10枚（dueDay=90）+ 新しい方5枚（dueDay=100から）。
  // 新しい方の残り5枚（dueDay=100の後半）は選ばれない。それらのdayは不変。
  const old = dueCardsN(10, 90);    // dueDay=90, id: due90-0 .. due90-9 全部選ばれる
  const recent = dueCardsN(10, 100); // dueDay=100, id: due100-0 .. due100-9 → 先頭5枚のみ選ばれる
  const cards = [...recent, ...old, ...freshCardsN(50)];
  const result = buildSession(cards, TODAY, GOAL, seqRng([0]));
  const reviewIds = result.filter(c => c.timesSeen > 0).map(c => c.id);
  assert.equal(reviewIds.length, 15);
  // 古い10枚は全部含まれる
  for (let i = 0; i < 10; i++) {
    assert.ok(reviewIds.includes(`due90-${i}`), `due90-${i} が選ばれているはず`);
  }
  // due100 は前半5枚（id昇順: due100-0..due100-4）のみ
  for (let i = 0; i < 5; i++) {
    assert.ok(reviewIds.includes(`due100-${i}`), `due100-${i} が選ばれているはず`);
  }
  // due100 後半5枚（due100-5..due100-9）は選ばれない
  for (let i = 5; i < 10; i++) {
    assert.ok(!reviewIds.includes(`due100-${i}`), `due100-${i} は選ばれてはいけない`);
  }
});
