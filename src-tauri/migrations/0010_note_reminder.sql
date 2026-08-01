CREATE TABLE note_reminder (note_id INTEGER PRIMARY KEY REFERENCES note(id) ON DELETE CASCADE, remind_at INTEGER NOT NULL, notified INTEGER NOT NULL DEFAULT 0, repeat_rule TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX idx_reminder_due ON note_reminder(notified, remind_at);
