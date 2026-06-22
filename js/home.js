// home.js — the launcher. Navy hero band + a 2-up grid of model-cards,
// one per section. `docs` sections route into the in-app reader; `app`
// sections link to a standalone offline app. Icons are inline SVG (never
// emoji), per the BMW design kit.
import { SECTIONS } from "./content.js";

const SVG_OPEN =
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

const ICONS = {
  "exam-guide": `${SVG_OPEN}<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>`,
  grammar: `${SVG_OPEN}<path d="M4 6h13M4 10h13M4 14h7"/><path d="M13.5 17.5l2 2 4.5-4.5"/></svg>`,
  speaking: `${SVG_OPEN}<path d="M4 5h16v11H9l-4 3v-3H4z"/><path d="M8 9h8M8 12h5"/></svg>`,
  pronunciation: `${SVG_OPEN}<path d="M4 9v6h3l5 4V5L7 9H4z"/><path d="M16 9a4 4 0 010 6"/><path d="M18.5 6.5a8 8 0 010 11"/></svg>`,
  vocabulary: `${SVG_OPEN}<path d="M12 3l9 4-9 4-9-4 9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16.5l9 4 9-4"/></svg>`,
};

const KIND_LABEL = { docs: "資料", app: "アプリ" };

function cardHref(s) {
  return s.kind === "app" ? s.href : `#/${s.id}`;
}
function cardCta(s) {
  if (s.status === "wip") return "下書きを見る";
  return s.kind === "app" ? "アプリを開く" : "資料を開く";
}
function cardKind(s) {
  return s.status === "wip" ? "開発中" : KIND_LABEL[s.kind];
}

function cardHtml(s) {
  return `<a class="model-card" href="${cardHref(s)}">
      <div class="model-card-plate">
        <span class="model-card-icon">${ICONS[s.id] || ""}</span>
        <span class="model-card-kind${s.status === "wip" ? " is-wip" : ""}">${cardKind(s)}</span>
      </div>
      <div class="model-card-body">
        <span class="model-card-title">${s.label}</span>
        <span class="model-card-tagline">${s.tagline}</span>
        <span class="model-card-link">${cardCta(s)} <span class="arrow" aria-hidden="true">›</span></span>
      </div>
    </a>`;
}

export function renderHome(app) {
  app.innerHTML = `
    <section class="hero-band-dark">
      <div class="hero-inner">
        <p class="hero-eyebrow">Goethe · オフライン学習</p>
        <h1 class="hero-title">Deutsch</h1>
        <p class="hero-sub">試験対策ドキュメント・発音・スピーキング・単語を、ひとつのサーバーでまとめて。ビルド不要・オフライン動作。</p>
      </div>
    </section>
    <div class="home-body">
      <p class="eyebrow">学習メニュー</p>
      <div class="card-grid">
        ${SECTIONS.map(cardHtml).join("")}
      </div>
    </div>`;
  document.title = "Deutsch — ドイツ語学習";
}
