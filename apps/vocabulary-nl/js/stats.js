// js/stats.js — pure aggregation functions for the progress dashboard.
//
// All functions are side-effect free and deterministic. Date-dependent stats
// take a `dayKey`/`todayKey` STRING ("YYYY-MM-DD") so they can be unit-tested
// without touching the clock. Total word count is always passed in as `total`
// (= words.length) — never hardcoded.
//
// `cards` may be either an array of card objects OR a map of id→card; every
// function normalises via `cardList()` so callers can pass `state.cards`
// (a map) or `Object.values(state.cards)` (an array) interchangeably.

export const MAX_BOX = 5;

/** Normalise an array-or-map of cards into a plain array. */
function cardList(cards) {
  if (Array.isArray(cards)) return cards;
  if (cards && typeof cards === 'object') return Object.values(cards);
  return [];
}

/** A card counts as "seen" once it has been reviewed at least once. */
function isSeen(card) {
  return card.timesSeen > 0;
}

/** Number of mastered words: seen AND sitting in the top box. */
export function masteryCount(cards) {
  return cardList(cards).filter(c => isSeen(c) && c.box >= MAX_BOX).length;
}

/** Mastered / total. Returns 0 when total is 0 (no division by zero). */
export function masteryRate(cards, total) {
  if (!total) return 0;
  return masteryCount(cards) / total;
}

/**
 * Weighted coverage: how far through the boxes the whole deck has advanced.
 * Each seen card contributes its box (1..MAX_BOX); unseen contributes 0.
 * Divided by the theoretical max (total * MAX_BOX). Returns 0 when total is 0.
 */
export function weightedCoverage(cards, total) {
  if (!total) return 0;
  const sum = cardList(cards).reduce((acc, c) => acc + (isSeen(c) ? c.box : 0), 0);
  return sum / (total * MAX_BOX);
}

/** Started rate: fraction of the level the learner has touched at least once. */
export function startedRate(cards, total) {
  if (!total) return 0;
  return cardList(cards).filter(isSeen).length / total;
}

/**
 * Distribution across boxes for the dashboard bar chart.
 * Keys 1..MAX_BOX hold the count of SEEN cards in each box; `unseen` holds the
 * count of never-reviewed cards. (Unseen cards are excluded from the box keys
 * even though their nominal box is 1, so the bars reflect real progress.)
 */
export function boxDistribution(cards) {
  const dist = { unseen: 0 };
  for (let b = 1; b <= MAX_BOX; b++) dist[b] = 0;
  for (const c of cardList(cards)) {
    if (!isSeen(c)) {
      dist.unseen += 1;
    } else if (c.box >= 1 && c.box <= MAX_BOX) {
      dist[c.box] += 1;
    }
  }
  return dist;
}

/** Total activity (new + review) logged for a given day. Missing → 0. */
export function todayCount(history, dayKey) {
  const h = (history && history[dayKey]) || {};
  return (h.new || 0) + (h.review || 0);
}

/** Parse "YYYY-MM-DD" into a UTC-noon Date (noon avoids DST edge shifts). */
function parseDayKey(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Format a Date back into "YYYY-MM-DD" using its UTC fields. */
function formatDayKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Current activity streak ending at (or just before) `todayKey`.
 * A day "counts" when its (new+review) > 0. We start from today; if today has
 * no activity yet we start from yesterday (a streak in progress is not broken
 * just because today's session has not happened), then walk backwards counting
 * consecutive active days until the first gap.
 */
export function currentStreak(history, todayKey) {
  if (!history) return 0;
  const active = key => todayCount(history, key) > 0;

  let cursor = parseDayKey(todayKey);
  // If today is not (yet) active, begin the walk from yesterday.
  if (!active(formatDayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (active(formatDayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
