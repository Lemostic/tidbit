use crate::backup::snapshot::{create_snapshot, restore_snapshot};
use crate::error::AppError;
use crate::state::{AppState, BackupKey};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn backup_snapshot_now(
    app: AppHandle,
    _state: State<'_, AppState>,
    key: State<'_, BackupKey>,
) -> Result<String, AppError> {
    let dir = app.path().app_data_dir()?;
    let db = dir.join("tidbit.db");
    let dest = dir.join("backups").join(format!(
        "{}.tidbit.bak",
        chrono::Local::now().format("%Y-%m-%d_%H%M%S")
    ));
    create_snapshot(&db, &dest, &key.0)?;
    Ok(dest.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn backup_restore(
    app: AppHandle,
    _state: State<'_, AppState>,
    key: State<'_, BackupKey>,
    file: String,
) -> Result<String, AppError> {
    let dir = app.path().app_data_dir()?;
    let staging = dir.join("restore-staging");
    restore_snapshot(std::path::Path::new(&file), &staging, &key.0)?;
    Ok(staging.join("tidbit.db").to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn backup_list(app: AppHandle, _state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    let dir = app.path().app_data_dir()?.join("backups");
    let mut out = vec![];
    if let Ok(rd) = std::fs::read_dir(&dir) {
        for e in rd.flatten() {
            if e.file_name().to_string_lossy().ends_with(".tidbit.bak") {
                out.push(e.path().to_string_lossy().into_owned());
            }
        }
    }
    Ok(out)
}
