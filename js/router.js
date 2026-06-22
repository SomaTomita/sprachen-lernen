// router.js — tiny hash router. Pure parse; the listener lives in main.js.
//   #/                       -> home
//   #/<sectionId>            -> reader, first doc of the section
//   #/<sectionId>/<slug>     -> reader, a specific doc
import { getSection } from "./content.js";

export function parseHash(hash) {
  const raw = String(hash == null ? "" : hash).replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { view: "home" };
  const section = getSection(parts[0]);
  if (!section || section.kind !== "docs") return { view: "home" };
  return { view: "reader", sectionId: parts[0], slug: parts[1] || null };
}
