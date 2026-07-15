use crate::autostart;
use crate::data_directory::{self, DataDirectoryInfo};
use crate::error::AppError;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn data_directory_get(app: tauri::AppHandle) -> Result<DataDirectoryInfo, AppError> {
    let default_dir = app.path().app_data_dir()?;
    Ok(data_directory::info(&default_dir))
}

#[tauri::command]
pub async fn data_directory_pick() -> Result<Option<String>, AppError> {
    #[cfg(target_os = "windows")]
    {
        let output = tokio::task::spawn_blocking(|| {
            std::process::Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-STA",
                    "-Command",
                    "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='选择 tidbit 数据目录'; if($d.ShowDialog() -eq 'OK'){[Console]::OutputEncoding=[Text.Encoding]::UTF8; Write-Output $d.SelectedPath}",
                ])
                .output()
        })
        .await
        .map_err(|error| AppError::Migration(error.to_string()))??;
        if !output.status.success() {
            return Ok(None);
        }
        let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok((!selected.is_empty()).then_some(selected));
    }
    #[cfg(not(target_os = "windows"))]
    Ok(None)
}

#[tauri::command]
pub fn data_directory_set(app: tauri::AppHandle, path: String) -> Result<(), AppError> {
    let default_dir = app.path().app_data_dir()?;
    data_directory::request_change(&default_dir, PathBuf::from(path.trim()))?;
    app.restart();
}

#[tauri::command]
pub fn autostart_get() -> Result<bool, AppError> {
    autostart::is_enabled()
}

#[tauri::command]
pub fn autostart_set(enabled: bool) -> Result<(), AppError> {
    autostart::set_enabled(enabled)
}
