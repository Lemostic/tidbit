use crate::domain::{EdgeDock, Note, Revision};
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

fn attach_tags(state: &AppState, mut note: Note) -> Result<Note, AppError> {
    note.tags = state.tags.tags_for_note(note.id)?;
    note.reminder = state.reminders.get(note.id)?;
    Ok(note)
}

#[tauri::command]
pub async fn reminders_set(
    state: State<'_, AppState>,
    id: i64,
    remind_at: Option<i64>,
    repeat_rule: Option<String>,
) -> Result<Note, AppError> {
    state.notes.get(id)?;
    state.reminders.set(id, remind_at, repeat_rule.as_deref())?;
    attach_tags(&state, state.notes.get(id)?)
}

#[tauri::command]
pub async fn notes_list(
    state: State<'_, AppState>,
    group_id: Option<i64>,
    include_archived: Option<bool>,
) -> Result<Vec<Note>, AppError> {
    state
        .notes
        .list_by_group(group_id, include_archived.unwrap_or(false))?
        .into_iter()
        .map(|note| attach_tags(&state, note))
        .collect()
}

#[tauri::command]
pub async fn notes_get(state: State<'_, AppState>, id: i64) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.get(id)?)
}

#[tauri::command]
pub async fn notes_create(
    state: State<'_, AppState>,
    group_id: Option<i64>,
    title: String,
) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.create_in_group(group_id, &title)?)
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
    attach_tags(&state, n)
}

#[tauri::command]
pub async fn notes_update_title(
    state: State<'_, AppState>,
    id: i64,
    title: String,
) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.update_title(id, title.trim())?)
}

#[tauri::command]
pub async fn notes_set_pinned(
    state: State<'_, AppState>,
    id: i64,
    pinned: bool,
) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.set_pinned(id, pinned)?)
}

#[tauri::command]
pub async fn notes_set_archived(
    state: State<'_, AppState>,
    id: i64,
    archived: bool,
) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.set_archived(id, archived)?)
}

#[tauri::command]
pub async fn notes_set_content_hidden(
    state: State<'_, AppState>,
    id: i64,
    hidden: bool,
) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.set_content_hidden(id, hidden)?)
}

#[tauri::command]
pub async fn notes_set_color(
    state: State<'_, AppState>,
    id: i64,
    color: Option<String>,
) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.set_color(id, color.as_deref())?)
}

#[tauri::command]
pub async fn notes_move_group(
    state: State<'_, AppState>,
    id: i64,
    group_id: Option<i64>,
) -> Result<Note, AppError> {
    attach_tags(&state, state.notes.move_to_group(id, group_id)?)
}

#[tauri::command]
pub async fn tags_list(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    state.tags.list()
}

#[tauri::command]
pub async fn tag_rename(state: State<'_, AppState>, old: String, new: String) -> Result<u64, AppError> {
    state.tags.rename(&old, &new)
}

#[tauri::command]
pub async fn tag_delete(state: State<'_, AppState>, name: String) -> Result<u64, AppError> {
    state.tags.delete(&name)
}

#[tauri::command]
pub async fn notes_set_tags(
    state: State<'_, AppState>,
    id: i64,
    tags: Vec<String>,
) -> Result<Note, AppError> {
    state.notes.get(id)?;
    state.tags.set_for_note(id, &tags)?;
    attach_tags(&state, state.notes.get(id)?)
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
#[tauri::command]
pub async fn notes_list_trashed(state: State<'_, AppState>) -> Result<Vec<Note>, AppError> {
    state
        .notes
        .list_trashed()?
        .into_iter()
        .map(|note| attach_tags(&state, note))
        .collect()
}

#[tauri::command]
pub async fn notes_delete(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    state.notes.delete(id)
}

#[tauri::command]
pub async fn notes_purge_trash(state: State<'_, AppState>) -> Result<u64, AppError> {
    state.notes.purge_all_trashed()
}

#[tauri::command]
pub async fn notes_revisions(state: State<'_, AppState>, id: i64) -> Result<Vec<Revision>, AppError> {
    state.revisions.list(id)
}

#[tauri::command]
pub async fn notes_restore_revision(
    state: State<'_, AppState>,
    id: i64,
    revision_id: i64,
) -> Result<Note, AppError> {
    state.revisions.restore(id, revision_id)?;
    attach_tags(&state, state.notes.get(id)?)
}