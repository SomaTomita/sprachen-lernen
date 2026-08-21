// src/main.ts
import { loadWords, indexById } from './data.js';
import { loadState, saveState, dayNumber, setDailyGoal, setLevel, LEVELS } from './storage.js';
import { newCard } from './srs.js';
import { planSession, MIN_NEW_PER_DAY } from './session.js';
import { renderReader } from './reader.js';
import { renderFlashcards } from './flashcard.js';
import { renderDashboard } from './dashboard.js';
const app = document.getElementById('app');
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const levelSwitch = document.getElementById('levelSwitch');
const wordmark = document.getElementById('wordmark');
const footerWordmark = document.getElementById('footerWordmark');
let words = [];
let byId = {};
let currentView = 'home';
const state = loadState();
function ensureCards() {
    for (const w of words)
        if (!state.cards[w.id])
            state.cards[w.id] = newCard(w.id);
}
function persist() { saveState(state); }
/**
 * Cards scoped to the CURRENTLY loaded level: only the cards whose id belongs
 * to `words` (the level just fetched). This is the single place that keeps A1
 * and A2 progress from mixing — all session/dashboard aggregates run on this
 * array rather than on every card in storage.
 */
function levelCards() {
    return words.map(w => state.cards[w.id]).filter(Boolean);
}
function closeNav() {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'メニューを開く');
}
function go(view) {
    closeNav();
    currentView = view;
    if (view === 'reader')
        renderReader(app, words, state.settings.level);
    else if (view === 'flashcard')
        renderFlashcards(app, { words, byId, state, persist });
    else if (view === 'dashboard')
        renderDashboard(app, {
            words,
            cards: levelCards(),
            state,
            today: new Date(),
            persist,
            onGoalChange: (n) => {
                setDailyGoal(state, n);
                persist();
                renderNav();
                return state.settings.dailyGoal;
            },
        });
    else
        renderHome();
    renderNav();
    app.focus();
}
function renderNav() {
    const today = dayNumber();
    const planned = planSession(levelCards(), today, state.settings.dailyGoal).total;
    nav.innerHTML = `
      <span class="nav-progress" aria-label="本日の学習件数">本日 ${planned} 件</span>
      <button type="button" id="navHome" class="nav-link"${currentView === 'home' ? ' aria-current="page"' : ''}>ホーム</button>
      <button type="button" id="navDash" class="nav-link"${currentView === 'dashboard' ? ' aria-current="page"' : ''}>進捗</button>
      <button type="button" id="navFlash" class="nav-link"${currentView === 'flashcard' ? ' aria-current="page"' : ''}>フラッシュカード</button>
      <button type="button" id="navRead" class="nav-link"${currentView === 'reader' ? ' aria-current="page"' : ''}>読むだけ</button>`;
    nav.querySelector('#navHome').addEventListener('click', () => go('home'));
    nav.querySelector('#navDash').addEventListener('click', () => go('dashboard'));
    nav.querySelector('#navFlash').addEventListener('click', () => go('flashcard'));
    nav.querySelector('#navRead').addEventListener('click', () => go('reader'));
}
function renderHome() {
    const today = dayNumber();
    const cards = levelCards();
    const level = state.settings.level;
    const goal = state.settings.dailyGoal;
    const plan = planSession(cards, today, goal);
    const planned = plan.total;
    app.innerHTML = `
    <section class="hero-band-dark bleed" aria-labelledby="hero-title">
      <div class="hero-inner">
        <p class="hero-eyebrow">本日の学習 · 目標 ${goal} 語</p>
        <h1 class="hero-title" id="hero-title"><span class="hero-stat-num">${planned}</span> 語</h1>
        <p class="hero-sub">復習 ${plan.reviewCount} 語・新規 ${plan.newCount} 語（目標 ${goal} 語）。期日到来 ${plan.dueAvail} 件は古い順に出題し、新規は毎日最低 ${MIN_NEW_PER_DAY} 語を確保します。ランダムな順序で出題。1日数分の積み重ねで ${level} 語彙を定着させましょう。</p>
        <div class="hero-actions">
          <button type="button" id="toFlash" class="button-primary">フラッシュカードを始める</button>
          <button type="button" id="toProgress" class="button-secondary-on-dark">進捗を見る</button>
        </div>
      </div>
    </section>
    <section aria-labelledby="modes-label">
      <p class="eyebrow" id="modes-label">学習モード</p>
      <div class="card-grid">
        <button type="button" class="model-card" id="cardFlash">
          <span class="model-card-plate" aria-hidden="true">${level}</span>
          <span class="model-card-body">
            <span class="model-card-title">フラッシュカード</span>
            <span class="model-card-tagline">めくって自己評価。間隔反復で記憶に残す。</span>
            <span class="model-card-link">始める <span class="arrow" aria-hidden="true">›</span></span>
          </span>
        </button>
        <button type="button" class="model-card" id="cardDash">
          <span class="model-card-plate" aria-hidden="true">%</span>
          <span class="model-card-body">
            <span class="model-card-title">進捗</span>
            <span class="model-card-tagline">到達度・箱分布・今日の達成・ストリーク・履歴。</span>
            <span class="model-card-link">開く <span class="arrow" aria-hidden="true">›</span></span>
          </span>
        </button>
        <button type="button" class="model-card" id="cardRead">
          <span class="model-card-plate" aria-hidden="true">Aa</span>
          <span class="model-card-body">
            <span class="model-card-title">読むだけ</span>
            <span class="model-card-tagline">全 ${words.length} 語を検索。意味・例文・音声を確認。</span>
            <span class="model-card-link">開く <span class="arrow" aria-hidden="true">›</span></span>
          </span>
        </button>
      </div>
    </section>`;
    app.querySelector('#toFlash').addEventListener('click', () => go('flashcard'));
    app.querySelector('#toProgress').addEventListener('click', () => go('dashboard'));
    app.querySelector('#cardFlash').addEventListener('click', () => go('flashcard'));
    app.querySelector('#cardDash').addEventListener('click', () => go('dashboard'));
    app.querySelector('#cardRead').addEventListener('click', () => go('reader'));
}
/** Render the A1/A2 segmented control reflecting the active level. */
function renderLevelSwitch() {
    const level = state.settings.level;
    levelSwitch.innerHTML = LEVELS.map(l => `
      <button type="button" class="level-tab" data-level="${l}" role="tab"
        aria-selected="${l === level ? 'true' : 'false'}"${l === level ? ' aria-current="true"' : ''}>${l}</button>`).join('');
    levelSwitch.querySelectorAll('.level-tab').forEach(btn => {
        btn.addEventListener('click', () => switchLevel(btn.dataset.level));
    });
}
/** Reflect the active level in the wordmarks (FRANÇAIS A1). */
function renderWordmarks() {
    const level = state.settings.level;
    if (wordmark) wordmark.textContent = `FRANÇAIS ${level}`;
    if (footerWordmark) footerWordmark.textContent = `FRANÇAIS ${level}`;
    document.title = `Français ${level} 単語`;
}
/**
 * Switch to another level: persist the choice, load that level's words (with
 * the 1-retry parse handling in loadWords), backfill cards, and re-render the
 * current view scoped to the new level.
 */
async function switchLevel(level) {
    if (level === state.settings.level || !LEVELS.includes(level))
        return;
    setLevel(state, level);
    persist();
    renderLevelSwitch();
    renderWordmarks();
    try {
        words = await loadWords(state.settings.level);
        byId = indexById(words);
        ensureCards();
        persist();
        go(currentView);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        app.innerHTML = `<section class="error-band"><p class="eyebrow">エラー</p><p>${state.settings.level} のデータ読込に失敗しました: ${msg}</p></section>`;
    }
}
async function init() {
    try {
        words = await loadWords(state.settings.level);
        byId = indexById(words);
        ensureCards();
        persist();
        navToggle.addEventListener('click', () => {
            const open = nav.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', String(open));
            navToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
        });
        renderLevelSwitch();
        renderWordmarks();
        renderNav();
        renderHome();
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        app.innerHTML = `<section class="error-band"><p class="eyebrow">エラー</p><p>データ読込に失敗しました: ${msg}<br>（<code>python3 -m http.server</code> 経由で開いていますか？）</p></section>`;
    }
}
init();
