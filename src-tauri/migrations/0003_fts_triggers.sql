-- Migration 0003: FTS triggers to keep note_fts in sync with note table.

-- Insert: copy title+body from newly inserted note into FTS index.
CREATE TRIGGER note_fts_ai AFTER INSERT ON note BEGIN
  INSERT INTO note_fts(note_id, title, body)
  VALUES (new.id, new.title, new.content_md);
END;

-- Delete: remove FTS entry when note is deleted.
CREATE TRIGGER note_fts_ad AFTER DELETE ON note BEGIN
  DELETE FROM note_fts WHERE note_id = old.id;
END;

-- Update: re-index when note content changes.
CREATE TRIGGER note_fts_au AFTER UPDATE OF content_md, title ON note BEGIN
  DELETE FROM note_fts WHERE note_id = old.id;
  INSERT INTO note_fts(note_id, title, body)
  VALUES (new.id, new.title, new.content_md);
END;
