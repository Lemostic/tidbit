<div align="center">
  <img src="./src-tauri/icons/icon.png" width="104" alt="tidbit app icon">

  # tidbit

  **A quiet, fast, personal desktop space for ideas, tasks, and excerpts.**

  A local-first sticky notes app built for Windows, with Markdown editing, colorful groups, floating notes, encrypted automatic backups, and Chinese/English UI.

  [简体中文](./README.md) · [Download](https://github.com/Lemostic/tidbit/releases/latest) · [Changelog](./CHANGELOG.md) · [Contributing](#contributing)

  [![Version](https://img.shields.io/badge/version-0.1.1-3478D4?style=flat-square)](./CHANGELOG.md)
  [![Windows](https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square&logo=windows11&logoColor=white)](https://github.com/Lemostic/tidbit/releases/latest)
  [![Tauri](https://img.shields.io/badge/Tauri-2-24C8D8?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
  [![CI](https://img.shields.io/github/actions/workflow/status/Lemostic/tidbit/ci.yml?style=flat-square&label=CI)](https://github.com/Lemostic/tidbit/actions/workflows/ci.yml)
  [![Stars](https://img.shields.io/github/stars/Lemostic/tidbit?style=flat-square)](https://github.com/Lemostic/tidbit/stargazers)
</div>

![tidbit main window, editor, and settings](./docs/images/tidbit-showcase.png)

## Why tidbit?

A *tidbit* is a small piece of information worth keeping. This project does not try to become another heavyweight knowledge base. It focuses on the most natural desktop workflow: open, write, organize, and move on.

- **Local first** — notes stay on your computer by default, with no account or cloud service required.
- **Fast to capture** — a lightweight window, shortcuts, tray access, and a focused editor keep the path from thought to note short.
- **Calm by design** — a readable single-column layout, restrained motion, and transparency that can be turned off completely.
- **Small but capable** — Markdown, search, groups, pinning, archiving, floating windows, and encrypted backups in one app.

## Highlights

| | Capability |
|---|---|
| **Markdown notes** | A rich Markdown editor with headings, lists, quotes, code, emphasis, and consistent card rendering. |
| **Colorful groups** | Bookmark-style group rail with independent marker and background colors. New groups avoid the previous group's color. |
| **Fast organization** | Sort by title, creation time, or update time; move notes between groups; pin, archive, and trash notes. |
| **Floating notes** | Keep any note in its own desktop window, collapse it, adjust opacity, read it, or edit it in place. |
| **One-click copy** | Copy Markdown or clean formatted text while preserving list numbering and nesting. |
| **Desktop behavior** | Always on top, edge docking, auto-hide, tray mode, and recovery of hidden windows. Pinned windows never auto-hide. |
| **Personal appearance** | Light, dark, and eye-care themes, vivid colors, per-area fonts, liquid glass, and a fully opaque mode. |
| **Privacy and backups** | SQLCipher database, hidden content, privacy lock, AES-256-GCM backups, and background rotation. |
| **Bilingual UI** | Switch between Simplified Chinese and English instantly. Locale resources are contributor-friendly. |

## Floating notes

<table>
  <tr>
    <td width="46%" align="center">
      <img src="./docs/images/tidbit-floating-note.png" alt="tidbit floating note window">
    </td>
    <td>
      <strong>Keep the information you need in sight instead of burying it in another window.</strong>
      <br><br>
      A floating note has its own desktop window. It can stay read-only, switch into editing, collapse into its title bar, and follow the main app's theme, fonts, opacity, and liquid-glass preferences.
    </td>
  </tr>
</table>

## Download

Get the latest build from [GitHub Releases](https://github.com/Lemostic/tidbit/releases/latest):

- `tidbit_*_x64-setup.exe` — recommended NSIS installer for most users.
- `tidbit_*_x64_en-US.msi` — useful for managed or enterprise deployment.

Requirements:

- Windows 10 or Windows 11 (x64)
- Microsoft Edge WebView2 Runtime

Current builds are not commercially code-signed, so Windows SmartScreen may show a warning on first launch. Only download installers from this repository's Releases page.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` | Open search and the command palette |
| `Ctrl + N` | Create a note |
| `Ctrl + Shift + N` | Create a group |
| `Ctrl + Shift + B` | Create an encrypted backup now |
| `Ctrl + L` | Lock the interface |
| `Ctrl + ,` | Open settings |

## Data, backups, and privacy

- The default data directory is `%APPDATA%\tidbit`; it can be migrated from Settings.
- The database is encrypted at rest with SQLCipher.
- Manual and automatic backups are encrypted snapshots.
- Automatic backup intervals range from `0.5` to `24` hours in `0.5` hour steps.
- Automatic retention defaults to `1` file and supports up to `10`; manual backups are not rotated away.
- Hiding a note masks its body while preserving its title for identification. Hidden bodies cannot be copied.
- Privacy lock hides the current interface; tidbit should not be treated as a password manager or dedicated secrets vault.

> tidbit is still an early `0.1.x` project. Evaluate the risk yourself and keep additional backups for highly sensitive data.

## Development

### Prerequisites

- Windows 10/11
- Node.js and pnpm
- Rust stable
- Visual Studio C++ Build Tools
- WebView2 Runtime
- Strawberry Perl, which may be needed for the first vendored OpenSSL build

### Run the app

```bash
pnpm install
pnpm tauri dev
```

For frontend-only development:

```bash
pnpm dev
```

Window management, tray behavior, edge docking, and floating notes must be validated in the Tauri runtime.

### Checks

```bash
pnpm typecheck
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

### Build installers

Close any running `tidbit.exe`, then run:

```bash
pnpm tauri build
```

Bundles are written to:

- `src-tauri/target/release/bundle/nsis/`
- `src-tauri/target/release/bundle/msi/`

## Stack

| Layer | Technology |
|---|---|
| Desktop | Tauri 2 |
| Backend | Rust + Tokio |
| Frontend | React 18 + TypeScript + Vite |
| Editor | Tiptap / ProseMirror |
| Database | SQLCipher / rusqlite |
| Backup encryption | AES-256-GCM + PBKDF2-SHA512 |
| Icons | Phosphor Icons + custom tidbit app icon |
| Tests | Vitest + Testing Library + Rust tests |

## Localization

Locale resources live in:

```text
resources/locales/
├── en/translation.json
├── zh-CN/translation.json
└── README.md
```

To add a language, copy an existing translation file, preserve the key structure, and register the locale in `src/i18n/index.ts`. See the [localization guide](./resources/locales/README.md).

## Roadmap

- Stable and intuitive custom/manual ordering
- Windows code signing and a smoother update path
- More complete import, export, and backup management
- More community-maintained languages
- Continued accessibility, keyboard, and performance improvements

The roadmap will follow real-world feedback. Use [Issues](https://github.com/Lemostic/tidbit/issues) for bugs and feature proposals.

## Contributing

Contributions of every size are welcome: bug fixes, UI polish, documentation, tests, translations, and new ideas.

1. Fork the repository and create a focused branch.
2. Keep changes scoped and add tests for behavioral changes.
3. Run the relevant checks.
4. Open a pull request explaining the motivation, implementation, and verification.

For larger features, please open an Issue first to align on scope and avoid duplicated effort.

## Documentation

- [Changelog](./CHANGELOG.md)
- [Architecture](./docs/dev/architecture.md)
- [Developer handoff](./docs/dev/handoff.md)
- [Localization guide](./resources/locales/README.md)

---

<div align="center">
  If tidbit helps you, consider leaving a ⭐.<br>
  Every report and contribution makes this small desktop space better.
</div>
