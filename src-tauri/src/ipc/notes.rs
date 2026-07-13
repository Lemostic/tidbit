use crate::domain::{EdgeDock, Note};
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn notes_list(
    state: State<'_, AppState>,
    group_id: Option<i64>,
    include_archived: Option<bool>,
) -> Result<Vec<Note>, AppError> {
    state
        .notes
        .list_by_group(group_id, include_archived.unwrap_or(false))
}

#[tauri::command]
pub async fn notes_get(state: State<'_, AppState>, id: i64) -> Result<Note, AppError> {
    state.notes.get(id)
}

#[tauri::command]
pub async fn notes_create(
    state: State<'_, AppState>,
    group_id: Option<i64>,
    title: String,
) -> Result<Note, AppError> {
    state.notes.create_in_group(group_id, &title)
}

#[tauri::command]
pub async fn notes_update_content(
    state: State<'_, AppState>,
    id: i64,
    md: String,
    html: String,
    words: i64,
) -> Result<Note, AppError> {
    let n = state.notes.update_content(id, &md, &html, words)?;
    let _ = state.revisions.append(id, &md, n.title.as_deref());
    let _ = state.revisions.prune(id, 20);
    Ok(n)
}

#[tauri::command]
pub async fn notes_update_title(
    state: State<'_, AppState>,
    id: i64,
    title: String,
) -> Result<Note, AppError> {
    state.notes.update_title(id, title.trim())
}

#[tauri::command]
pub async fn notes_set_pinned(
    state: State<'_, AppState>,
    id: i64,
    pinned: bool,
) -> Result<Note, AppError> {
    state.notes.set_pinned(id, pinned)
}

#[tauri::command]
pub async fn notes_set_archived(
    state: State<'_, AppState>,
    id: i64,
    archived: bool,
) -> Result<Note, AppError> {
    state.notes.set_archived(id, archived)
}

#[tauri::command]
pub async fn notes_set_content_hidden(
    state: State<'_, AppState>,
    id: i64,
    hidden: bool,
) -> Result<Note, AppError> {
    state.notes.set_content_hidden(id, hidden)
}

#[tauri::command]
pub async fn notes_set_color(
    state: State<'_, AppState>,
    id: i64,
    color: Option<String>,
) -> Result<Note, AppError> {
    state.notes.set_color(id, color.as_deref())
}

#[tauri::command]
pub async fn notes_move_group(
    state: State<'_, AppState>,
    id: i64,
    group_id: Option<i64>,
) -> Result<Note, AppError> {
    state.notes.move_to_group(id, group_id)
}

#[tauri::command]
pub async fn notes_reorder(state: State<'_, AppState>, ids: Vec<i64>) -> Result<(), AppError> {
    state.notes.reorder(&ids)
}

#[tauri::command]
pub async fn notes_set_geometry(
    state: State<'_, AppState>,
    id: i64,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
) -> Result<(), AppError> {
    state.notes.set_geometry(id, x, y, w, h)
}

#[tauri::command]
pub async fn notes_set_edge_dock(
    state: State<'_, AppState>,
    id: i64,
    edge: String,
) -> Result<(), AppError> {
    let e = match edge.as_str() {
        "left" => EdgeDock::Left,
        "right" => EdgeDock::Right,
        "top" => EdgeDock::Top,
        "bottom" => EdgeDock::Bottom,
        _ => EdgeDock::None,
    };
    state.notes.set_edge_dock(id, e)
}

#[tauri::command]
pub async fn notes_trash(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    state.notes.trash(id)
}

#[tauri::command]
pub async fn notes_restore(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    state.notes.restore(id)
}
