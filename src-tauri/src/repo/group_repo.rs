use crate::domain::Group;
use crate::error::AppError;
use crate::infra::db::Pool;
use chrono::Utc;
use rusqlite::OptionalExtension;

pub const GROUP_COLOR_PALETTE: [&str; 8] = [
    "#EA4D64", "#F47A2A", "#E6AE16", "#18A66A", "#0E9FA0", "#3478D4", "#6C63D9", "#D94C8A",
];

fn random_group_color(previous: Option<&str>) -> &'static str {
    let candidates = GROUP_COLOR_PALETTE
        .iter()
        .copied()
        .filter(|color| Some(*color) != previous)
        .collect::<Vec<_>>();
    candidates[rand::random::<u64>() as usize % candidates.len()]
}

pub struct GroupRepo {
    pool: Pool,
}

impl GroupRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    pub fn list(&self) -> Result<Vec<Group>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT id,name,color,background_color,icon,sort_order,pinned,collapsed,created_at,updated_at FROM `group` ORDER BY pinned DESC, sort_order ASC, id ASC"
        )?;
        let rows = stmt
            .query_map([], |r| {
                Ok(Group {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    color: r.get(2)?,
                    background_color: r.get(3)?,
                    icon: r.get(4)?,
                    sort_order: r.get(5)?,
                    pinned: r.get::<_, i64>(6)? != 0,
                    collapsed: r.get::<_, i64>(7)? != 0,
                    created_at: r.get(8)?,
                    updated_at: r.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn create(&self, name: &str) -> Result<Group, AppError> {
        let now = Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        let previous_color = conn
            .query_row(
                "SELECT COALESCE(background_color, color) FROM `group` ORDER BY id DESC LIMIT 1",
                [],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()?
            .flatten();
        let default_color = random_group_color(previous_color.as_deref());
        conn.execute(
            "INSERT INTO `group`(name, color, background_color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![name, default_color, default_color, now, now],
        )?;
        let id = conn.last_insert_rowid();
        Ok(Group {
            id,
            name: name.into(),
            color: Some(default_color.into()),
            background_color: Some(default_color.into()),
            icon: None,
            sort_order: 0,
            pinned: false,
            collapsed: false,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn update(
        &self,
        id: i64,
        name: &str,
        color: Option<&str>,
        background_color: Option<&str>,
    ) -> Result<Group, AppError> {
        let now = Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute(
            "UPDATE `group` SET name=?1, color=?2, background_color=?3, updated_at=?4 WHERE id=?5",
            rusqlite::params![name, color, background_color, now, id],
        )?;
        conn.query_row(
            "SELECT id,name,color,background_color,icon,sort_order,pinned,collapsed,created_at,updated_at FROM `group` WHERE id=?1",
            [id],
            |r| {
                Ok(Group {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    color: r.get(2)?,
                    background_color: r.get(3)?,
                    icon: r.get(4)?,
                    sort_order: r.get(5)?,
                    pinned: r.get::<_, i64>(6)? != 0,
                    collapsed: r.get::<_, i64>(7)? != 0,
                    created_at: r.get(8)?,
                    updated_at: r.get(9)?,
                })
            },
        ).map_err(AppError::Db)
    }

    /// Delete a group. Notes in the group are detached (group_id → NULL) rather
    /// than deleted, so their content is preserved under "全部便签". Runs in a
    /// transaction because PRAGMA foreign_keys is not enabled on the pool, so the
    /// schema's ON DELETE SET NULL does not fire automatically.
    pub fn delete(&self, id: i64) -> Result<(), AppError> {
        let mut conn = self.pool.get()?;
        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE note SET group_id = NULL WHERE group_id = ?1",
            rusqlite::params![id],
        )?;
        tx.execute("DELETE FROM `group` WHERE id = ?1", rusqlite::params![id])?;
        tx.commit()?;
        Ok(())
    }
}
