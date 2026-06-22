# Design Kit — BMW Corporate-Automotive

> 本プロジェクト『Deutsch — ドイツ語学習アプリ集』**全体**（ホーム / 単語 `vocabulary` / 発音 `pronunciation` / ドキュメント閲覧 `exam-guide`・`speaking`）に適用する**唯一の正本デザインキット**。各アプリの CSS（`*/css/styles.css`）はこの `:root` トークンを共有する。トークン参照は `{colors.*}` / `{typography.*}` / `{spacing.*}` / `{rounded.*}` / `{component.*}` 形式。
> 旧「Nintendo-2001 chrome」キットは破棄。periwinkle/halftone/carbon/chamfer 等は一切使わない。

## Overview

BMW's corporate site carries a far more **measured, corporate-automotive** interface than its motorsport-bombastic cousin BMW M. The atmosphere is light: `{colors.canvas}` (#ffffff) is the base surface, `{colors.surface-card}` (#fafafa) carries the soft-grey card plates, and dark navy `{colors.surface-dark}` (#1a2129) appears only inside hero bands — one per page, framing the lead model render.

Type runs BMW's licensed **BMW Type Next Latin** at two weights: heavy 700 (display + button + nav) and Light 300 (body + secondary copy). That contrast — heavy display next to thin paragraph — is the editorial signature. Weight 500 is deliberately absent; weight 400 only appears on caption and nav-link in neutral utility contexts.

