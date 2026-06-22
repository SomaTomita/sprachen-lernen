export const BOX_INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
export const MAX_BOX = 5;
export function newCard(id) {
    return { id, box: 1, dueDay: 0, lastReviewedDay: null, timesSeen: 0, timesGood: 0 };
}
export function review(card, rating, today) {
    let box;
    let timesGood = card.timesGood;
    if (rating === 'good') {
        box = Math.min(card.box + 1, MAX_BOX);
        timesGood += 1;
    }
    else if (rating === 'fuzzy') {
        box = card.box;
    }
    else if (rating === 'forgot') {
        box = 1;
    }
    else
        throw new Error(`unknown rating: ${rating}`);
    return {
        ...card,
        box,
        dueDay: today + BOX_INTERVALS[box],
        lastReviewedDay: today,
        timesSeen: card.timesSeen + 1,
        timesGood,
    };
}
export function isDue(card, today) {
    return card.timesSeen > 0 && card.dueDay <= today;
}
/**
 * Pure Fisher–Yates shuffle. Returns a NEW array (does not mutate input).
 * `rng` must return a float in [0, 1); defaults to Math.random for production.
 * Injecting a deterministic rng makes ordering testable.
 */
export function shuffle(array, rng = Math.random) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}
/**
 * Build a study session:
 *   (a) due cards: every card whose interval has elapsed (unchanged due logic),
 *   (b) new cards: a RANDOM sample of up to `newPerDay` never-seen cards,
 *   (c) the final queue is SHUFFLED so order is not alphabetical/seed order.
 * `rng` is injectable (default Math.random) for deterministic tests.
 * Due-judging (isDue) and box transitions are untouched.
 */
export function selectSession(cards, today, newPerDay, rng = Math.random) {
    const due = cards.filter(c => isDue(c, today));
    const fresh = cards.filter(c => c.timesSeen === 0);
    const freshSample = shuffle(fresh, rng).slice(0, newPerDay);
    return shuffle([...due, ...freshSample], rng);
}
