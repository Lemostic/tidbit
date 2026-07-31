CREATE TABLE note_attachment (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_attachment_note ON note_attachment(note_id, created_at DESC);
