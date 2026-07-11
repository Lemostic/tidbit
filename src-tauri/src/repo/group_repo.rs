use crate::domain::Group;
use crate::error::AppError;
use crate::infra::db::Pool;
use chrono::Utc;

pub struct GroupRepo { pool: Pool }

impl GroupRepo {
    pub fn new(pool: Pool) -> Self { Self { pool } }

    pub fn list(&self) -> Result<Vec<Group>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT id,name,color,icon,sort_order,pinned,collapsed,created_at,updated_at FROM `group` ORDER BY pinned DESC, sort_order ASC, id ASC"
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(Group {
                id: r.get(0)?,
                name: r.get(1)?,
                color: r.get(2)?,
                icon: r.get(3)?,
                sort_order: r.get(4)?,
                pinned: r.get::<_, i64>(5)? != 0,
                collapsed: r.get::<_, i64>(6)? != 0,
                created_at: r.get(7)?,
                updated_at: r.get(8)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn create(&self, name: &str) -> Result<Group, AppError> {
        let now = Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute(
            "INSERT INTO `group`(name, created_at, updated_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![name, now, now],
        )?;
        let id = conn.last_insert_rowid();
        Ok(Group {
            id,
            name: name.into(),
            color: None,
            icon: None,
            sort_order: 0,
            pinned: false,
            collapsed: false,
            created_at: now,
            updated_at: now,
        })
    }

    /// Delete a group. Notes in the group are detached (group_id → NULL) rather
    /// than deleted, so their content is preserved under "全部便签". Runs in a
    /// transaction because PRAGMA foreign_keys is not enabled on the pool, so the
    /// schema's ON DELETE SET NULL does not fire automatically.
    pub fn delete(&self, id: i64) -> Result<(), AppError> {
        let mut conn = self.pool.get()?;
        let tx = conn.transaction()?;
        tx.execute("UPDATE note SET group_id = NULL WHERE group_id = ?1", rusqlite::params![id])?;
        tx.execute("DELETE FROM `group` WHERE id = ?1", rusqlite::params![id])?;
        tx.commit()?;
        Ok(())
    }
}
