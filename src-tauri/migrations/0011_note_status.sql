-- Migration 0011: Add kanban status column to note.
-- Values: 'todo' (default), 'doing', 'done'. NULL is allowed for legacy rows.

ALTER TABLE note ADD COLUMN status TEXT NOT NULL DEFAULT 'todo';
CREATE INDEX idx_note_status_order ON note(group_id, status, sort_order);
