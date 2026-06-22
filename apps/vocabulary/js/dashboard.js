// js/dashboard.js — progress dashboard view (achievement, box distribution,
// today's goal, streak, history contribution graph, daily-goal setting).
//
// Rendering only — all numbers come from pure functions in stats.js / session.js.
// BMW idiom: white canvas, hairlines, 0px corners, NO shadows, BMW-blue tints,
// Inter 700/300. Every colour-coded cell also carries a number + title/aria so
// meaning never depends on colour alone.
import {
    MAX_BOX,
    masteryCount,
    masteryRate,
    weightedCoverage,
    startedRate,
    boxDistribution,
    todayCount,
    currentStreak,
} from './stats.js';
import { dayKey, dayNumber, GOAL_MIN, GOAL_MAX } from './storage.js';
import { dueCount, newToIntroduce } from './session.js';

const HISTORY_DAYS = 84; // ~12 weeks of contribution cells
const RECENT_DAYS = 7;   // detailed "date: new n · review m" list

function pct(x) {
    return `${Math.round(x * 1000) / 10}%`; // one decimal, e.g. 28.0%
}

/** Map a day's activity volume to a 0..4 intensity bucket for colour depth. */
function intensity(count, goal) {
    if (count <= 0) return 0;
    const ratio = count / Math.max(goal, 1);
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 1) return 3;
    return 4;
}

/** "YYYY-MM-DD" → "M月D日" for human-readable labels. */
function jaDate(key) {
    const [, m, d] = key.split('-').map(Number);
    return `${m}月${d}日`;
}

/** List of the last `n` day keys ending today, oldest first. */
function lastDayKeys(today, n) {
    const keys = [];
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        keys.push(dayKey(d));
    }
    return keys;
}

