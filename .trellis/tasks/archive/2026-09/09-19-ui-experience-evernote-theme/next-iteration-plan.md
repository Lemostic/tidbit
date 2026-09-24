# 0.2.10 — Editor controls, Markdown toolbar and voice recording

Status: approved for implementation by the user (combined Markdown and recording plans). This is a follow-on iteration; it does not retroactively authorize committing prior unrelated work. The prior commit/push scope question remains unresolved.

## Goal

User refinement: all note toolbar action buttons remain icon-only in every window size; names appear via hover titles and accessible labels. This includes More actions, table controls and link actions. Recording dialog copy and settings labels remain descriptive.

Fix the off-center selected-color checkmark shown in the user screenshot and make common Markdown editing actions accessible without memorizing syntax.

## Evidence

- `src/features/notes/NoteEditor.tsx:264`: color buttons render an 11px Check icon inside a fixed-size button.
- `src/styles/globals.css:470`: grid centering exists but padding is not reset. Later refinement and polish rules change diameters, including an 18px wide-editor variant. Confirm computed geometry before fixing.
- `src/features/notes/EditorToolbar.tsx`: bold, italic, strike, lists, tasks, quote, inline code, timeline, image, recording and history actions already exist. Heading, fenced code, links, separator and tables lack direct toolbar controls.
- `src/features/notes/NoteEditor.tsx:79`: StarterKit and lowlight are registered; table nodes are not.
- `src/features/notes/sanitizeNoteHtml.ts:4`: table elements are absent from the allowed tag set.
- Installed tiptap-markdown supports standard header-row pipe tables; merged cells and multi-block cells fall back to HTML serialization.

## Proposed scope and requirements

1. Normalize swatch padding, box sizing, flex shrink and SVG layout. Preserve the selected ring and provide accessible selected state. Verify center displacement no greater than 1 CSS px at normal and enlarged browser scale, across compact, wide and embedded editors.
2. Add paragraph/H1/H2/H3 selector, fenced code block, horizontal rule, add/edit/remove link, and clear formatting. Preserve existing commands and undo/redo; labels/tooltips expose existing shortcuts without claiming unsupported shortcuts.
3. Add editable tables: default 3x3 including a header row, insert/delete row or column, delete table. Show table actions only with selection in a table; retain editing selection when using toolbar controls. Support Tab navigation and undo.
4. Keep essential controls visible and place secondary operations in an accessible More menu in narrow windows; keyboard navigation, Escape dismissal and focus restoration required. No clipped controls in embedded windows.
5. Preserve tables through HTML save/reopen, standard Markdown serialization and Markdown paste. Retain safe table structure in card/wander previews; wide tables scroll inside their content region. Restrict link schemes using existing safety policy.
6. Update version consistently to 0.2.10 and add changelog entries after verification. Build Windows NSIS/MSI installers. Commit/push must respect the unresolved prior-change scope.

## Non-goals

Spreadsheet formulas, merged cells, column resizing, rich nested blocks in cells, diagram/math plugins, arbitrary HTML editing, storage schema changes, and a new PDF layout engine. PDF table formatting is not a release promise in this iteration; document existing export behavior.

## Technical design

Use a Tiptap table extension compatible with the installed 3.27.3 editor and update pnpm-lock.yaml. Keep command UI in EditorToolbar, registration in NoteEditor, and preview safety in sanitizeNoteHtml. Keep current content_md/content_html persistence fields and IPC signatures. Scope table styles to editor and note previews. Test Markdown pipe escaping, inline formatting, empty cells and roundtrip before enabling release. If the installed serializer needs a local fix, keep it inside an editor-specific extension with regression tests.

## Ordered implementation and acceptance

- [ ] Inspect computed swatch geometry; fix and capture screenshot of all swatch sizes including dark and Evernote.
- [ ] Implement basic commands and responsive menu; verify commands act on the intended selection and update active/disabled states.
- [ ] Register table nodes and context commands; validate insertion, row/column edits, undo, Tab and save/reopen.
- [ ] Extend sanitizer narrowly; verify tables retain structure while unsafe attributes/URLs remain removed.
- [ ] Verify standard Markdown table serialization/paste, including escaped pipes, and compact preview overflow.
- [ ] Run typecheck, lint, focused tests, full tests, production build and browser smoke at 520px and 1440px, plus embedded editor.
- [ ] Update version/changelog, build Windows installers, record artifact paths and verification limits.

