// markdown.js — minimal GFM-subset renderer. Pure (no DOM), offline, no deps.
// Supports the subset the docs actually use: ATX headings, paragraphs
// (soft line breaks -> <br>), GFM pipe tables with alignment, nested
// ordered/unordered lists, GitHub task lists, blockquotes, horizontal rules,
// and inline code / links / bold / italic. Fenced code is handled defensively.
//
// Internal-link (.md) rewriting is intentionally NOT done here — that depends
// on the runtime route map and lives in reader.js. This module stays pure so
// it can be unit-tested with `node --test`.

const SENT = String.fromCharCode(0); // sentinel that never appears in markdown text
const LINK_RESTORE = new RegExp(SENT + "L(\\d+)" + SENT, "g");
const CODE_RESTORE = new RegExp(SENT + "C(\\d+)" + SENT, "g");

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Block javascript:/data: etc. Allow http(s), mailto, and scheme-less (relative/#/anchor).
function safeUrl(url) {
  const u = String(url).trim();
  const scheme = u.match(/^([a-z][a-z0-9+.\-]*):/i);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    if (s !== "http" && s !== "https" && s !== "mailto") return "#";
  }
  return u.replace(/\s/g, "%20");
}

function emphasize(str) {
  return str
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?=[^_\w]|$)/g, "$1<em>$2</em>");
}

// Inline formatting for a single run of text (headings, cells, list items, paragraph lines).
export function renderInline(text) {
  let s = escapeHtml(text);
  const codes = [];
  const links = [];

  // Protect inline code first (no further parsing inside).
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push("<code>" + c + "</code>");
    return SENT + "C" + (codes.length - 1) + SENT;
  });

  // Links [label](url) — url/label already HTML-escaped above.
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = safeUrl(url);
    const external = /^https?:\/\//i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener"' : "";
    links.push(`<a href="${href}"${attrs}>${emphasize(label)}</a>`);
    return SENT + "L" + (links.length - 1) + SENT;
  });

  s = emphasize(s);

  // Restore tokens (links may contain code tokens, so restore links first).
  s = s.replace(LINK_RESTORE, (_, n) => links[+n]);
  s = s.replace(CODE_RESTORE, (_, n) => codes[+n]);
  return s;
}

const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;

function isTableSep(line) {
  return (
    /\|/.test(line) &&
    /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/.test(line)
  );
}

function isBlockStart(line, next) {
  if (line == null) return true;
  if (/^ {0,3}#{1,6}\s/.test(line)) return true;
  if (/^ {0,3}([-*_])[ \t]*(\1[ \t]*){2,}$/.test(line)) return true; // hr
  if (/^ {0,3}>/.test(line)) return true;
  if (/^ {0,3}(`{3,}|~{3,})/.test(line)) return true;
  if (LIST_RE.test(line)) return true;
  if (line.includes("|") && next != null && isTableSep(next)) return true;
  return false;
}

function splitRow(row) {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

function alignAttr(a) {
  return a ? ` style="text-align:${a}"` : "";
}

function parseTable(lines, start) {
  const header = splitRow(lines[start]);
  const aligns = splitRow(lines[start + 1]).map((c) => {
    const l = c.startsWith(":");
    const r = c.endsWith(":");
    return l && r ? "center" : r ? "right" : l ? "left" : "";
  });
  let i = start + 2;
  const rows = [];
  while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
    rows.push(splitRow(lines[i]));
    i++;
  }
  const th = header
    .map((c, idx) => `<th${alignAttr(aligns[idx])}>${renderInline(c)}</th>`)
    .join("");
  const body = rows
    .map(
      (cells) =>
        "<tr>" +
        header
          .map(
            (_, idx) =>
              `<td${alignAttr(aligns[idx])}>${renderInline(cells[idx] || "")}</td>`,
          )
          .join("") +
        "</tr>",
    )
    .join("");
  const html = `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
  return [html, i];
}

// Build nested list HTML from a flat run of {indent, ordered, content} items.
function buildLevel(items, start, end) {
  let base = Infinity;
  for (let k = start; k < end; k++) base = Math.min(base, items[k].indent);
  let html = "";
  let i = start;
  while (i < end) {
    const type = items[i].ordered ? "ol" : "ul";
    let liHtml = "";
    let allTask = true;
    let any = false;
    while (
      i < end &&
      items[i].indent === base &&
      (items[i].ordered ? "ol" : "ul") === type
    ) {
      const it = items[i];
      any = true;
      // Children = following items indented deeper than this level.
      let j = i + 1;
      while (j < end && items[j].indent > base) j++;
      const childHtml = j > i + 1 ? buildLevel(items, i + 1, j) : "";
      const task = it.content.match(/^\[([ xX])\]\s+(.*)$/);
      if (task) {
        const checked = task[1].toLowerCase() === "x";
        // Wrap checkbox + text in a <label> so the whole row is one hit target.
        liHtml += `<li class="task${checked ? " is-done" : ""}"><label class="task-label"><input type="checkbox"${
          checked ? " checked" : ""
        }><span>${renderInline(task[2])}</span></label>${childHtml}</li>`;
      } else {
        allTask = false;
        liHtml += `<li>${renderInline(it.content)}${childHtml}</li>`;
      }
      i = j;
    }
    const cls = type === "ul" && allTask && any ? ' class="task-list"' : "";
    html += `<${type}${cls}>${liHtml}</${type}>`;
  }
  return html;
}

function parseList(lines, start) {
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(LIST_RE);
    if (!m) break;
    items.push({
      indent: m[1].replace(/\t/g, "    ").length,
      ordered: /\d/.test(m[2]),
      content: m[3],
    });
    i++;
  }
  return [buildLevel(items, 0, items.length), i];
}

export function renderMarkdown(src) {
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code (defensive — docs don't use it).
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const marker = fence[1][0] === "`" ? "`" : "~";
      const closeRe = new RegExp("^ {0,3}" + marker + "{3,}\\s*$");
      const buf = [];
      i++;
      while (i < lines.length && !closeRe.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // closing fence
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Heading
    const h = line.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const n = h[1].length;
      out.push(`<h${n}>${renderInline(h[2])}</h${n}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^ {0,3}([-*_])[ \t]*(\1[ \t]*){2,}$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // Table
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSep(lines[i + 1])
    ) {
      const [html, next] = parseTable(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    // Blockquote
    if (/^ {0,3}>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) {
        buf.push(lines[i].replace(/^ {0,3}> ?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(buf.join("\n"))}</blockquote>`);
      continue;
    }

    // List
    if (LIST_RE.test(line)) {
      const [html, next] = parseList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    // Paragraph — consecutive plain lines; soft breaks become <br>.
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isBlockStart(lines[i], lines[i + 1])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${para.map((l) => renderInline(l)).join("<br>\n")}</p>`);
  }
  return out.join("\n");
}
