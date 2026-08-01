use crate::backup::snapshot::{create_snapshot, restore_snapshot};
use crate::data_directory::DataDirectory;
use crate::error::AppError;
use crate::state::{AppState, BackupKey};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn backup_snapshot_now(
    app: AppHandle,
    _state: State<'_, AppState>,
    key: State<'_, BackupKey>,
) -> Result<String, AppError> {
    let dir = &app.state::<DataDirectory>().0;
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
) -> Result<(), AppError> {
    let dir = &app.state::<DataDirectory>().0;
    let staging = dir.join("restore-staging");
    restore_snapshot(std::path::Path::new(&file), &staging, &key.0)?;
    std::fs::copy(staging.join("tidbit.db"), dir.join("restore.pending.db"))?;
    app.restart();
}

#[tauri::command]
pub async fn backup_list(
    app: AppHandle,
    _state: State<'_, AppState>,
) -> Result<Vec<String>, AppError> {
    let dir = app.state::<DataDirectory>().0.join("backups");
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

#[tauri::command]
pub async fn backup_open_dir(app: AppHandle) -> Result<(), AppError> {
    let dir = app.state::<DataDirectory>().0.join("backups");
    std::fs::create_dir_all(&dir)?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&dir).spawn()?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&dir).spawn()?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&dir).spawn()?;
    Ok(())
}
