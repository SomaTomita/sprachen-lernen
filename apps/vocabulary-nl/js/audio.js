// Single-play lock + karaoke playback.
// One audio (or speech utterance) plays at a time. While something is playing,
// every play button on the page is disabled; all are restored on ended/error/pause.

// Registry of play buttons -> their starter function.
const players = new Map();
// The active playback handle: an HTMLAudioElement, a SpeechSynthesisUtterance, or null.
let current = null;
// The button that initiated the active playback (gets the .is-playing treatment).
let activeButton = null;

function lockButtons(playingBtn) {
    activeButton = playingBtn;
    for (const btn of players.keys()) {
        if (btn === playingBtn) {
            btn.classList.add('is-playing');
            btn.textContent = '⏸'; // ⏸ pause glyph (geometric, not emoji)
            btn.setAttribute('aria-label', '再生中');
            // The active button stays enabled so its label/state is announced,
            // but it does not start a second playback (guarded in start()).
        }
        else {
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
        }
    }
}

function unlockButtons() {
    for (const btn of players.keys()) {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('is-playing');
        btn.textContent = '▶'; // ▶
        const label = btn.dataset['playLabel'];
        btn.setAttribute('aria-label', label || '例文を再生');
    }
    activeButton = null;
}

function stopCurrent() {
    if (!current)
        return;
    const handle = current;
    current = null;
    if (handle instanceof HTMLAudioElement) {
        handle.pause();
        handle.currentTime = 0;
    }
    else if ('speechSynthesis' in window) {
        // SpeechSynthesisUtterance -> cancel the queue.
        speechSynthesis.cancel();
    }
}

function finish() {
    current = null;
    unlockButtons();
}

// Register a play button with a starter. The starter must return the active
// handle (HTMLAudioElement or SpeechSynthesisUtterance) or null, and is
// responsible for calling the wiring helpers below to report play/end.
export function registerPlayButton(btn, starter) {
    btn.dataset['playLabel'] = btn.getAttribute('aria-label') || '例文を再生';
    players.set(btn, starter);
    btn.addEventListener('click', () => {
        // Ignore clicks while a (different) playback is locking the UI.
        if (current)
            return;
        const handle = starter();
        if (handle) {
            current = handle;
            lockButtons(btn);
        }
    });
}

export function renderSentence(container, example) {
    container.innerHTML = '';
    const tokens = (example.timing && example.timing.length)
        ? example.timing.map(t => t.w)
        : example.nl.split(/\s+/);
    const spans = [];
    tokens.forEach((w, i) => {
        const s = document.createElement('span');
        s.textContent = w;
        s.className = 'kw';
        s.dataset['i'] = String(i);
        container.append(s, document.createTextNode(' '));
        spans.push(s);
    });
    return spans;
}

// Starts karaoke playback. Returns the active handle so the registry can lock,
// or null if nothing could be played. Stops any existing playback first.
export function playKaraoke(level, example, spans, { rate = 1 } = {}) {
    stopCurrent();
    const timing = example.timing;
    if (!example.audio || !timing || !timing.length) {
        return speakFallback(example.nl);
    }
    const audio = new Audio(`data/${level}/${example.audio}`);
    audio.playbackRate = rate;
    let raf = 0;
    const clear = () => spans.forEach(sp => sp.classList.remove('active'));
    const tick = () => {
        const t = audio.currentTime;
        let active = -1;
        for (let i = 0; i < timing.length; i++) {
            if (t >= timing[i].s)
                active = i;
            if (t < timing[i].e)
                break;
        }
        spans.forEach((sp, i) => sp.classList.toggle('active', i === active));
        if (!audio.paused && !audio.ended)
            raf = requestAnimationFrame(tick);
    };
    const end = () => { cancelAnimationFrame(raf); clear(); finish(); };
    audio.addEventListener('play', () => { raf = requestAnimationFrame(tick); });
    audio.addEventListener('ended', end);
    audio.addEventListener('error', end);
    audio.addEventListener('pause', () => {
        // A pause that is not the natural end (e.g. stopCurrent) should also
        // release the lock and clear highlights.
        if (!audio.ended)
            end();
    });
    audio.play().catch(end);
    return audio;
}

// Plays a single headword (lemma) under the same single-play lock.
// Uses the pre-generated lemma audio when present (same base as example
// audio: data/<level>/<word.lemmaAudio>), else falls back to Web Speech.
// Returns the active handle so the registry can lock, or null. Stops any
// existing playback first.
export function playLemma(level, word, { rate = 1 } = {}) {
    stopCurrent();
    if (word.lemmaAudio) {
        const audio = new Audio(`data/${level}/${word.lemmaAudio}`);
        audio.playbackRate = rate;
        audio.addEventListener('ended', finish);
        audio.addEventListener('error', finish);
        audio.addEventListener('pause', () => { if (!audio.ended) finish(); });
        audio.play().catch(finish);
        return audio;
    }
    return speakFallback(word.lemma);
}

export function speakFallback(text) {
    if (!('speechSynthesis' in window))
        return null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-NL';
    u.addEventListener('end', finish);
    u.addEventListener('error', finish);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return u;
}
