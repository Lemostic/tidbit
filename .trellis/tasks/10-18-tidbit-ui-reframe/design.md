# Design: Tidbit Ink & Paper Refactor

## 1. Visual Direction

**Ink & Paper / 纸本工作台**

The interface is organized as a physical desk:

- **Desk**: warm, low-contrast paper background with a subtle fiber pattern and a soft light falloff.
- **Paper**: raised note surfaces and editor sheets with crisp, warm edges and restrained shadows.
- **Ink**: titlebar, group rail, and primary controls in near-black green/charcoal.
- **Seal**: vermilion accent for the active state, focus, and primary action.

The result should feel calm, editorial, and tactile, not nostalgic or skeuomorphic. No tape, torn edges, or fake handwriting beyond the clothesline's existing physical rope metaphor.

## 2. Tokens

Add a new semantic token vocabulary while keeping legacy names as aliases:

- `--paper`, `--paper-raised`, `--paper-sunk`
- `--ink`, `--ink-soft`, `--ink-faint`
- `--line`, `--line-strong`
- `--seal`, `--seal-strong`, `--seal-soft`
- `--marker-teal`, `--marker-ochre`, `--marker-indigo`
- `--font-editorial`, `--font-ui`, `--font-meta`
- `--shadow-paper`, `--shadow-float`
- `--shell-radius`, `--paper-radius`

Legacy `--bg`, `--surface`, `--fg`, `--border`, `--accent` aliases map to the new tokens so existing components remain functional.

### Light

- Desk: `#ebe4d7`
- Paper: `#faf6ec`
- Raised paper: `#fffaf0`
- Ink: `#25241f`
- Muted ink: `#625d53`
- Line: `#d8cdbc`
- Seal: `#b84a32`

### Dark

- Desk: `#11130f`
- Paper: `#1b1d17`
- Raised paper: `#23251e`
- Ink: `#eee7d8`
- Muted ink: `#b8af9e`
- Line: `#36352c`
- Seal: `#d66f52`

### Sepia

- Desk: `#e5d3b2`
- Paper: `#f8e9ca`
- Ink: `#372b1e`
- Seal: `#a8512e`

## 3. Typography

- Brand and large headings: Palatino/Iowan/Georgia stack for Latin, falling back to Microsoft YaHei UI for Chinese.
- UI controls: Microsoft YaHei UI / Segoe UI Variable.
- Metadata: Cascadia Mono/Consolas.
- Note title and body continue to respect existing user font preferences.
- Use semibold rather than heavy bold; reduce micro-text below 10px.

## 4. Layout

### Shell

- 44px titlebar with a thin ink baseline.
- 78px ink rail, extending full height.
- Paper content panel with a 16px shell radius.
- Transparent window remains; the shell paints the paper/ink layers.

### Compact window (500 x 780)

- Titlebar: brand, search, three quick actions, window controls.
- Rail: “全部” plus group index tabs.
- Notes header: eyebrow + large group title + count, then archive/new actions.
- Single-column note cards with a colored top rule and compact metadata.

### Three-column workspace

- Keep the existing outer rail plus notes workspace grid.
- Middle list: 360-400px wide index with paper rows.
- Right pane: a centered writing sheet on a desk background, maximum readable width, generous vertical rhythm.
- Empty pane: a blank sheet with a seal mark, “写点什么”, and two shortcut hints.

## 5. Component Mapping

- `Titlebar`: editorial wordmark, compact search field, icon actions, hairline bottom border.
- `GroupsSidebar`: ink rail; group tabs become file-index labels with color marks and a paper-colored active edge.
- `NotesGrid`: editorial heading, paper stack list, improved empty/error states.
- `NoteCard`: paper slip with top marker, clear title/excerpt/meta, hover-lift and focus ring.
- `NoteListItem`: index row with color marker, active paper surface, compact metadata.
- `NoteEditor`: writing sheet; title becomes display scale in pane mode; options and toolbar become a discreet tool rail.
- `SettingsPanel`: sectioned paper ledger with sticky header; no change to control semantics.
- `CommandPalette`: a large letterpress search card; tabs read as index dividers.
- `ConfirmDialog`, `Toast`, backup/lock surfaces: paper/ink variants.
- `Clothesline`: rope scene remains; cards adopt the paper system and legibility improvements.
- `WanderNote`: desk card with paper surface and ink header.

## 6. CSS Architecture

- Keep `globals.css` as the behavioral/legacy layer; do not rewrite selectors that tests assert.
- Add `src/styles/atelier.css` and link it after `globals.css` in `index.html`.
- `atelier.css` is the authoritative visual layer and may override legacy declarations.
- Keep `groups.css` imported by `globals.css`; the atelier layer overrides group visuals.
- Add a style contract test that reads `atelier.css`, asserting the paper/ink tokens, content-layer glass rule, three-column grid, and reduced-motion rule.

## 7. Glass Policy

- `data-liquid-glass` affects titlebar, rail, scrims, palette, settings, and transient overlays.
- Note cards, note list rows, editor content, and the right writing sheet remain opaque.
- If `backdrop-filter` is unsupported, fall back to paper surfaces.

## 8. Motion

- Page load: titlebar/rail fade in; note cards rise 4-6px with 30-45ms stagger.
- Selection: paper surface and marker transition in 140-180ms.
- Hover: cards lift 1px and deepen shadow; no scale on frequent list interactions.
- Editor/palette: 180-240ms paper reveal.
- Clothesline: retain existing rope/paper motion; respect reduced motion.

## 9. Accessibility

- Maintain at least 4.5:1 contrast for body text and 3:1 for large text/controls.
- `:focus-visible` uses a 2px seal outline with 2px offset.
- Icon buttons retain aria-labels/titles.
- Ensure hit targets remain at least 24px; primary controls target 32-36px.
- Keep semantic DOM, labels, and keyboard behavior unchanged.

## 10. Compatibility and Rollback

- No data or Rust contract changes.
- The refactor is primarily additive CSS plus small markup additions for headings/sections.
- Rollback is removing the `atelier.css` link and the small markup wrappers.
- Preserve all existing class names used by tests and Tauri window routing.

## 11. Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml --test wander`
- `cargo test --manifest-path src-tauri/Cargo.toml --test clothesline`
- Playwright audit screenshots at 500x780 and 1440x960, plus editor and palette states.
- `pnpm tauri build`; record NSIS/MSI names, sizes, SHA256.