## Review gate

Approve this proposed scope before implementation. The user owns the feature scope; the table default and secondary-command menu above are recommendations for review, not finalized product decisions.

## Added scope: enhanced voice recording (user request)

Keep the color-checkmark fix and Markdown/table work above. Add the following voice recording deliverable to the same planned version.

### Current evidence

`VoiceRecorderControls.tsx` already prefers WebM/Opus with WebM/MP4 fallbacks but requests only `audio: true`, sets no bitrate, and provides only start/stop/cancel. It calculates wall-clock duration, keeps chunks in memory, and embeds base64 audio in note HTML. `AudioRecording.tsx` supports playback, rename and delete; Markdown serialization is currently a name-only placeholder. Existing audio tests cover formatting only.

### Proposed behavior

- Microphone button opens a compact recording panel with input level, elapsed and retained duration, current quality, settings, pause/resume, stop/preview, insert and discard. Expose starting, recording, manually paused, skipping silence, processing and error states. Preserve the user's editor insertion position.
- Quality presets use Opus where available: compact speech 32 kbps mono, balanced 64 kbps mono (default), high quality 128 kbps (request stereo only when supported). These are encoder targets, not lossless or guaranteed output rates. Fall back to supported codecs and display the actual format.
- Optional browser noise suppression and echo cancellation, enabled by default when supported; do not promise AI denoising. Show unsupported/requested status accurately using supported constraints and track settings; do not claim an enabled effect from the request alone. Keep automatic gain optional because it may amplify room noise.
- Skip silence is opt-in, off by default to preserve quiet speech. Provide sensitivity control, a sustained-silence delay and distinct pause/resume thresholds. Prefer analysis before encoding with a short buffered lead-in so the first syllable is not lost; finalize implementation choice after verifying Web Audio/WebView2 support. If safe buffering is unavailable, visibly disable skipping rather than silently cut speech. Never discard arbitrary MediaRecorder chunks, which can corrupt the container.
- Manual pause cannot be undone by sound detection. Display real elapsed time separately from retained recording time and use retained time for the inserted audio duration. Preserve a short tail around speech; all-silence sessions report no captured speech rather than insert an empty recording.
- Preview before insertion; show measured encoded byte size and duration. Preserve old embedded recordings. Keep the current embedded storage format for this iteration and impose a documented duration/size cap with automatic stop-to-preview to bound memory. Propose 30 minutes or 25 MiB encoded data, whichever comes first; base64 adds roughly one third to encoded size and transient memory can be higher.
- Handle permission denial, no device, unplugging, unsupported codec, rapid repeated clicks, cancellation while permission is pending and unmount during conversion. Stop tracks, timers and audio context in every exit path. Offer any usable partial audio for preview after interruption.

### Exclusions and risks

No cloud transcription, voice identification, generative voice processing, native DSP dependency, retroactive enhancement of existing files or audio attachment-storage migration. Markdown export of audio remains a known limitation (name-only placeholder); do not claim audio roundtrip through Markdown. Native microphone quality requires a real-device check beyond mocked browser tests.

### Implementation and acceptance additions

1. Separate capture lifecycle and sound-level/silence policy from toolbar rendering; define an explicit state machine with request cancellation guards.
2. Test bitrate/constraint selection and fallback, manual pause versus silence pause, hysteresis and lead-in/tail retention with synthetic audio, partial capture, all-silence input and cleanup races.
3. Test preview/insert/discard, encoded size cap, retained duration and compatibility with saved recordings.
4. Validate keyboard focus and panel layout in compact, wide and embedded editors; input-level animation respects reduced motion.
5. Run all frontend gates and build installers. Record separately what was tested with synthetic/mock input and what remains a physical microphone verification.

The combined planning summary must be approved before starting this enlarged implementation scope.
