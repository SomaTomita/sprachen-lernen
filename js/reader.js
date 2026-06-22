// reader.js — fetches a doc's markdown, renders it into the prose pane with a
// section sidebar. Rewrites internal .md links to in-app routes and persists
// task-list checkbox state to localStorage (handy for the grammar checklists).
import { renderMarkdown } from "./markdown.js";
import { getSection, docsOf, resolveByPath } from "./content.js";

const LS_KEY = "deutsch-home-v1";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}
function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// Resolve a relative link (rel) against a repo-root-relative file path (base).
function resolvePath(base, rel) {
  const clean = rel.split("#")[0].split("?")[0];
  const stack = base.split("/").slice(0, -1);
  for (const part of clean.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function rewriteInternalLinks(root, basePath) {
  root.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("/") ||
      /^[a-z][a-z0-9+.\-]*:/i.test(href)
    ) {
      return;
    }
    if (!href.toLowerCase().split(/[#?]/)[0].endsWith(".md")) return;
    const route = resolveByPath(resolvePath(basePath, href));
    if (route) a.setAttribute("href", `#/${route.sectionId}/${route.slug}`);
  });
}

function wireTasks(root, docPath) {
  const boxes = root.querySelectorAll('li.task input[type="checkbox"]');
  if (boxes.length === 0) return;
  const state = loadState();
  const tasks = state.tasks || {};
  boxes.forEach((box, idx) => {
    const key = `${docPath}#${idx}`;
    if (key in tasks) box.checked = !!tasks[key];
    const li = box.closest("li.task");
    li.classList.toggle("is-done", box.checked);
    // Accessible name comes from the wrapping <label>; no aria-label needed.
    box.addEventListener("change", () => {
      const cur = loadState();
      cur.tasks = cur.tasks || {};
      cur.tasks[key] = box.checked;
      saveState(cur);
      li.classList.toggle("is-done", box.checked);
    });
  });
}

function sidebarHtml(section, currentSlug) {
  return section.groups
    .map(
      (g) => `
      <div class="doc-group">
        <span class="doc-group-label">${g.label}</span>
        ${g.docs
          .map(
            (d) =>
              `<a class="doc-link" href="#/${section.id}/${d.slug}"${
                d.slug === currentSlug ? ' aria-current="page"' : ""
              }>${d.title}</a>`,
          )
          .join("")}
      </div>`,
    )
    .join("");
}

export async function renderReader(app, sectionId, slug) {
  const section = getSection(sectionId);
  const docs = docsOf(section);
  const doc = (slug && docs.find((d) => d.slug === slug)) || docs[0];

  app.innerHTML = `
    <div class="reader">
      <nav class="reader-sidebar" aria-label="${section.label}の目次">
        <a class="reader-back" href="#/"><span class="arrow" aria-hidden="true">‹</span> ホーム</a>
        ${sidebarHtml(section, doc.slug)}
      </nav>
      <div class="reader-content">
        <article class="prose" id="prose" tabindex="-1" aria-busy="true">読み込み中…</article>
      </div>
    </div>`;

  const prose = app.querySelector("#prose");
  document.title = `${doc.title} · Deutsch`;
  window.scrollTo(0, 0);
  prose.focus();

  try {
    const res = await fetch(doc.path, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const md = await res.text();
    prose.innerHTML = renderMarkdown(md);
    rewriteInternalLinks(prose, doc.path);
    wireTasks(prose, doc.path);
  } catch (err) {
    prose.innerHTML = `<div class="error-band">
      <strong>ドキュメントを読み込めませんでした。</strong><br>
      <code>${doc.path}</code> — ${String((err && err.message) || err)}<br>
      ローカルサーバー経由で開いていますか？ リポジトリ直下で <code>./serve.sh</code> を実行してください
      （<code>file://</code> 直開きでは fetch が使えません）。
    </div>`;
  } finally {
    prose.removeAttribute("aria-busy");
  }
}
