// main.js — ?lesson=01 を読み、該当レッスンを描画。未指定はピッカー。
import { loadLesson, LESSONS } from "./data.js";
import { renderQuiz } from "./quiz.js";

const app = document.getElementById("app");

// クエリ ?lesson=NN を読み、既知のレッスンならその id を返す。
function lessonFromQuery() {
  const id = new URLSearchParams(location.search).get("lesson");
  return LESSONS.some((l) => l.id === id) ? id : null;
}

// 属性つき要素の小ヘルパ（main 内専用）。
function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  if (text != null) node.textContent = text;
  return node;
}

// レッスン未指定時のピッカー。
function renderPicker() {
  app.replaceChildren();

  const header = el("header", { class: "ex-head" });
  const nav = el("nav", { class: "ex-nav", "aria-label": "ナビゲーション" });
  nav.append(el("a", { class: "ex-navlink", href: "../../#/" }, "‹ ホーム"));
  header.append(nav);
  header.append(el("h1", { class: "ex-title" }, "文法練習"));
  header.append(
    el("p", { class: "ex-intro" }, "レッスンを選んで練習を始めましょう。1問ずつチェックして、その場で答え合わせ・解説。"),
  );
  app.append(header);

  const ul = el("ul", { class: "lesson-list" });
  for (const l of LESSONS) {
    const li = el("li", { class: "lesson-item" });
    li.append(el("a", { class: "lesson-link", href: `?lesson=${l.id}` }, l.title));
    ul.append(li);
  }
  app.append(ul);
}

// fetch 失敗時のエラーバンド。
function renderError(err) {
  app.replaceChildren();
  const band = el("div", { class: "error-band" });
  band.append(el("strong", {}, "問題を読み込めませんでした。"));
  band.append(el("p", { class: "error-detail" }, String((err && err.message) || err)));
  const hint = el("p", { class: "error-hint" });
  hint.append(document.createTextNode("リポジトリ直下で "));
  hint.append(el("code", {}, "./serve.sh"));
  hint.append(document.createTextNode(" を実行していますか?（"));
  hint.append(el("code", {}, "file://"));
  hint.append(document.createTextNode(" では動きません）"));
  band.append(hint);
  app.append(band);
}

async function main() {
  const id = lessonFromQuery();
  if (!id) {
    renderPicker();
    return;
  }
  app.setAttribute("aria-busy", "true");
  try {
    const lesson = await loadLesson(id);
    renderQuiz(app, lesson);
  } catch (err) {
    renderError(err);
  } finally {
    app.removeAttribute("aria-busy");
  }
}

main();