The brand action color, **BMW corporate blue** (`{colors.primary}` — #1c69d4), works alone across every primary CTA — buttons are **rectangular, 0px corner**, with white type. The site rotates a blue-button + dark-navy-hero combination across page rhythm.

**Key Characteristics:**
- Light `{colors.canvas}` is the base surface; dark navy `{colors.surface-dark}` appears only inside hero bands — page rhythm relies on contrast.
- BMW corporate blue (`{colors.primary}` — #1c69d4) acts as the single primary action color.
- BMW Type Next Latin: weight 700 display against weight 300 body is the signature.
- Buttons are **rectangular, 0px radius**.
- Cards run as multi-up grids with no hairline border or minimal border — just white plate + photo + title.
- Photography sits in environment, no shadow — depth comes entirely from color-block contrast.
- Section rhythm holds at `{spacing.section}` (80px) for every major band.

## Colors

### Brand & Accent
- **BMW Blue (Primary)** (`{colors.primary}` — #1c69d4): The single brand action color. All primary CTAs, link prefixes, nav-link active. Press → `{colors.primary-active}` (#0653b6).
- **M tricolor** — `{colors.m-blue-light}` #0066b1 → `{colors.m-blue-dark}` #1c69d4 → `{colors.m-red}` #e22718. Divider/accent only; never a CTA fill. (本アプリでは原則未使用。)

### Surface
- **Canvas** (`{colors.canvas}` — #ffffff): default page surface.
- **Surface Soft** (`{colors.surface-soft}` — #f7f7f7): footer / sub-nav bands.
- **Surface Card** (`{colors.surface-card}` — #fafafa): light plate behind a card.
- **Surface Strong** (`{colors.surface-strong}` — #ebebeb): heavier grey divider.
- **Surface Dark** (`{colors.surface-dark}` — #1a2129): dark navy hero bands / large dark CTAs. Warm undertone, not pure black.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #262e38): nested cards on the dark hero.

### Hairlines
- **Hairline** (`{colors.hairline}` — #e6e6e6): 1px divider — input outline, card outline, table separator.
- **Hairline Strong** (`{colors.hairline-strong}` — #cccccc): more visible 1px outline — secondary buttons, emphasized borders.

### Text
- **Ink** (`{colors.ink}` — #262626): display + primary text.
- **Body** (`{colors.body}` — #3c3c3c): default running text.
- **Body Strong** (`{colors.body-strong}` — #1a1a1a): emphasized / lead text.
- **Muted** (`{colors.muted}` — #6b6b6b): footer links, breadcrumbs, captions.
- **Muted Soft** (`{colors.muted-soft}` — #9a9a9a): disabled text, fine print.
- **On Primary** (`{colors.on-primary}` — #ffffff): text on blue button.
- **On Dark** (`{colors.on-dark}` — #ffffff): text on dark hero.
- **On Dark Soft** (`{colors.on-dark-soft}` — #bbbbbb): secondary text on dark bands.

### Semantic
- **Success** (`{colors.success}` — #22c55e): confirmation / "available".
- **Warning** (`{colors.warning}` — #f59e0b): warning callouts.
- **Error** (`{colors.error}` — #dc2626): validation errors.

## Typography

### Font Family
**BMW Type Next Latin** (licensed). Open-source substitute: **Inter** (variable) at 700/300, letter-spacing 0. Fallback: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

- Inter 700 → display headlines, button labels, nav links
- Inter 300 (Light) → paragraphs, descriptive copy
- Inter 400 → caption, neutral nav-link

> 本アプリはオフライン前提のため外部Webフォントは読み込まない。Inter があれば使い、無ければ上記システムフォントにフォールバック（`@font-face` を使うならローカル同梱した場合のみ。原則 `font-family` 指定のみで運用）。700/300 のウェイトコントラストを必ず効かせる。

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 700 | 1.05 | 0 | Hero h1（見出し語・モデル名） |
| `{typography.display-lg}` | 48px | 700 | 1.1 | 0 | Section heads |
| `{typography.display-md}` | 32px | 700 | 1.15 | 0 | Sub-section heads |
| `{typography.display-sm}` | 24px | 700 | 1.25 | 0 | CTA-band headlines |
| `{typography.title-lg}` | 20px | 700 | 1.3 | 0 | Card group titles |
| `{typography.title-md}` | 18px | 700 | 1.4 | 0 | Card title, intro |
| `{typography.title-sm}` | 16px | 700 | 1.4 | 0 | List label |
| `{typography.body-md}` | 16px | 300 | 1.55 | 0 | Default body |
| `{typography.body-sm}` | 14px | 300 | 1.55 | 0 | Footer / fine print |
| `{typography.caption}` | 12px | 400 | 1.4 | 0.5px | Captions, meta |
| `{typography.label-uppercase}` | 13px | 700 | 1.3 | 1.5px | "LEARN MORE" links, tabs |
| `{typography.button}` | 14px | 700 | 1.0 | 0.5px | CTA button label |
| `{typography.nav-link}` | 14px | 400 | 1.4 | 0.3px | Top-nav items |

### Principles
- The **700/300 contrast** is the editorial signature. Weight 500 is absent.
- **No negative letter-spacing** — tracking stays at default (0).
- **UPPERCASE inline links** — "LEARN MORE" runs uppercase with 1.5px tracking + `›`.
- **Weight 400 only** on caption and nav-link.

## Layout

### Spacing System
- **Base unit:** 8px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- **Section padding:** 80px per major band. **Card padding:** 24px.

### Grid & Container
- **Max content width:** ~1440px center-aligned (本アプリは読み物中心なので本文カラムは ~720–880px に絞ってよい)。
- Card grids: multi-up at desktop → 2-up tablet → 1-up mobile.

### Whitespace Philosophy
Utility-driven, denser than M. Section rhythm 80px, card padding 24px.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body, top nav, footer, hero bands |
| Soft hairline | 1px `{colors.hairline}` border | Option tile, table divider |
| Card surface | `{colors.surface-card}` background — no shadow | Card plate |
| Photographic | Edge-to-edge photography | Hero band, renders |

**The system never uses a drop shadow.** Depth = color-block contrast (light canvas vs dark hero) + photography. (本アプリは写真素材を持たないため、ヒーローはネイビーの色面＋大型 display タイポで構成する。)

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Every button, card, input, chip — dominant radius |
| `{rounded.xs}` | 2px | rare small badges |
| `{rounded.sm}` | 4px | rare small inline button |
| `{rounded.md}` | 8px | rare mobile collapse cards |
| `{rounded.lg}` | 12px | rare modal/dialog |
| `{rounded.full}` | 9999px / 50% | circular icon button only |

Binary radius: **rectangular for everything, circular only for icon buttons.**

## Components

### `top-nav`
White sticky bar, 64px, `{colors.canvas}`. Left: wordmark; center/right: menu in `{typography.nav-link}` (14/400/0.3px). Active item `{colors.primary}`.

### Buttons
- **`button-primary`** — `{colors.primary}` bg, `{colors.on-primary}` text, `{typography.button}`, padding 14×32, height 48, `{rounded.none}`. Press → `{colors.primary-active}`.
- **`button-secondary`** — white bg, `{colors.ink}` text, 1px `{colors.hairline-strong}` border, same padding/height/radius.
- **`button-secondary-on-dark`** — transparent bg, `{colors.on-dark}` text, 1px `{colors.on-dark}` border, rectangular.
- **`button-text-link`** — UPPERCASE letter-spaced inline link, `{colors.ink}`, `{typography.label-uppercase}`, "LEARN MORE ›".
- **`icon-button`** — circular (`{rounded.full}`) icon-only button (e.g. ▶ play). Min 44×44 hit area.

### Cards & Containers
- **`hero-band-dark`** — full-width dark navy hero, `{colors.surface-dark}`, `{colors.on-dark}` text, 80px vertical padding. Centered display-xl headline + sub-headline + a single `{component.button-primary}` or `{component.button-secondary-on-dark}`.
- **`model-card`** — white card, `{rounded.none}`, 24px padding. Photo plate on `{colors.surface-card}` top, title `{typography.title-md}` below, one-line tagline `{typography.body-sm}`, a `{component.button-text-link}`.
- **`feature-photo-card`** — white card, 24px padding, headline + body.
- **`spec-cell`** — transparent, hairline-separated; value `{typography.display-sm}` over label `{typography.label-uppercase}`.

### Inputs & Forms
- **`text-input`** — white bg, `{colors.ink}` text, `{typography.body-md}`, `{rounded.none}`, padding 14×16, height 48, 1px `{colors.hairline}` border; focus → border thickens to ink.

### Tabs / Tags
- **`category-tab` / `-active`** — transparent; inactive `{colors.muted}` UPPERCASE; active `{colors.ink}` UPPERCASE + 2px ink underline. 12px vertical padding.
- **`filter-chip` / `-active`** — inactive white + 1px hairline-strong + `{colors.ink}`; active `{colors.ink}` bg + `{colors.on-dark}`. Padding 8×14, `{rounded.none}`.

### CTA / Footer
- **`cta-band`** — pre-footer band on `{colors.surface-dark}`, display-md headline + a single dark-surface button, 80px padding.
- **`footer`** — `{colors.surface-soft}` (#f7f7f7), `{colors.body}` text, link columns, copyright `{typography.body-sm}` `{colors.muted}`, 64px vertical padding.

## Do's and Don'ts

### Do
- Sit pages on `{colors.canvas}`; reserve `{colors.surface-dark}` for hero/CTA bands only.
- Primary CTAs = `{colors.primary}` + white text + `{rounded.none}` 0px.
- Display in 700, body in Light 300 — the contrast is non-negotiable.
- UPPERCASE letter-spaced "LEARN MORE"-style inline links.
- Rotate surface modes band-to-band (light → dark hero → light …).
- Section rhythm 80px.

### Don't
- No brand color other than blue for actions.
- No pill/rounded buttons — 0px rectangular is the button.
- No weight 500; don't bold body (Light 300 is the voice).
- **No drop shadows** — depth = contrast + photography.
- Don't repeat the same surface mode across two consecutive bands.
- Don't use the M tricolor as a CTA fill.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hamburger/collapsed nav; hero h1 64→40px; grids 1-up; footer → 1 col |
| Tablet | 768–1024px | nav narrows; grids 2-up |
| Desktop | 1024–1440px | full nav; multi-up grids |
| Wide | > 1440px | content fixed at 1440px; gutters absorb the rest |

### Touch Targets
- `{component.button-primary}` ≥ 48×48. `{component.text-input}` height 48. `{component.icon-button}` ≥ 44×44.

---

## アプリ適用マッピング（このプロジェクト固有）

| アプリ要素 | BMW コンポーネント |
|---|---|
| `<header>` | `top-nav`（白64px、左にワードマーク "DEUTSCH A1"、右にナビ／進捗） |
| ホーム | `hero-band-dark`（ネイビー）に本日の学習サマリ＋ `button-primary`「フラッシュカードを始める」、下に `model-card` 2枚（フラッシュカード / 読むだけ）を 2-up |
| フラッシュカード表（見出し語） | `display-xl`（64/700）。カード全体がクリック可能でめくる |
| めくる/次へ | `button-primary`（青・0px） |
| 自己評価3つ | 覚えてた=`{colors.primary}` か `{colors.success}`、あやふや=`button-secondary`、忘れた=`{colors.error}` 縁取り。**色＋ラベル＋キーボード(1/2/3)** を併記し色のみに依存しない |
| 例文の ▶ 再生 | `icon-button`（円形）。カラオケ・ハイライトは `{colors.primary}` |
| 読むだけ：検索 | `text-input`（0px・48px）＋ `category-tab`/`filter-chip` で絞り込み |
| 読むだけ：一覧 | `model-card`/list 行。各行に語＋意味プレビュー |
| 読むだけ：詳細 | 語・性・複数形・意味(JA/EN)・**全例文(独/日/英)＋例文ごとの音声カラオケ**を `feature-photo-card`/`spec-cell` 風に明快表示 |
| フッター | `footer`（soft-grey, リンク, コピーライト） |

## UX / HCI 要件（今回の重点・必須）

1. **クリックの直感性**: カード全体タップでめくる／詳細を開く。全インタラクティブ要素に `cursor:pointer` と hover/active のフィードバック。主要操作は青の `button-primary` で1つに明確化。キーボード操作（Space=めくる、1/2/3=評価、←/→ で前後、Enter=決定）とヒント表示。
2. **ランダム出題**: 新規語は seed順(アルファベット)ではなく**ランダムサンプル**で導入し、セッションの出題順も**シャッフル**。SRS の due 判定・箱遷移ロジックは保持。`srs` の純関数性とテストは維持（乱数は注入可能にして決定論的にテスト、9件以上green）。
3. **読むだけの表示**: 一覧は「単語＋意味プレビュー」、詳細で**単語・性・複数形・意味(JA/EN)・全例文(独/日/英)＋例文ごとの音声カラオケ**が確実に表示される。検索のヒット件数表示と空状態（「該当なし」）も。
4. **フィードバック/状態**: 進捗 "n / N"、評価後の遷移、セッション完了画面、空（due 0）状態。ローカルなのでローディングは不要。
5. **アクセシビリティ（ui-ux-pro-max / web-design-guidelines 準拠）**: コントラスト4.5:1、可視 `:focus-visible`、タッチ44px、アイコンのみボタンに `aria-label`、`aria-live` で件数/状態通知、`prefers-reduced-motion`、レスポンシブ（desktop 多列→mobile 1列）、横スクロール無し、フォーム label と input 関連付け。
