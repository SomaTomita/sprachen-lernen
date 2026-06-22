import { loadText, indexRules } from './data.js';
import { loadSettings, saveSettings } from './storage.js';
import { renderReader } from './reader.js';
import { renderRuleList } from './tips.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');

let text = null;
let rulesById = {};
let currentView = 'home';
const settings = loadSettings();
const persist = () => saveSettings(settings);

function closeNav() {
  nav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'メニューを開く');
}

function go(view) {
  closeNav();
  currentView = view;
  if (view === 'reader') renderReader(app, text, rulesById, settings, persist);
  else if (view === 'rules') renderRuleList(app, text.rules);
  else renderHome();
  renderNav();
  app.focus();
}

function renderNav() {
  nav.innerHTML = `
    <button type="button" id="navHome" class="nav-link"${currentView === 'home' ? ' aria-current="page"' : ''}>ホーム</button>
    <button type="button" id="navRead" class="nav-link"${currentView === 'reader' ? ' aria-current="page"' : ''}>発音練習</button>
    <button type="button" id="navRules" class="nav-link"${currentView === 'rules' ? ' aria-current="page"' : ''}>発音のポイント</button>`;
  nav.querySelector('#navHome').addEventListener('click', () => go('home'));
  nav.querySelector('#navRead').addEventListener('click', () => go('reader'));
  nav.querySelector('#navRules').addEventListener('click', () => go('rules'));
}

function renderHome() {
  app.innerHTML = `
    <section class="hero-band-dark bleed" aria-labelledby="hero-title">
      <div class="hero-inner">
        <p class="hero-eyebrow">発音トレーニング</p>
        <h1 class="hero-title" id="hero-title">${text.title}</h1>
        <p class="hero-sub">Anna の自己紹介を、全文・文単位・単語単位で聞き分けながら音読練習。いま発音している箇所が青く光ります。ネイティブ朗読の発音ポイント付き。</p>
        <div class="hero-actions">
          <button type="button" id="toRead" class="button-primary"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>練習を始める</span></button>
          <button type="button" id="toRules" class="button-secondary-on-dark">発音のポイント</button>
        </div>
      </div>
    </section>
    <section aria-labelledby="src-label">
      <p class="eyebrow" id="src-label">出典</p>
      <p class="home-source">${text.source}</p>
    </section>`;
  app.querySelector('#toRead').addEventListener('click', () => go('reader'));
  app.querySelector('#toRules').addEventListener('click', () => go('rules'));
}

async function init() {
  try {
    text = await loadText();
    rulesById = indexRules(text.rules);
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });
    renderNav();
    renderHome();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    app.innerHTML = `<section class="error-band"><p class="eyebrow">エラー</p><p>データ読込に失敗しました: ${msg}<br>（<code>python3 -m http.server</code> 経由で開いていますか？）</p></section>`;
  }
}
init();
