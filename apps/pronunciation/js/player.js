import { activeIndexAt, slugify } from './util.js';

/**
 * 1文のカラオケ再生。spans は reader.js が作った .kw 配列。
 * @returns {{audio: HTMLAudioElement|null, stop: () => void, utterance?: any}}
 */
export function playSentence(sentence, spans, { rate = 1, onEnd } = {}) {
  const timing = sentence.timing;
  if (!sentence.audio || !timing || !timing.length) {
    const u = speakFallback(sentence.de);
    if (onEnd) setTimeout(onEnd, 0);
    return { stop: () => speechSynthesis.cancel(), audio: null, utterance: u };
  }
  const audio = new Audio(`data/${sentence.audio}`);
  audio.playbackRate = rate;
  let raf = 0;
  let done = false; // ended / error / stop のいずれか一度だけ後処理する
  const clear = () => spans.forEach(sp => sp.classList.remove('active'));
  const tick = () => {
    const active = activeIndexAt(timing, audio.currentTime);
    spans.forEach((sp, i) => sp.classList.toggle('active', i === active));
    if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
  };
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    clear();
    if (onEnd) onEnd();
  };
  audio.addEventListener('play', () => { raf = requestAnimationFrame(tick); });
  audio.addEventListener('ended', finish);
  // 音声欠落/読込失敗でも onEnd を呼んで次へ（全文再生が固まらないように）
  audio.addEventListener('error', finish);
  audio.play().catch(finish);
  return {
    audio,
    stop() { done = true; cancelAnimationFrame(raf); audio.pause(); clear(); },
  };
}

/** 単語単体の音声を再生（data/audio/words/<slug>.mp3）。無ければ TTS フォールバック。 */
export function playWord(token) {
  const word = token.word || token.t;
  const slug = slugify(word);
  const audio = new Audio(`data/audio/words/${slug}.mp3`);
  audio.addEventListener('error', () => speakFallback(word), { once: true });
  audio.play().catch(() => speakFallback(word));
  return audio;
}

/**
 * 全文を順番に再生。resolveSpans(sentence)->spans で各文のスパンを解決。
 * @returns {{stop: () => void}}
 */
export function playAll(sentences, { rate = 1, resolveSpans, onSentence, onEnd } = {}) {
  let i = 0;
  let current = null;
  let stopped = false;
  const next = () => {
    if (stopped || i >= sentences.length) { if (onEnd) onEnd(); return; }
    const s = sentences[i];
    if (onSentence) onSentence(s, i);
    current = playSentence(s, resolveSpans(s), { rate, onEnd: () => { i += 1; next(); } });
  };
  next();
  return { stop() { stopped = true; if (current) current.stop(); } };
}

export function speakFallback(text) {
  if (!('speechSynthesis' in window)) return null;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return u;
}
