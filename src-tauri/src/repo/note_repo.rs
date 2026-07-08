use crate::domain::{EdgeDock, Note};
use crate::error::AppError;
use crate::infra::db::Pool;

/// Repository for Note CRUD operations.
pub struct NoteRepo { pool: Pool }

impl NoteRepo {
    pub fn new(pool: Pool) -> Self { Self { pool } }

    fn row_to_note(r: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
        let edge_str: Option<String> = r.get(14)?;
        let edge = match edge_str.as_deref() {
            Some("left") => EdgeDock::Left,
            Some("right") => EdgeDock::Right,
            Some("top") => EdgeDock::Top,
            Some("bottom") => EdgeDock::Bottom,
            _ => EdgeDock::None,
        };
        Ok(Note {
            id: r.get(0)?,
            group_id: r.get(1)?,
            title: r.get(2)?,
            content_md: r.get(3)?,
            content_html: r.get(4)?,
            word_count: r.get(5)?,
            is_pinned: r.get::<_, i64>(6)? != 0,
            is_archived: r.get::<_, i64>(7)? != 0,
            is_trashed: r.get::<_, i64>(8)? != 0,
            trashed_at: r.get(9)?,
            geom_x: r.get(10)?,
            geom_y: r.get(11)?,
            geom_w: r.get(12)?,
            geom_h: r.get(13)?,
            edge_dock: edge,
            created_at: r.get(15)?,
            updated_at: r.get(16)?,
            color: r.get(17)?,
        })
    }

    const SELECT: &'static str =
        "SELECT id, group_id, title, content_md, content_html, word_count, \
        is_pinned, is_archived, is_trashed, trashed_at, geom_x, geom_y, geom_w, geom_h, edge_dock, \
        created_at, updated_at, color FROM note";

    pub fn create_in_group(&self, group_id: Option<i64>, title: &str) -> Result<Note, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute(
            "INSERT INTO note(group_id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![group_id, title, now, now],
        )?;
        let id = conn.last_insert_rowid();
        self.get(id)
    }

    pub fn get(&self, id: i64) -> Result<Note, AppError> {
        let conn = self.pool.get()?;
        let sql = format!("{s} WHERE id = ?1", s = Self::SELECT);
        conn.query_row(&sql, rusqlite::params![id], Self::row_to_note)
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
                other => AppError::Db(other),
            })
    }

    pub fn list_by_group(&self, group_id: Option<i64>) -> Result<Vec<Note>, AppError> {
        let conn = self.pool.get()?;
        let sql = match group_id {
            Some(_) => format!(
                "{s} WHERE group_id = ?1 AND is_trashed = 0 ORDER BY is_pinned DESC, updated_at DESC",
                s = Self::SELECT
            ),
            None => format!(
                "{s} WHERE is_trashed = 0 ORDER BY is_pinned DESC, updated_at DESC",
                s = Self::SELECT
            ),
        };
        let mut stmt = conn.prepare(&sql)?;
        let rows = if let Some(g) = group_id {
            stmt.query_map([g], Self::row_to_note)?
        } else {
            stmt.query_map([], Self::row_to_note)?
        };
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    /// Update note content fields. FTS sync is handled by database triggers
    /// (migration 0003_fts_triggers.sql). Revision tracking and pruning are
    /// called from the IPC layer (T10) — they are deliberately NOT included here.
    pub fn update_content(
        &self,
        id: i64,
        md: &str,
        html: &str,
        words: i64,
    ) -> Result<Note, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        let affected = conn.execute(
            "UPDATE note SET content_md=?1, content_html=?2, word_count=?3, updated_at=?4 WHERE id=?5",
            rusqlite::params![md, html, words, now, id],
        )?;
        if affected == 0 {
            return Err(AppError::NotFound);
        }
        self.get(id)
    }

    pub fn set_geometry(&self, id: i64, x: i32, y: i32, w: i32, h: i32) -> Result<(), AppError> {
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET geom_x=?1, geom_y=?2, geom_w=?3, geom_h=?4 WHERE id=?5",
            rusqlite::params![x, y, w, h, id],
        )?;
        Ok(())
    }

    pub fn set_edge_dock(&self, id: i64, edge: EdgeDock) -> Result<(), AppError> {
        let s = match edge {
            EdgeDock::Left => "left",
            EdgeDock::Right => "right",
            EdgeDock::Top => "top",
            EdgeDock::Bottom => "bottom",
            EdgeDock::None => "",
        };
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET edge_dock=?1 WHERE id=?2",
            rusqlite::params![s, id],
        )?;
        Ok(())
    }

    pub fn trash(&self, id: i64) -> Result<(), AppError> {
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET is_trashed=1, trashed_at=strftime('%s','now')*1000 WHERE id=?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }

    pub fn restore(&self, id: i64) -> Result<(), AppError> {
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET is_trashed=0, trashed_at=NULL WHERE id=?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }

    /// Delete all trashed notes with `trashed_at` older than `ts` (milliseconds).
    pub fn purge_older_than(&self, ts: i64) -> Result<u64, AppError> {
        let conn = self.pool.get()?;
        let n = conn.execute(
            "DELETE FROM note WHERE is_trashed=1 AND trashed_at < ?1",
            rusqlite::params![ts],
        )?;
        Ok(n as u64)
    }
}