export function renderDashboard(app, ctx) {
    const { words, state, today, persist, onGoalChange } = ctx;
    // Level-scoped cards: only the current level's words (passed by main.js),
    // so A1/A2 progress never mixes. Falls back to deriving from `words` if a
    // caller omits `cards`.
    const cards = ctx.cards || words.map(w => state.cards[w.id]).filter(Boolean);
    const total = words.length;
    const goal = state.settings.dailyGoal;

    const mastered = masteryCount(cards);
    const dist = boxDistribution(cards);
    const todayKey = dayKey(today);
    const done = todayCount(state.history, todayKey);
    const streak = currentStreak(state.history, todayKey);
    const srsDay = dayNumber(today);
    const due = dueCount(cards, srsDay);
    const newLeft = newToIntroduce(cards, srsDay, goal);

    // ---- box distribution bars (max = largest bucket incl. unseen) ----
    const boxMax = Math.max(1, dist.unseen, ...Array.from({ length: MAX_BOX }, (_, i) => dist[i + 1]));
    const boxRows = [];
    for (let b = 1; b <= MAX_BOX; b++) {
        const n = dist[b];
        const w = Math.round((n / boxMax) * 100);
        boxRows.push(`
          <div class="box-row">
            <span class="box-label">箱 ${b}</span>
            <span class="box-track"><span class="box-fill box-fill-${b}" style="width:${w}%"></span></span>
            <span class="box-value" aria-label="箱${b}: ${n} 語">${n}</span>
          </div>`);
    }
    const unseenW = Math.round((dist.unseen / boxMax) * 100);
    boxRows.push(`
      <div class="box-row">
        <span class="box-label">未学習</span>
        <span class="box-track"><span class="box-fill box-fill-unseen" style="width:${unseenW}%"></span></span>
        <span class="box-value" aria-label="未学習: ${dist.unseen} 語">${dist.unseen}</span>
      </div>`);

    // ---- today's progress bar ----
    const todayPct = Math.min(100, goal ? Math.round((done / goal) * 100) : 0);

    // ---- contribution graph ----
    const histKeys = lastDayKeys(today, HISTORY_DAYS);
    const cells = histKeys.map(k => {
        const c = todayCount(state.history, k);
        const lvl = intensity(c, goal);
        const label = `${jaDate(k)}: ${c} 件`;
        return `<span class="contrib-cell contrib-l${lvl}" role="img" title="${label}" aria-label="${label}"></span>`;
    }).join('');

    // ---- recent activity list ----
    const recentKeys = lastDayKeys(today, RECENT_DAYS).slice().reverse(); // newest first
    const recentRows = recentKeys.map(k => {
        const h = state.history[k] || {};
        const nv = h.new || 0;
        const rv = h.review || 0;
        return `<li class="recent-row"><span class="recent-date">${jaDate(k)}</span><span class="recent-counts">新規 ${nv} · 復習 ${rv}</span></li>`;
    }).join('');

    app.innerHTML = `
    <section aria-labelledby="dash-achv">
      <p class="eyebrow" id="dash-achv">到達度</p>
      <div class="achv-band">
        <div class="achv-headline">
          <span class="achv-rate">${pct(masteryRate(cards, total))}</span>
          <span class="achv-rate-label">習得率（箱${MAX_BOX}到達）</span>
          <span class="achv-rate-sub">${mastered} / ${total} 語</span>
        </div>
        <dl class="spec-row">
          <div class="spec-cell">
            <dt class="spec-label">加重カバレッジ</dt>
            <dd class="spec-value">${pct(weightedCoverage(cards, total))}</dd>
            <dd class="spec-sub">全箱進度</dd>
          </div>
          <div class="spec-cell">
            <dt class="spec-label">学習開始率</dt>
            <dd class="spec-value">${pct(startedRate(cards, total))}</dd>
            <dd class="spec-sub">${cards.filter(c => c.timesSeen > 0).length} / ${total} 語</dd>
          </div>
        </dl>
      </div>
    </section>

    <section aria-labelledby="dash-box">
      <p class="eyebrow" id="dash-box">箱分布</p>
      <div class="box-chart">${boxRows.join('')}</div>
    </section>

    <div class="dash-2col">
      <section aria-labelledby="dash-today">
        <p class="eyebrow" id="dash-today">今日</p>
        <div class="today-card">
          <p class="today-figure"><span class="today-done">${done}</span> <span class="today-goal">/ ${goal}</span></p>
          <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${done}" aria-label="本日の学習: 目標${goal}件中${done}件">
            <div class="progress-fill" style="width:${todayPct}%"></div>
          </div>
          <p class="today-meta">復習期日 ${due} 語・残り新規 ${newLeft} 語</p>
        </div>
      </section>
      <section aria-labelledby="dash-streak">
        <p class="eyebrow" id="dash-streak">ストリーク</p>
        <div class="streak-card">
          <span class="streak-num">${streak}</span>
          <span class="streak-label">連続学習日</span>
        </div>
      </section>
    </div>

    <section aria-labelledby="dash-hist">
      <p class="eyebrow" id="dash-hist">学習履歴（直近 ${Math.round(HISTORY_DAYS / 7)} 週）</p>
      <div class="contrib-graph" role="group" aria-label="日別の学習量">${cells}</div>
      <ul class="recent-list" aria-label="直近の学習量">${recentRows}</ul>
    </section>

    <section aria-labelledby="dash-set">
      <p class="eyebrow" id="dash-set">設定</p>
      <div class="setting-card">
        <label class="setting-label" for="goalInput">1日の学習目標（復習＋新規の合計 · ${GOAL_MIN}〜${GOAL_MAX}）</label>
        <div class="setting-control">
          <input id="goalInput" class="goal-input" type="number" inputmode="numeric"
            min="${GOAL_MIN}" max="${GOAL_MAX}" step="5" value="${goal}" />
          <span class="setting-unit">語 / 日</span>
        </div>
        <p class="setting-hint" id="goalHint" role="status" aria-live="polite">現在の目標: ${goal} 語</p>
      </div>
    </section>`;

    const input = app.querySelector('#goalInput');
    const hint = app.querySelector('#goalHint');
    input.addEventListener('change', () => {
        const next = onGoalChange(input.value);
        // onGoalChange clamps and persists; reflect the stored value + re-render.
        input.value = String(next);
        hint.textContent = `現在の目標: ${next} 語`;
        persist();
        renderDashboard(app, { ...ctx, state });
    });
}
