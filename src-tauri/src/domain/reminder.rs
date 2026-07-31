use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReminderLite {
    pub remind_at: i64,
    pub notified: bool,
}
#[derive(Debug, Clone, PartialEq)]
pub struct DueReminder {
    pub note_id: i64,
    pub remind_at: i64,
}
