const KEY = 'deutsch-vocab-v1';

export const GOAL_MIN = 10;
export const GOAL_MAX = 100;
export const GOAL_DEFAULT = 20;

export const LEVELS = ['A1', 'A2'];
export const LEVEL_DEFAULT = 'A1';

/** Clamp a daily goal into the allowed range, falling back to the default. */
export function clampGoal(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return GOAL_DEFAULT;
    return Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(v)));
}

/** Restrict a level to a known value, falling back to the default. */
export function clampLevel(level) {
    return LEVELS.includes(level) ? level : LEVEL_DEFAULT;
}

function defaults() {
    return { level: LEVEL_DEFAULT, dailyGoal: GOAL_DEFAULT };
}

/** SRS day counter: whole local days since the epoch. */
export function dayNumber(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor(d.getTime() / 86400000);
}

/** Local calendar day as "YYYY-MM-DD" (used as the history bucket key). */
export function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function loadState() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return { cards: {}, settings: defaults(), history: {} };
        const parsed = JSON.parse(raw);
        const settings = { ...defaults(), ...(parsed.settings || {}) };
        settings.dailyGoal = clampGoal(settings.dailyGoal);
        settings.level = clampLevel(settings.level);
        return {
            cards: parsed.cards || {},
            settings,
            history: parsed.history || {},
        };
    }
    catch {
        return { cards: {}, settings: defaults(), history: {} };
    }
}

export function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
}

/**
 * Record one studied card into today's history bucket, mutating `state.history`
 * in place (caller persists). `isNew` true → increment `new`, else `review`.
 */
export function recordActivity(state, isNew, date = new Date()) {
    const key = dayKey(date);
    const day = state.history[key] || { new: 0, review: 0 };
    const next = {
        new: (day.new || 0) + (isNew ? 1 : 0),
        review: (day.review || 0) + (isNew ? 0 : 1),
    };
    state.history = { ...state.history, [key]: next };
    return state;
}

/** Update the daily goal (clamped). Mutates state.settings; caller persists. */
export function setDailyGoal(state, n) {
    state.settings = { ...state.settings, dailyGoal: clampGoal(n) };
    return state;
}

/** Update the active level ('A1'|'A2'). Mutates state.settings; caller persists. */
export function setLevel(state, level) {
    state.settings = { ...state.settings, level: clampLevel(level) };
    return state;
}
