use crate::domain::Group;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn groups_list(state: State<'_, AppState>) -> Result<Vec<Group>, AppError> {
    state.groups.list()
}

#[tauri::command]
pub async fn groups_create(state: State<'_, AppState>, name: String) -> Result<Group, AppError> {
    state.groups.create(&name)
}

#[tauri::command]
pub async fn groups_update(
    state: State<'_, AppState>,
    id: i64,
    name: String,
    color: Option<String>,
    background_color: Option<String>,
) -> Result<Group, AppError> {
    state.groups.update(
        id,
        name.trim(),
        color.as_deref(),
        background_color.as_deref(),
    )
}

#[tauri::command]
pub async fn groups_delete(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    state.groups.delete(id)
}
