-- Migration 0001: Create base tables (group, note, note_revision, kv) and indexes.
-- NO FTS — FTS is created in migration 0002.

CREATE TABLE `group` (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  color         TEXT,
  icon          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  pinned        INTEGER NOT NULL DEFAULT 0,
  collapsed     INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE note (
  id            INTEGER PRIMARY KEY,
  group_id      INTEGER REFERENCES `group`(id) ON DELETE SET NULL,
  title         TEXT,
  content_md    TEXT NOT NULL DEFAULT '',
  content_html  TEXT NOT NULL DEFAULT '',
  word_count    INTEGER NOT NULL DEFAULT 0,
  is_pinned     INTEGER NOT NULL DEFAULT 0,
  is_archived   INTEGER NOT NULL DEFAULT 0,
  is_trashed    INTEGER NOT NULL DEFAULT 0,
  trashed_at    INTEGER,
  geom_x        INTEGER,
  geom_y        INTEGER,
  geom_w        INTEGER NOT NULL DEFAULT 280,
  geom_h        INTEGER NOT NULL DEFAULT 360,
  edge_dock     TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX idx_note_group ON note(group_id, updated_at DESC);
CREATE INDEX idx_note_updated ON note(updated_at DESC) WHERE is_trashed = 0;

CREATE TABLE note_revision (
  id            INTEGER PRIMARY KEY,
  note_id       INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
  content_md    TEXT NOT NULL,
  title         TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_rev_note ON note_revision(note_id, created_at DESC);

CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
