// src/flashcard.ts
import { dayNumber, recordActivity } from './storage.js';
import { review } from './srs.js';
import { buildSession } from './session.js';
import { renderSentence, playKaraoke, playLemma, registerPlayButton } from './audio.js';
export function renderFlashcards(app, ctx) {
    const { words, byId, state, persist } = ctx;
    const level = state.settings.level;
    const today = dayNumber();
    // Scope the session to the current level: build only from cards whose word
    // is in this level's `words` (mapped through byId). This keeps A1 cards out
    // of an A2 session and vice versa.
    const levelCards = words.map(w => state.cards[w.id]).filter(Boolean);
    const queue = buildSession(levelCards, today, state.settings.dailyGoal)
        .map(c => byId[c.id]).filter((w) => w !== undefined);
    let pos = 0;
    let flipped = false;
    let keyHandler = null;
    function setKeyHandler(fn) {
        if (keyHandler)
            document.removeEventListener('keydown', keyHandler);
        keyHandler = fn;
        if (fn)
            document.addEventListener('keydown', fn);
    }
    function buildExamples(host, word) {
        const ex = host.querySelector('.examples');
        for (const e of word.examples) {
            const row = document.createElement('div');
            row.className = 'ex';
            const de = document.createElement('p');
            de.className = 'de';
            const tr = document.createElement('p');
            tr.className = 'tr';
            tr.textContent = `${e.ja} / ${e.en}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = '▶';
            btn.className = 'icon-button button-play';
            btn.setAttribute('aria-label', '例文を再生');
            const spans = renderSentence(de, e);
            btn.addEventListener('click', (ev) => ev.stopPropagation());
            registerPlayButton(btn, () => playKaraoke(level, e, spans));
            row.append(btn, de, tr);
            ex.append(row);
        }
    }
    function done() {
        setKeyHandler(null);
        const reviewed = queue.length;
        app.innerHTML = `<section class="state-panel" aria-labelledby="done-title">
        <p class="eyebrow">フラッシュカード · 完了</p>
        <h2 class="state-title" id="done-title">本日のカードは完了</h2>
        <p class="state-sub">${reviewed} 語を学習しました。</p>
        <button type="button" id="doneHome" class="button-primary">ホームへ戻る</button>
      </section>`;
        const homeBtn = app.querySelector('#doneHome');
        homeBtn.addEventListener('click', () => location.reload());
        homeBtn.focus();
    }
    function emptyState() {
        setKeyHandler(null);
        app.innerHTML = `<section class="state-panel" aria-labelledby="empty-title">
        <p class="eyebrow">フラッシュカード</p>
        <h2 class="state-title" id="empty-title">本日の出題はありません</h2>
        <p class="state-sub">復習期日のカードがなく、新規もすべて学習済みです。また明日。</p>
      </section>`;
    }
    function rate(r) {
        const word = queue[pos];
        const card = state.cards[word.id];
        if (card) {
            // Classify BEFORE review() bumps timesSeen: first sighting = new.
            const isNew = card.timesSeen === 0;
            state.cards[word.id] = review(card, r, today);
            recordActivity(state, isNew);
        }
        persist();
        pos++;
        flipped = false;
        showCard();
    }
    function reveal() {
        if (flipped)
            return;
        flipped = true;
        const word = queue[pos];
        const card = app.querySelector('.flashcard');
        const hint = card.querySelector('.flashcard-hint-front');
        if (hint)
            hint.remove();
        card.classList.remove('is-clickable');
        card.removeAttribute('role');
        card.removeAttribute('tabindex');
        card.removeAttribute('aria-label');
        card.onclick = null;
        const back = app.querySelector('#back');
        back.classList.remove('hidden');
        back.innerHTML = `
        <p class="card-meaning">${word.meanings.map(m => `${m.ja} / ${m.en}`).join('；')}</p>
        ${word.pos ? `<p class="card-pos">品詞: ${word.pos}</p>` : ''}
        ${word.plural ? `<p class="card-plural">複数形: ${word.plural}</p>` : ''}
        <p class="examples-label">例文</p>
        <div class="examples"></div>`;
        buildExamples(back, word);
        app.querySelector('#flip').classList.add('hidden');
        const rateRow = app.querySelector('#rate');
        rateRow.classList.remove('hidden');
        rateRow.querySelectorAll('button').forEach(b => {
            b.onclick = () => rate(b.dataset['r']);
        });
        const keyhint = app.querySelector('.flashcard-keyhint');
        if (keyhint)
            keyhint.innerHTML = '<kbd>1</kbd> 忘れた · <kbd>2</kbd> あやふや · <kbd>3</kbd> 覚えてた';
        // move focus to the rating row so keyboard users land on the action
        rateRow.querySelector('button').focus();
    }
    function showCard() {
        if (queue.length === 0)
            return emptyState();
        if (pos >= queue.length)
            return done();
        flipped = false;
        const word = queue[pos];
        app.innerHTML = `
      <div class="flashcard-head">
        <p class="eyebrow">フラッシュカード</p>
        <p class="flashcard-progress" role="status" aria-live="polite">${pos + 1} / ${queue.length}</p>
      </div>
      <section class="flashcard is-clickable" id="flashcard" role="button" tabindex="0"
        aria-label="カードをめくって意味を表示">
        <p class="flashcard-hint-front">タップまたは Space でめくる</p>
        <div class="headword-row">
          <h2 class="headword">${word.article ? word.article + ' ' : ''}${word.lemma}</h2>
          <button type="button" id="lemmaPlay" class="icon-button button-play on-dark"
            aria-label="発音を再生">▶</button>
        </div>
      </section>
      <div class="flashcard-back hidden" id="back"></div>
      <div class="card-actions">
        <button type="button" id="flip" class="button-primary">めくる</button>
        <div class="rate hidden" id="rate">
          <button type="button" data-r="forgot" class="rate-btn rate-forgot">
            <span class="rate-key" aria-hidden="true">1</span>
            <svg class="rate-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            <span class="rate-label">忘れた</span>
          </button>
          <button type="button" data-r="fuzzy" class="rate-btn rate-fuzzy">
            <span class="rate-key" aria-hidden="true">2</span>
            <svg class="rate-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 14c2.5-4 5.5-4 8 0s5.5 4 8 0"/></svg>
            <span class="rate-label">あやふや</span>
          </button>
          <button type="button" data-r="good" class="rate-btn rate-good">
            <span class="rate-key" aria-hidden="true">3</span>
            <svg class="rate-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
            <span class="rate-label">覚えてた</span>
          </button>
        </div>
        <p class="flashcard-keyhint"><kbd>Space</kbd> めくる · <kbd>Enter</kbd> 次へ</p>
      </div>`;
        const cardEl = app.querySelector('#flashcard');
        cardEl.addEventListener('click', reveal);
        app.querySelector('#flip').addEventListener('click', reveal);
        const lemmaBtn = app.querySelector('#lemmaPlay');
        // stopPropagation so playing the headword does not flip the card.
        lemmaBtn.addEventListener('click', (ev) => ev.stopPropagation());
        registerPlayButton(lemmaBtn, () => playLemma(level, word));
        cardEl.focus();
        setKeyHandler((ev) => {
            // ignore when typing in a field (none here, but defensive)
            const tag = ev.target && ev.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA')
                return;
            // Space/Enter on the headword play button activates it natively;
            // do not also flip the card.
            if (ev.target === lemmaBtn && (ev.key === ' ' || ev.key === 'Enter'))
                return;
            if (!flipped) {
                if (ev.key === ' ' || ev.key === 'Enter') {
                    ev.preventDefault();
                    reveal();
                }
                return;
            }
            // flipped: 1/2/3 rate, Enter advances with "fuzzy" is NOT assumed —
            // Enter on the focused rating button is handled natively; here Enter = no-op fallthrough.
            if (ev.key === '1') { ev.preventDefault(); rate('forgot'); }
            else if (ev.key === '2') { ev.preventDefault(); rate('fuzzy'); }
            else if (ev.key === '3') { ev.preventDefault(); rate('good'); }
        });
    }
    showCard();
}
