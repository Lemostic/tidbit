-- Migration 0004: Add optional color column to note.

ALTER TABLE note ADD COLUMN color TEXT;
