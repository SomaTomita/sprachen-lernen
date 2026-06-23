export const BOX_INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
export const MAX_BOX = 5;
export function newCard(id) {
    return { id, box: 1, dueDay: 0, lastReviewedDay: null, timesSeen: 0, timesGood: 0 };
}
export function review(card, rating, today) {
    let box;
    let timesGood = card.timesGood;
    if (rating === 'good') {
        // 初回提示(timesSeen===0)は「一発で覚えた」を認めず box1 据え置き＝間隔1日＝翌日再提示。
        // 2回目以降の good で通常どおり間隔を伸ばす(box+1)。box5(習得)到達には複数回の good が要る。
        box = card.timesSeen === 0 ? 1 : Math.min(card.box + 1, MAX_BOX);
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
