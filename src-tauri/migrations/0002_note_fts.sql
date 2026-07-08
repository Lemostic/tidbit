-- Migration 0002: FTS5 virtual table for full-text search.
-- note_id is UNINDEXED (FTS does not index it; it is stored for reference only).
-- title and body are indexed for search.

CREATE VIRTUAL TABLE note_fts USING fts5(
  note_id UNINDEXED,
  title,
  body,
  tokenize='unicode61 remove_diacritics'
);
