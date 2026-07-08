# tidbit

桌面便签, Tauri 2 + Rust + React 18 + SQLCipher.

## 开发

```bash
pnpm install
pnpm tauri dev
```

## 测试

```bash
pnpm test
cd src-tauri && cargo test
```

## 打包

```bash
pnpm tauri build
```

## 设计文档

- [Design spec](./docs/superpowers/specs/2026-07-09-tidbit-sticky-notes-design.md)
- [Implementation plan](./docs/superpowers/plans/2026-07-09-tidbit-sticky-notes-impl.md)
- [Architecture](./docs/dev/architecture.md)

## Security notes

- **Database at-rest encryption**: SQLCipher with AES-256 (key currently a development placeholder; see `src-tauri/src/lib.rs`)
- **Backup encryption**: AES-256-GCM with a key derived from PBKDF2-SHA512 (placeholder key in v1)
- **TODO (D-032)**: PIN UI for production users — the backup and DB keys must be wired to a user-provided PIN instead of placeholders before production release
- **FTS5 diacritic search (D-026)**: Full-text search currently uses the default FTS5 tokenizer (unicode61). Diacritic-insensitive search (e.g., searching "cafe" finds "cafe") requires ICU support to be enabled in the SQLCipher build

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Tauri 2 |
| Backend | Rust |
| Frontend | React 18 + TypeScript |
| Rich text | Tiptap (ProseMirror) |
| Database | SQLCipher (rusqlite-sqlcipher) |
| Encryption | AES-256-GCM + PBKDF2-SHA512 |
