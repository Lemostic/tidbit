use crate::domain::{DueReminder, RepeatRule, ReminderLite};
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
        let mut stmt = conn.prepare(
            "SELECT remind_at, notified, repeat_rule FROM note_reminder WHERE note_id=?1",
        )?;
        match stmt.query_row([note_id], |r| {
            Ok(ReminderLite {
                remind_at: r.get(0)?,
                notified: r.get::<_, i64>(1)? != 0,
                repeat_rule: r.get(2)?,
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
        repeat_rule: Option<&str>,
    ) -> Result<Option<ReminderLite>, AppError> {
        let conn = self.pool.get()?;
        if let Some(at) = remind_at {
            let now = chrono::Utc::now().timestamp_millis();
            conn.execute("INSERT INTO note_reminder(note_id,remind_at,notified,repeat_rule,created_at,updated_at) VALUES(?1,?2,0,?3,?4,?4) ON CONFLICT(note_id) DO UPDATE SET remind_at=excluded.remind_at,notified=0,repeat_rule=excluded.repeat_rule,updated_at=excluded.updated_at", rusqlite::params![note_id,at,repeat_rule,now])?;
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
    /// Mark a fired reminder as notified. If it carries a repeat rule, advance
    /// `remind_at` to the next occurrence and clear `notified` instead, so the
    /// same note keeps reminding on schedule.
    pub fn mark_notified(&self, note_id: i64) -> Result<(), AppError> {
        let conn = self.pool.get()?;
        let rule: Option<String> = conn.query_row(
            "SELECT repeat_rule FROM note_reminder WHERE note_id=?1",
            [note_id],
            |r| r.get(0),
        )?;
        if let Some(raw) = rule.and_then(|raw| RepeatRule::parse(&raw)) {
            let now = chrono::Utc::now().timestamp_millis();
            if let Some(next) = raw.next_after(now) {
                conn.execute(
                    "UPDATE note_reminder SET remind_at=?1, notified=0, updated_at=?2 WHERE note_id=?3",
                    rusqlite::params![next, now, note_id],
                )?;
                return Ok(());
            }
        }
        conn.execute(
            "UPDATE note_reminder SET notified=1 WHERE note_id=?1",
            [note_id],
        )?;
        Ok(())
    }
}
