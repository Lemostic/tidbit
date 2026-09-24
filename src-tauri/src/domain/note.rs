use super::ReminderLite;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EdgeDock {
    Left,
    Right,
    Top,
    Bottom,
    None,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum KanbanStatus {
    Todo,
    Doing,
    Done,
}

impl KanbanStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            KanbanStatus::Todo => "todo",
            KanbanStatus::Doing => "doing",
            KanbanStatus::Done => "done",
        }
    }
    pub fn from_str(s: &str) -> Self {
        match s {
            "doing" => KanbanStatus::Doing,
            "done" => KanbanStatus::Done,
            _ => KanbanStatus::Todo,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Note {
    pub id: i64,
    pub group_id: Option<i64>,
    pub title: Option<String>,
    pub content_md: String,
    pub content_html: String,
    pub word_count: i64,
    pub is_pinned: bool,
    pub is_content_hidden: bool,
    pub is_archived: bool,
    pub is_trashed: bool,
    pub trashed_at: Option<i64>,
    pub geom_x: Option<i32>,
    pub geom_y: Option<i32>,
    pub geom_w: i32,
    pub geom_h: i32,
    pub edge_dock: EdgeDock,
    pub created_at: i64,
    pub updated_at: i64,
    pub color: Option<String>,
    pub sort_order: i64,
    #[serde(default = "default_kanban_status")]
    pub status: KanbanStatus,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub reminder: Option<ReminderLite>,
}


fn default_kanban_status() -> KanbanStatus { KanbanStatus::Todo }
