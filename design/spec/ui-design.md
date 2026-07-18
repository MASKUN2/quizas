# 7. UI & Visual Design

Part of the [quizas specification](./README.md).

The visual language is part of the product, so it lives here. This section is
deliberately at the *intent* altitude — it defines tokens, structure, and shared
patterns, not class names or markup. When a screen needs a new pattern, add it
here first so the site stays consistent. Concrete HTML mockups of every screen
live in [`../wireframe/`](../wireframe/).

## 7.1 Design principles
- **Reading-first, content over chrome.** The article is the interface; UI
  recedes. No sidebars, carousels, or decorative imagery competing with text.
- **Minimal and quiet.** A single neutral palette, one accent only where meaning
  requires it (success/error feedback). Restraint over richness.
- **Calm by default.** Generous whitespace and vertical rhythm; nothing blinks,
  slides, or demands attention.

## 7.2 Layout & structure
- **One centred column** of comfortable reading width (~672px max) with
  consistent horizontal padding; the same column governs every public page.
- **Generous vertical rhythm** — large top/bottom breathing room around the
  article; clear separation between meta, body, and comments.
- **A persistent site header** on every page: the brand wordmark (links home)
  plus a small primary nav (currently *Home*, *Series*).
- **Mobile-first and responsive.** The single-column layout collapses cleanly;
  multi-field rows (e.g. the comment form) stack on narrow viewports.

## 7.3 Colour & theme
- **Two themes, light and dark**, selected automatically from the OS preference.
  There is **no manual theme toggle** — the system setting is honoured.
- Colour is expressed as **role tokens**, not raw values, so both themes derive
  from the same set:

  | Token | Role | Light | Dark |
  |---|---|---|---|
  | `background` | Page surface | near-white | near-black |
  | `foreground` | Primary text | near-black | off-white |
  | `muted` | Secondary text, meta, timestamps | mid grey | mid grey |
  | `subtle` | Chip / card / code backgrounds | faint grey wash | faint light wash |
  | `border` | Hairline dividers, rules, field borders | light grey | dark grey |
  | `strong` | Primary button surface (inverts on theme) | foreground | foreground |

- **Accent colour is reserved for feedback only**: success (green) and error
  (red) flash messages. It is never used decoratively.

## 7.4 Typography
- **Sans-serif for UI and body; monospace for code** (inline and blocks).
- A small, fixed type scale: *page title* (largest, bold, tight tracking) →
  *list/section title* → *body* → *meta* (smallest, muted). Headings inside
  rendered Markdown step down within the body.
- **English UI, multilingual content.** UI copy is English, but type,
  line-height, and wrapping must still read well for **Korean/CJK content**;
  nothing may break on non-ASCII titles, slugs, or comment text.

## 7.5 Shared UI patterns
These are the recurring building blocks; reuse them rather than inventing new ones.

- **Meta row** — a small, muted line carrying *category · publish date · reading
  time (N분)*. Reading time and tags appear only when present.
- **Category chip** — a pill-shaped, subtle-background link; a post has exactly one.
- **Tag** — an inline `#name` link in muted text; zero or more, wrap freely.
- **Series banner** — a bordered card on a post that belongs to a series, naming
  the series and the post's position (*N편*), linking to the series page.
- **Primary button** — solid `strong` surface with inverted text; one per form.
- **Form field** — bordered input/textarea with placeholder; fields stack on
  mobile, may sit in a row on wider screens.
- **Editor image insert** — in the post editor, an image can be added by pasting,
  dragging a file onto the body, or a file-picker button. On drop the image
  uploads and a Markdown image reference is inserted at the cursor; an
  in-progress placeholder marks the spot until it is replaced on success, or
  removed with an error flash on failure.
- **Edit / preview toggle** — the body editor switches between raw Markdown and a
  rendered preview, using the same renderer as the public post page. The preview
  occupies the **same height as the editor** and scrolls within that box, so
  toggling never shifts the page.
- **Back link** — a quiet "← 목록으로" affordance returning to the list.
- **Author shortcut** — when the author is signed in, author-only affordances
  (e.g. an *Edit →* link on a published post's public page) appear inline and
  quiet, in the muted register; they are absent entirely for readers ([§5.5](./policies.md#55-authorisation)).
- **Empty state** — a single muted sentence, never a blank screen (e.g. a post
  list with nothing to show still says so).
- **Flash message** — a coloured, dismissible-feeling banner confirming an action
  (success) or reporting a problem (error), shown after a form submission.
- **Confirm dialog** — a destructive action (deleting a post) never fires on the
  first click. It opens a small modal dialog asking the author to confirm; the
  dialog can be dismissed (cancel, escape, or clicking outside) without acting,
  and only the explicit confirm carries the action out. Used wherever a delete
  affordance appears ([§4.1](./functional.md#41-posts-author)).
- **Autosave indicator** — a quiet muted line near the save control reflects
  autosave state (*saving… / saved at HH:MM / save failed*). For a **published**
  post, where an autosaved edit goes live immediately, it reads *saved & live at
  HH:MM* to make that plain. It never competes with the content
  ([§4.1](./functional.md#41-posts-author)).

## 7.6 Copy & microcopy
- **All UI copy is English**, in a plain, friendly register. **User content and
  data — post titles/bodies, comments, and category/tag/series names — may be
  Korean or any language** and are shown exactly as authored; only the app's own
  chrome is translated. The brand name *quizas* is never translated.
- **Dates** render in ISO form (`YYYY-MM-DD`, e.g. `2026-07-11`); reading time as
  *N min*; series position as *Part N*; counts as *N posts*.
- Microcopy is reassuring and specific. Required, fixed strings:
  - Empty post list → *"No posts published yet."*
  - No comments yet → *"Be the first to comment."*
  - Comment accepted → *"Comment submitted — it'll appear after review."* (reflects
    the moderation policy in [§5.4](./policies.md#54-comments) — every comment is
    pending until approved).
  - Comment rejected → *"Submission failed. Please check your input."*
- The email field is always labelled as **optional and private**, reinforcing
  [§5.4](./policies.md#54-comments).

## 7.7 Accessibility
- Meet the readability bar in [§6](./policies.md#6-non-functional-requirements):
  sufficient contrast in both themes, legible type sizes, and a layout usable
  down to small mobile widths.
- Time values carry machine-readable timestamps; links are real links;
  interactive controls are keyboard-reachable with a visible focus state.
