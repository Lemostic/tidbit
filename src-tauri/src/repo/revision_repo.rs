use crate::domain::Revision;
use crate::error::AppError;
use crate::infra::db::Pool;

/// Repository for note revision history.
pub struct RevisionRepo {
    pool: Pool,
}

impl RevisionRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Append a new revision snapshot for a note.
    pub fn append(
        &self,
        note_id: i64,
        content_md: &str,
        title: Option<&str>,
    ) -> Result<(), AppError> {
        let conn = self.pool.get()?;
        conn.execute(
            "INSERT INTO note_revision(note_id, content_md, title, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![note_id, content_md, title, chrono::Utc::now().timestamp_millis()],
        )?;
        Ok(())
    }

    /// Delete all revisions for a note except the `keep` most recent ones.
    pub fn prune(&self, note_id: i64, keep: usize) -> Result<(), AppError> {
        let conn = self.pool.get()?;
        conn.execute(
            "DELETE FROM note_revision WHERE note_id=?1 AND id NOT IN \
             (SELECT id FROM note_revision WHERE note_id=?1 ORDER BY created_at DESC LIMIT ?2)",
            rusqlite::params![note_id, keep as i64],
        )?;
        Ok(())
    }


    /// Restore a note's content (markdown and derived fields) from a revision.
    /// The stored HTML is regenerated client-side, so we set it to the same
    /// markdown string as a safe placeholder and let the editor re-render it.
    pub fn restore(&self, note_id: i64, revision_id: i64) -> Result<(), AppError> {
        let conn = self.pool.get()?;
        let row = conn.query_row(
            "SELECT content_md, title FROM note_revision WHERE id=?1 AND note_id=?2",
            rusqlite::params![revision_id, note_id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?)),
        );
        let (md, title) = match row {
            Ok(v) => v,
            Err(rusqlite::Error::QueryReturnedNoRows) => return Err(AppError::NotFound),
            Err(e) => return Err(e.into()),
        };
        let now = chrono::Utc::now().timestamp_millis();
        let words = md.chars().filter(|c| !c.is_whitespace()).count() as i64;
        let updated_title = title.as_deref().filter(|t| !t.trim().is_empty());
        conn.execute(
            "UPDATE note SET content_md=?1, content_html=?2, word_count=?3, updated_at=?4, title=COALESCE(?5, title) WHERE id=?6",
            rusqlite::params![md, md, words, now, updated_title, note_id],
        )?;
        Ok(())
    }
    /// List all revisions for a note, newest first.
    pub fn list(&self, note_id: i64) -> Result<Vec<Revision>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT id, note_id, content_md, title, created_at \
             FROM note_revision WHERE note_id=?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map([note_id], |r| {
            Ok(Revision {
                id: r.get(0)?,
                note_id: r.get(1)?,
                content_md: r.get(2)?,
                title: r.get(3)?,
                created_at: r.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }
}
