use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Revision {
    pub id: i64,
    pub note_id: i64,
    pub content_md: String,
    pub title: Option<String>,
    pub created_at: i64,
}
