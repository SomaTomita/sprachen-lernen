// js/session.js — builds the day's study queue from the daily-goal policy.
//
// Policy: review every due card, then top up with new cards until the session
// reaches the daily goal. `selectSession` (frozen in srs.js) is reused as-is;
// we only compute how many NEW cards to introduce and hand that to it as the
// `newPerDay` argument.
import { isDue, selectSession } from './srs.js';
import { clampGoal } from './storage.js';

/** Number of due cards for `today`. */
export function dueCount(cards, today) {
    return cards.filter(c => isDue(c, today)).length;
}

/** New cards to introduce today = goal minus due, clamped to [0, goal]. */
export function newToIntroduce(cards, today, dailyGoal) {
    const goal = clampGoal(dailyGoal);
    const due = dueCount(cards, today);
    return Math.min(Math.max(goal - due, 0), goal);
}

/**
 * Build today's queue: all due cards + up to (goal - due) fresh cards,
 * shuffled. `rng` is injectable for deterministic tests / parity with srs.js.
 */
export function buildSession(cards, today, dailyGoal, rng) {
    return selectSession(cards, today, newToIntroduce(cards, today, dailyGoal), rng);
}
