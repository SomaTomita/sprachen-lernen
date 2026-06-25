// content.js — the site manifest. Pure data + small lookup helpers.
// `kind: 'docs'` sections are rendered by the in-app markdown reader (live in content/);
// `kind: 'app'` sections link out to a standalone offline app (live in apps/).
// `status: 'wip'` flags a section as 開発中 — the home card shows a badge.
// All paths are relative to the repo root (where index.html is served).

export const SECTIONS = [
  {
    id: "exam-guide",
    label: "基礎ドキュメント",
    kind: "docs",
    tagline:
      "Goethe A1 / A2 の試験概要・問題形式・公式模擬問題（解答解説つき）。",
    groups: [
      {
        label: "試験概要",
        docs: [
          {
            slug: "a1",
            title: "A1 試験概要",
            path: "content/exam-guide/exam-info/goethe-a1.md",
          },
          {
            slug: "a2",
            title: "A2 試験概要",
            path: "content/exam-guide/exam-info/goethe-a2.md",
          },
        ],
      },
      {
        label: "問題形式・模擬問題",
        docs: [
          {
            slug: "a1-types",
            title: "A1 問題形式",
            path: "content/exam-guide/question-types/a1-question-types.md",
          },
          {
            slug: "a1-practice",
            title: "A1 模擬問題",
            path: "content/exam-guide/question-types/a1-practice.md",
          },
          {
            slug: "a2-types",
            title: "A2 問題形式",
            path: "content/exam-guide/question-types/a2-question-types.md",
          },
          {
            slug: "a2-practice",
            title: "A2 模擬問題",
            path: "content/exam-guide/question-types/a2-practice.md",
          },
        ],
      },
    ],
  },
  {
    id: "grammar",
    label: "文法",
    kind: "docs",
    tagline:
      "ドイツ語文法をゼロから。人称代名詞・動詞の活用・語順を表で整理(随時追加)。",
    groups: [
      {
        label: "基礎文法",
        docs: [
          {
            slug: "personalpronomen",
            title: "01 人称代名詞と sein",
            path: "content/grammar/01-personalpronomen-sein.md",
          },
          {
            slug: "verben-praesens",
            title: "02 動詞の現在人称変化",
            path: "content/grammar/02-verben-praesens.md",
          },
          {
            slug: "nomen-genus",
            title: "03 名詞の性(der/die/das)",
            path: "content/grammar/03-nomen-genus.md",
          },
          {
            slug: "nomen-plural",
            title: "04 名詞の複数形(Plural)",
            path: "content/grammar/04-nomen-plural.md",
          },
          {
            slug: "nomen-kasus",
            title: "05 名詞の格変化(4格)と定冠詞",
            path: "content/grammar/05-nomen-kasus.md",
          },
          {
            slug: "artikel",
            title: "06 定冠詞と不定冠詞",
            path: "content/grammar/06-artikel.md",
          },
          {
            slug: "artikelwoerter",
            title: "07 冠詞類(所有・指示・疑問・数量)",
            path: "content/grammar/07-artikelwoerter.md",
          },
        ],
      },
    ],
  },
  {
    id: "speaking",
    label: "スピーキング",
    kind: "docs",
    status: "wip", // アプリ化を準備中。当面はリーダーで下書き教材を表示する。
    tagline:
      "A2 口述（Sprechen）に最短で受かるための丸暗記＆音読教材。（アプリ版を開発中）",
    groups: [
      {
        label: "はじめに",
        docs: [
          {
            slug: "intro",
            title: "教材の使い方・試験の中身",
            path: "apps/speaking/README.md",
          },
          {
            slug: "steckbrief",
            title: "Mein Steckbrief（自己台本）",
            path: "apps/speaking/docs/mein-steckbrief.md",
          },
        ],
      },
      {
        label: "練習（この順で）",
        docs: [
          {
            slug: "kern",
            title: "00 核 Redemittel",
            path: "apps/speaking/docs/00-kern-redemittel.md",
          },
          {
            slug: "teil-1",
            title: "Teil 1 質問する／答える",
            path: "apps/speaking/docs/teil-1-fragen-antworten.md",
          },
          {
            slug: "teil-2",
            title: "Teil 2 自分について話す",
            path: "apps/speaking/docs/teil-2-ueber-mich.md",
          },
          {
            slug: "teil-3",
            title: "Teil 3 一緒に計画する",
            path: "apps/speaking/docs/teil-3-zusammen-planen.md",
          },
        ],
      },
    ],
  },
  {
    id: "pronunciation",
    label: "発音",
    kind: "app",
    href: "apps/pronunciation/",
    tagline:
      "Anna の自己紹介を全文・文・単語単位で音読。ハイライト＋発音ポイント＋カラオケ音声。",
  },
  {
    id: "vocabulary",
    label: "単語",
    kind: "app",
    href: "apps/vocabulary/",
    tagline:
      "Goethe A1/A2 単語のフラッシュカード（Leitner）＋ネイティブ音声＋進捗トラッキング。",
  },
  {
    id: "grammar-exercises",
    label: "文法練習",
    kind: "app",
    href: "apps/grammar-exercises/",
    tagline:
      "文法レッスン(01〜07)の練習問題。穴埋め・表埋め・選択・書き換えを即時採点＋解説。",
  },
];

export function getSection(id) {
  return SECTIONS.find((s) => s.id === id) || null;
}

export function docsOf(section) {
  return section.groups ? section.groups.flatMap((g) => g.docs) : [];
}

// Resolve a repo-root-relative .md path back to its {sectionId, slug} route.
export function resolveByPath(path) {
  for (const s of SECTIONS) {
    if (s.kind !== "docs") continue;
    for (const d of docsOf(s)) {
      if (d.path === path) return { sectionId: s.id, slug: d.slug };
    }
  }
  return null;
}
