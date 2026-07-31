use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Attachment {
    pub id: i64,
    pub note_id: i64,
    pub file_name: String,
    pub mime: String,
    pub size: i64,
    pub stored_name: String,
    pub created_at: i64,
    pub url: String,
}
