-- Migration 0007: Persist manual note ordering independently from updated_at.

ALTER TABLE note ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
UPDATE note SET sort_order = -updated_at;
CREATE INDEX idx_note_manual_order ON note(group_id, is_archived, sort_order);
