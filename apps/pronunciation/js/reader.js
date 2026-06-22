import { playSentence, playWord, playAll } from './player.js';
import { renderTipPanel } from './tips.js';
import { flattenSentences } from './util.js';

const ICON = {
  play: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12"/></svg>',
};

/** 1文の .kw スパンを生成して返す（tokens を正とする） */
function renderSentenceTokens(container, sentence, { onWordClick }) {
  container.innerHTML = '';
  const spans = [];
  sentence.tokens.forEach((tok, i) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'kw' + ((tok.r && tok.r.length) ? ' has-tip' : '');
    s.textContent = tok.t;
    s.dataset.i = String(i);
    s.setAttribute('aria-label', `単語を再生: ${tok.word || tok.t}`);
    s.addEventListener('click', () => onWordClick(tok, s, sentence));
    container.append(s, document.createTextNode(' '));
    spans.push(s);
  });
  return spans;
}

export function renderReader(app, text, rulesById, settings, persist) {
  app.innerHTML = `
    <section class="reader" aria-labelledby="reader-title">
      <div class="reader-head">
        <h2 class="reader-title" id="reader-title">${text.title_ja}</h2>
        <div class="reader-controls">
          <button type="button" id="playAll" class="button-primary">${ICON.play}<span>全文を再生</span></button>
          <button type="button" id="rateToggle" class="button-secondary" aria-pressed="${settings.rate !== 1}">${settings.rate === 1 ? '速度 1.0x' : '速度 0.75x'}</button>
          <button type="button" id="meaningToggle" class="button-secondary" aria-pressed="${!!settings.showMeaning}">${settings.showMeaning ? '意味を隠す' : '意味を表示'}</button>
        </div>
      </div>
      <div class="reader-body">
        <div id="passage" class="passage${settings.showMeaning ? ' show-meaning' : ''}"></div>
        <aside id="tip" class="tip-panel" aria-live="polite"></aside>
      </div>
    </section>`;

  const passage = app.querySelector('#passage');
  const tipHost = app.querySelector('#tip');
  const playAllBtn = app.querySelector('#playAll');
  const rateBtn = app.querySelector('#rateToggle');
  const meaningBtn = app.querySelector('#meaningToggle');

  const glossary = text.glossary || {};
  const spansBySentence = new Map(); // sentence.id -> spans[]
  let currentPlayback = null;        // { stop }
  let playingSentenceEl = null;
  let activeWordBtn = null;

  const clearSentenceHighlight = () => {
    if (playingSentenceEl) playingSentenceEl.classList.remove('is-playing');
    playingSentenceEl = null;
  };
  const setPlayAll = (playing) => {
    playAllBtn.innerHTML = (playing ? ICON.stop : ICON.play) + `<span>${playing ? '停止' : '全文を再生'}</span>`;
  };
  const scrollBehavior = () =>
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const isNarrow = () => window.matchMedia('(max-width: 899px)').matches;
  const stopPlayback = () => {
    if (currentPlayback) { currentPlayback.stop(); currentPlayback = null; }
    clearSentenceHighlight();
    setPlayAll(false);
  };

  // 段落 → 文ブロック（再生ボタン + ドイツ語 + 意味キャプション）を描画
  for (const p of text.paragraphs) {
    const pEl = document.createElement('p');
    pEl.className = 'para';
    for (const sentence of p.sentences) {
      const sEl = document.createElement('span');
      sEl.className = 'sentence';
      sEl.dataset.id = sentence.id;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-button sentence-play';
      btn.innerHTML = ICON.play;
      btn.setAttribute('aria-label', `文を再生: ${sentence.de}`);

      const main = document.createElement('span');
      main.className = 'sentence-main';
      const words = document.createElement('span');
      words.className = 'sentence-words';
      const spans = renderSentenceTokens(words, sentence, {
        onWordClick: (tok, el, sen) => {
          stopPlayback(); // 進行中の文/全文再生を止める（音の二重・ハイライト二重を防ぐ）
          playWord(tok);
          if (activeWordBtn) activeWordBtn.classList.remove('is-selected');
          el.classList.add('is-selected');
          activeWordBtn = el;
          renderTipPanel(tipHost, tok, rulesById, sen.ja, glossary);
          // モバイル（1カラム）ではパネルが本文の下にあるので画面内へ送る
          if (isNarrow()) tipHost.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
        },
      });
      spansBySentence.set(sentence.id, spans);

      const ja = document.createElement('span');
      ja.className = 'sentence-ja';
      ja.textContent = sentence.ja;
      main.append(words, ja);

      btn.addEventListener('click', () => {
        if (currentPlayback) { currentPlayback.stop(); currentPlayback = null; setPlayAll(false); }
        clearSentenceHighlight();
        sEl.classList.add('is-playing');
        playingSentenceEl = sEl;
        currentPlayback = playSentence(sentence, spans, {
          rate: settings.rate,
          onEnd: () => { clearSentenceHighlight(); currentPlayback = null; },
        });
      });

      sEl.append(btn, main);
      pEl.append(sEl);
    }
    passage.append(pEl);
  }

  // 全文再生 / 停止トグル
  playAllBtn.addEventListener('click', () => {
    if (currentPlayback) {
      currentPlayback.stop();
      currentPlayback = null;
      clearSentenceHighlight();
      setPlayAll(false);
      return;
    }
    const sentences = flattenSentences(text);
    setPlayAll(true);
    currentPlayback = playAll(sentences, {
      rate: settings.rate,
      resolveSpans: (s) => spansBySentence.get(s.id),
      onSentence: (s) => {
        clearSentenceHighlight();
        const el = passage.querySelector(`.sentence[data-id="${s.id}"]`);
        if (el) {
          el.classList.add('is-playing');
          playingSentenceEl = el;
          el.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
        }
      },
      onEnd: () => { clearSentenceHighlight(); currentPlayback = null; setPlayAll(false); },
    });
  });

  // 速度トグル（1.0x / 0.75x）
  rateBtn.addEventListener('click', () => {
    settings.rate = settings.rate === 1 ? 0.75 : 1;
    rateBtn.textContent = settings.rate === 1 ? '速度 1.0x' : '速度 0.75x';
    rateBtn.setAttribute('aria-pressed', String(settings.rate !== 1));
    persist();
  });

  // 意味の表示トグル（控えめ・既定は非表示）
  meaningBtn.addEventListener('click', () => {
    settings.showMeaning = !settings.showMeaning;
    passage.classList.toggle('show-meaning', settings.showMeaning);
    meaningBtn.textContent = settings.showMeaning ? '意味を隠す' : '意味を表示';
    meaningBtn.setAttribute('aria-pressed', String(settings.showMeaning));
    persist();
  });

  tipHost.innerHTML = `<p class="tip-empty">単語をクリックすると、その音のポイントと文の意味が表示されます。</p>`;
}
