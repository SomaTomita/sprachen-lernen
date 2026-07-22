// js/session.js — builds the day's study queue from the daily-goal policy.
//
// Policy (2026-06-24):
//   - Reserve at least MIN_NEW_PER_DAY new cards each day (bounded by the goal
//     and by how many unseen cards remain), so a review backlog never starves
//     new vocabulary down to zero.
//   - Reviews fill the rest of the goal (goal − newCount), taking the OLDEST
//     overdue cards first (FIFO, by dueDay asc) so the backlog drains
//     deterministically; any overflow stays due and carries to the next day.
//   - The final queue is shuffled for display; the SELECTION itself is
//     deterministic. Due-judging (isDue) and box transitions live in srs.js.
import { isDue, shuffle } from './srs.js';
import { clampGoal } from './storage.js';

/** Reserved minimum new cards to introduce per day (bounded by goal / availability). */
export const MIN_NEW_PER_DAY = 5;

/** Number of due cards for `today` (raw backlog size). */
export function dueCount(cards, today) {
    return cards.filter(c => isDue(c, today)).length;
}

/**
 * Pure split of today's session into new vs review counts.
 *   newCount    = clamp(max(minNew, goal − due)) bounded by unseen stock and goal
 *   reviewCount = min(due, goal − newCount)   // reviews fill the remaining goal
 * Returns { dueAvail, freshAvail, newCount, reviewCount, total }.
 */
export function planSession(cards, today, dailyGoal, minNew = MIN_NEW_PER_DAY) {
    const goal = clampGoal(dailyGoal);
    const reserve = Math.min(minNew, goal);
    const dueAvail = dueCount(cards, today);
    const freshAvail = cards.filter(c => c.timesSeen === 0).length;
    const newCount = Math.min(Math.max(reserve, goal - dueAvail), freshAvail, goal);
    const reviewCount = Math.min(dueAvail, goal - newCount);
    return { dueAvail, freshAvail, newCount, reviewCount, total: newCount + reviewCount };
}

/**
 * Build today's queue: oldest-first due cards (capped at reviewCount) + a random
 * sample of newCount unseen cards, shuffled for display.
 * `rng` is injectable (default Math.random) for deterministic tests.
 */
export function buildSession(cards, today, dailyGoal, rng = Math.random) {
    const { newCount, reviewCount } = planSession(cards, today, dailyGoal);
    // Oldest overdue first (dueDay asc; id asc as a stable tiebreak), then cap.
    const review = cards
        .filter(c => isDue(c, today))
        .sort((a, b) => a.dueDay - b.dueDay || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, reviewCount);
    const fresh = shuffle(cards.filter(c => c.timesSeen === 0), rng).slice(0, newCount);
    return shuffle([...review, ...fresh], rng);
}
