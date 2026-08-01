use crate::domain::Tag;
use crate::error::AppError;
use crate::infra::db::Pool;

pub struct TagRepo {
    pool: Pool,
}

impl TagRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
    pub fn list(&self) -> Result<Vec<String>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare("SELECT name FROM tag ORDER BY name COLLATE NOCASE ASC")?;
        let rows = stmt
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;
        Ok(rows)
    }
    pub fn list_detailed(&self) -> Result<Vec<Tag>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt =
            conn.prepare("SELECT id, name, created_at FROM tag ORDER BY name COLLATE NOCASE ASC")?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }
    pub fn tags_for_note(&self, note_id: i64) -> Result<Vec<String>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare("SELECT t.name FROM tag t JOIN note_tag nt ON nt.tag_id=t.id WHERE nt.note_id=?1 ORDER BY t.name COLLATE NOCASE ASC")?;
        let rows = stmt
            .query_map([note_id], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;
        Ok(rows)
    }
    pub fn set_for_note(&self, note_id: i64, names: &[String]) -> Result<Vec<String>, AppError> {
        let mut conn = self.pool.get()?;
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM note_tag WHERE note_id=?1", [note_id])?;
        let now = chrono::Utc::now().timestamp_millis();
        for raw in names {
            let name = raw.trim();
            if name.is_empty() {
                continue;
            }
            tx.execute(
                "INSERT INTO tag(name, created_at) VALUES (?1, ?2) ON CONFLICT(name) DO NOTHING",
                rusqlite::params![name, now],
            )?;
            tx.execute("INSERT OR IGNORE INTO note_tag(note_id, tag_id, created_at) SELECT ?1, id, ?2 FROM tag WHERE name=?3", rusqlite::params![note_id, now, name])?;
        }
        tx.commit()?;
        self.tags_for_note(note_id)
    }
}
