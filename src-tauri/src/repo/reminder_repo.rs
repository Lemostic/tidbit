use crate::domain::{DueReminder, ReminderLite};
use crate::error::AppError;
use crate::infra::db::Pool;
pub struct ReminderRepo {
    pool: Pool,
}
impl ReminderRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
    pub fn get(&self, note_id: i64) -> Result<Option<ReminderLite>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt =
            conn.prepare("SELECT remind_at, notified FROM note_reminder WHERE note_id=?1")?;
        match stmt.query_row([note_id], |r| {
            Ok(ReminderLite {
                remind_at: r.get(0)?,
                notified: r.get::<_, i64>(1)? != 0,
            })
        }) {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    pub fn set(
        &self,
        note_id: i64,
        remind_at: Option<i64>,
    ) -> Result<Option<ReminderLite>, AppError> {
        let conn = self.pool.get()?;
        if let Some(at) = remind_at {
            let now = chrono::Utc::now().timestamp_millis();
            conn.execute("INSERT INTO note_reminder(note_id,remind_at,notified,created_at,updated_at) VALUES(?1,?2,0,?3,?3) ON CONFLICT(note_id) DO UPDATE SET remind_at=excluded.remind_at,notified=0,updated_at=excluded.updated_at", rusqlite::params![note_id,at,now])?;
        } else {
            conn.execute("DELETE FROM note_reminder WHERE note_id=?1", [note_id])?;
        }
        self.get(note_id)
    }
    pub fn due(&self, now: i64) -> Result<Vec<DueReminder>, AppError> {
        let conn = self.pool.get()?;
        let mut stmt=conn.prepare("SELECT note_id,remind_at FROM note_reminder WHERE notified=0 AND remind_at<=?1 ORDER BY remind_at")?;
        let rows = stmt
            .query_map([now], |r| {
                Ok(DueReminder {
                    note_id: r.get(0)?,
                    remind_at: r.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }
    pub fn mark_notified(&self, note_id: i64) -> Result<(), AppError> {
        self.pool.get()?.execute(
            "UPDATE note_reminder SET notified=1 WHERE note_id=?1",
            [note_id],
        )?;
        Ok(())
    }
}
