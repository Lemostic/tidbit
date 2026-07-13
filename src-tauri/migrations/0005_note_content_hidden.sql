-- Migration 0005: Persist per-note content visibility. New notes remain visible.

ALTER TABLE note ADD COLUMN is_content_hidden INTEGER NOT NULL DEFAULT 0;
