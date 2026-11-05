# Implementation Plan

## 1. Baseline and Safety

- [ ] Re-read the current uncommitted diff for UI files before editing.
- [ ] Keep `src/styles/globals.css` behavior and test-asserted strings intact.
- [ ] Add `src/styles/atelier.css` and link it after `globals.css`.

## 2. Tokens and Shell

- [ ] Replace `tokens.css` with the paper/ink semantic token system and legacy aliases.
- [ ] Restyle `.app-shell`, `.app-body`, `.app-main`, `.titlebar` for the new desk/paper shell.
- [ ] Add editorial brand treatment, search field, and action grouping in `Titlebar`.

## 3. Groups and Notes Index

- [ ] Restyle the ink rail and file-index group tabs in `atelier.css`.
- [ ] Add editorial heading/eyebrow markup to `NotesGrid`.
- [ ] Restyle compact note cards and hover/focus/drag states.
- [ ] Restyle the OneNote middle list and selected row.

## 4. Editor and Right Pane

- [ ] Restyle modal, pane, and embedded editor as the same writing sheet.
- [ ] Improve title scale, options row, toolbar, editor content rhythm, and status footer.
- [ ] Add a designed blank-sheet empty state to the right pane.

## 5. Overlays and Desktop Surfaces

- [ ] Restyle command palette, settings, confirm dialog, toast, lock screen, and restore panel.
- [ ] Add settings section grouping without changing control semantics.
- [ ] Restyle wander card/editor windows.
- [ ] Restyle clothesline panel/cards while preserving rope geometry and drag behavior.

## 6. Glass and Themes

- [ ] Keep glass on functional/transient surfaces only.
- [ ] Verify light, dark, and sepia theme readability.
- [ ] Add `@supports not (backdrop-filter: blur(1px))` fallback.

## 7. Tests

- [ ] Add `atelierStyle.test.ts` covering tokens, glass content policy, three-column contract, and reduced motion.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm test`.
- [ ] Run `cargo check` and the relevant Rust tests.

## 8. Visual QA

- [ ] Start Vite and capture 500x780, 1440x960, editor, and palette screenshots with `scripts/ui-preview-shot.cjs`.
- [ ] Inspect screenshots for hierarchy, overflow, contrast, and empty-state balance.
- [ ] Fix visual regressions and recapture.

## 9. Release

- [ ] Bump version consistently to `0.3.0`.
- [ ] Update README and CHANGELOG.
- [ ] Run `pnpm tauri build`.
- [ ] Record artifact paths, sizes, and SHA256.

## 10. Settings Folio Follow-up

- [ ] Replace the narrow settings modal composition with a wide editorial folio: identity/index rail plus scrolling paper surface.
- [ ] Keep every existing setting handler and input semantic unchanged.
- [ ] Collapse to a single-column internal-scroll sheet at 500 x 780 with no horizontal overflow.
- [ ] Capture both wide and compact settings screenshots.
- [ ] Re-run typecheck, lint, full tests, frontend build, and Tauri packaging.

## Rollback Points

- After tokens/shell.
- After rail/list.
- After editor/overlays.
- Before packaging.
