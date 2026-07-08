-- Migration 0002: FTS5 virtual table for full-text search.
-- note_id is UNINDEXED (FTS does not index it; it is stored for reference only).
-- title and body are indexed for search.
--
-- TEMPORARY WORKAROUND (D-026): the bundled-sqlcipher SQLite build used at
-- v1 does not enable ICU/unicode61 extensions, so we use the default tokenizer
-- which is `simple`. This loses diacritic-insensitive matching and unicode-aware
-- tokenization. When the build upgrades to a more complete SQLite (e.g.,
-- rusqlite with `bundled` feature or sqlcipher-sys with ICU), restore
-- tokenize='unicode61 remove_diacritics'.

CREATE VIRTUAL TABLE note_fts USING fts5(
  note_id UNINDEXED,
  title,
  body
);
