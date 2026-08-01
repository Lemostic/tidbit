use crate::autostart;
use crate::data_directory::{self, DataDirectoryInfo};
use crate::error::AppError;
use std::path::PathBuf;
use tauri::Manager;

fn clean_font_registry_name(value_name: &str) -> Option<String> {
    let mut name = value_name.trim().trim_start_matches('@').trim().to_string();
    const SUFFIXES: [&str; 6] = [
        " (truetype)",
        " (opentype)",
        " (type 1)",
        " (raster)",
        " (all res)",
        " (allres)",
    ];

    loop {
        let lower = name.to_ascii_lowercase();
        let Some(suffix) = SUFFIXES.iter().find(|suffix| lower.ends_with(**suffix)) else {
            break;
        };
        name.truncate(name.len() - suffix.len());
        name = name.trim().to_string();
    }

    (!name.is_empty()).then_some(name)
}

#[cfg(target_os = "windows")]
fn installed_fonts_from_registry() -> Vec<String> {
    use std::collections::BTreeMap;
    use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
    use winreg::RegKey;

    const FONT_KEY: &str = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts";
    let mut families = BTreeMap::<String, String>::new();

    for root in [
        RegKey::predef(HKEY_LOCAL_MACHINE),
        RegKey::predef(HKEY_CURRENT_USER),
    ] {
        let Ok(key) = root.open_subkey(FONT_KEY) else {
            continue;
        };
        for entry in key.enum_values().flatten() {
            let Some(label) = clean_font_registry_name(&entry.0) else {
                continue;
            };
            for family in label
                .split(" & ")
                .map(str::trim)
                .filter(|name| !name.is_empty())
            {
                families
                    .entry(family.to_lowercase())
                    .or_insert_with(|| family.to_string());
            }
        }
    }

    let mut fonts = families.into_values().collect::<Vec<_>>();
    fonts.sort_by_key(|name| name.to_lowercase());
    fonts
}

#[tauri::command]
pub fn system_fonts_list() -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        return installed_fonts_from_registry();
    }
    #[cfg(not(target_os = "windows"))]
    Vec::new()
}

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

#[cfg(test)]
mod tests {
    use super::clean_font_registry_name;

    #[test]
    fn cleans_windows_font_registry_suffixes_and_vertical_aliases() {
        assert_eq!(
            clean_font_registry_name("Segoe UI (TrueType)"),
            Some("Segoe UI".into())
        );
        assert_eq!(
            clean_font_registry_name(" @Microsoft YaHei UI (OpenType) "),
            Some("Microsoft YaHei UI".into())
        );
        assert_eq!(clean_font_registry_name("   "), None);
    }
}
