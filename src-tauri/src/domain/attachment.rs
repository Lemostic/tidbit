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

pub fn attachment_protocol_url(note_id: i64, stored_name: &str) -> String {
    format!("http://tidbit-img.localhost/{note_id}/{stored_name}")
}
