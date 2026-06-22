// main.js — entry. Builds the top-nav, wires the hash router, and renders the
// home launcher or the docs reader into <main id="app">.
import { SECTIONS } from "./content.js";
import { parseHash } from "./router.js";
import { renderHome } from "./home.js";
import { renderReader } from "./reader.js";

const app = document.getElementById("app");
const navEl = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");

function buildNav() {
  navEl.innerHTML = SECTIONS.map((s) => {
    const href = s.kind === "app" ? s.href : `#/${s.id}`;
    const ext =
      s.kind === "app" ? ' <span class="ext" aria-hidden="true">↗</span>' : "";
    return `<a class="nav-link" href="${href}" data-section="${s.id}">${s.label}${ext}</a>`;
  }).join("");
}

function setActiveNav(route) {
  navEl.querySelectorAll(".nav-link").forEach((a) => {
    const active =
      route.view === "reader" &&
      a.getAttribute("data-section") === route.sectionId;
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function closeMobileNav() {
  navEl.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
}

function route() {
  const r = parseHash(location.hash);
  setActiveNav(r);
  closeMobileNav();
  if (r.view === "reader") renderReader(app, r.sectionId, r.slug);
  else renderHome(app);
}

navToggle.addEventListener("click", () => {
  const open = navEl.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

window.addEventListener("hashchange", route);
buildNav();
route();
