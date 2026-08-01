use crate::domain::Attachment;
use crate::error::AppError;
use crate::infra::db::Pool;

pub struct AttachmentRepo {
    pool: Pool,
}
impl AttachmentRepo {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
    pub fn create(
        &self,
        note_id: i64,
        file_name: &str,
        mime: &str,
        size: i64,
        stored_name: &str,
        url: &str,
    ) -> Result<Attachment, AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.pool.get()?;
        conn.execute("INSERT INTO note_attachment(note_id,file_name,mime,size,stored_name,url,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)", rusqlite::params![note_id,file_name,mime,size,stored_name,url,now])?;
        Ok(Attachment {
            id: conn.last_insert_rowid(),
            note_id,
            file_name: file_name.into(),
            mime: mime.into(),
            size,
            stored_name: stored_name.into(),
            created_at: now,
            url: url.into(),
        })
    }
}
