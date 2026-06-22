// speak.js — タップで独語を発音（Web Speech API）。音声ファイル不要・OSの独語音声を使う。
// 再生はこの1モジュールに集約：将来 mp3(edge-tts) に差し替えるならここだけ変える。
export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}
export function speak(text) {
  if (!canSpeak() || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.95;
  const de = window.speechSynthesis.getVoices().find((v) => /de[-_]DE/i.test(v.lang));
  if (de) u.voice = de;
  window.speechSynthesis.cancel();   // 連打で重ならない
  window.speechSynthesis.speak(u);
}
