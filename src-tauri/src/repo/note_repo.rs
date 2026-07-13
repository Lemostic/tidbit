use crate::domain::{EdgeDock, Note};
use crate::error::AppError;
use crate::infra::db::Pool;

/// Repository for Note CRUD operations.
pub struct NoteRepo {
    pool: Pool,
}

impl NoteRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    fn row_to_note(r: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
        let edge_str: Option<String> = r.get(15)?;
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
            is_content_hidden: r.get::<_, i64>(7)? != 0,
            is_archived: r.get::<_, i64>(8)? != 0,
            is_trashed: r.get::<_, i64>(9)? != 0,
            trashed_at: r.get(10)?,
            geom_x: r.get(11)?,
            geom_y: r.get(12)?,
            geom_w: r.get(13)?,
            geom_h: r.get(14)?,
            edge_dock: edge,
            created_at: r.get(16)?,
            updated_at: r.get(17)?,
            color: r.get(18)?,
            sort_order: r.get(19)?,
        })
    }

    const SELECT: &'static str =
        "SELECT id, group_id, title, content_md, content_html, word_count, \
        is_pinned, is_content_hidden, is_archived, is_trashed, trashed_at, geom_x, geom_y, geom_w, geom_h, edge_dock, \
        created_at, updated_at, color, sort_order FROM note";

    pub fn create_in_group(&self, group_id: Option<i64>, title: &str) -> Result<Note, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        let first_order: i64 = conn.query_row(
            "SELECT COALESCE(MIN(sort_order), 0) - 1000 FROM note WHERE group_id IS ?1",
            rusqlite::params![group_id],
            |row| row.get(0),
        )?;
        conn.execute(
            "INSERT INTO note(group_id, title, created_at, updated_at, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![group_id, title, now, now, first_order],
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

    pub fn list_by_group(
        &self,
        group_id: Option<i64>,
        include_archived: bool,
    ) -> Result<Vec<Note>, AppError> {
        let conn = self.pool.get()?;
        let archived_filter = if include_archived {
            ""
        } else {
            " AND is_archived = 0"
        };
        let sql = match group_id {
            Some(_) => format!(
                "{s} WHERE group_id = ?1 AND is_trashed = 0{archived_filter} ORDER BY is_archived ASC, sort_order ASC, updated_at DESC, id ASC",
                s = Self::SELECT,
            ),
            None => format!(
                "{s} WHERE is_trashed = 0{archived_filter} ORDER BY is_archived ASC, sort_order ASC, updated_at DESC, id ASC",
                s = Self::SELECT,
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
        let existing = self.get(id)?;
        if existing.content_md == md
            && existing.content_html == html
            && existing.word_count == words
        {
            return Ok(existing);
        }
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

    pub fn update_title(&self, id: i64, title: &str) -> Result<Note, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET title=?1, updated_at=?2 WHERE id=?3",
            rusqlite::params![title, now, id],
        )?;
        self.get(id)
    }

    pub fn set_pinned(&self, id: i64, pinned: bool) -> Result<Note, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET is_pinned=?1, updated_at=?2 WHERE id=?3",
            rusqlite::params![pinned as i64, now, id],
        )?;
        self.get(id)
    }

    pub fn set_archived(&self, id: i64, archived: bool) -> Result<Note, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET is_archived=?1, is_pinned=CASE WHEN ?1=1 THEN 0 ELSE is_pinned END, updated_at=?2 WHERE id=?3",
            rusqlite::params![archived as i64, now, id],
        )?;
        self.get(id)
    }

    pub fn set_content_hidden(&self, id: i64, hidden: bool) -> Result<Note, AppError> {
        let existing = self.get(id)?;
        if existing.is_content_hidden == hidden {
            return Ok(existing);
        }
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET is_content_hidden=?1 WHERE id=?2",
            rusqlite::params![hidden as i64, id],
        )?;
        self.get(id)
    }

    pub fn set_color(&self, id: i64, color: Option<&str>) -> Result<Note, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE note SET color=?1, updated_at=?2 WHERE id=?3",
            rusqlite::params![color, now, id],
        )?;
        self.get(id)
    }

    pub fn move_to_group(&self, id: i64, group_id: Option<i64>) -> Result<Note, AppError> {
        let existing = self.get(id)?;
        if existing.group_id == group_id {
            return Ok(existing);
        }
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        let last_order: i64 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1000 FROM note WHERE group_id IS ?1 AND is_trashed=0",
            rusqlite::params![group_id],
            |row| row.get(0),
        )?;
        conn.execute(
            "UPDATE note SET group_id=?1, sort_order=?2, updated_at=?3 WHERE id=?4",
            rusqlite::params![group_id, last_order, now, id],
        )?;
        self.get(id)
    }

    pub fn reorder(&self, ids: &[i64]) -> Result<(), AppError> {
        let mut conn = self.pool.get()?;
        let tx = conn.transaction()?;
        for (index, id) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE note SET sort_order=?1 WHERE id=?2",
                rusqlite::params![(index as i64) * 1000, id],
            )?;
        }
        tx.commit()?;
        Ok(())
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
