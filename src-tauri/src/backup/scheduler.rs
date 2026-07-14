use crate::backup::snapshot::create_snapshot;
use crate::data_directory::DataDirectory;
use crate::error::AppError;
use crate::state::BackupKey;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tokio::sync::watch;

const SETTINGS_FILE: &str = "backup-settings.json";
const AUTO_PREFIX: &str = "auto_";
const BACKUP_SUFFIX: &str = ".tidbit.bak";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct BackupSettings {
    pub interval_hours: f64,
    pub retention_count: usize,
}

impl Default for BackupSettings {
    fn default() -> Self {
        Self {
            interval_hours: 1.0,
            retention_count: 1,
        }
    }
}

impl BackupSettings {
    pub fn normalized(self) -> Self {
        let interval = (self.interval_hours.clamp(0.5, 24.0) * 2.0).round() / 2.0;
        Self {
            interval_hours: interval,
            retention_count: self.retention_count.clamp(1, 10),
        }
    }
}

pub struct BackupScheduler {
    tx: watch::Sender<BackupSettings>,
}

impl BackupScheduler {
    pub fn update(&self, settings: BackupSettings) {
        let _ = self.tx.send(settings.normalized());
    }
}

pub fn settings_path(data_dir: &Path) -> PathBuf {
    data_dir.join(SETTINGS_FILE)
}

pub fn load_settings(data_dir: &Path) -> BackupSettings {
    fs::read_to_string(settings_path(data_dir))
        .ok()
        .and_then(|content| serde_json::from_str::<BackupSettings>(&content).ok())
        .unwrap_or_default()
        .normalized()
}

pub fn save_settings(data_dir: &Path, settings: BackupSettings) -> Result<BackupSettings, AppError> {
    let settings = settings.normalized();
    let bytes = serde_json::to_vec_pretty(&settings)
        .map_err(|error| AppError::Migration(error.to_string()))?;
    fs::write(settings_path(data_dir), bytes)?;
    Ok(settings)
}

pub fn create_auto_snapshot(data_dir: &Path, key: &[u8; 32], retention_count: usize) -> Result<PathBuf, AppError> {
    let backup_dir = data_dir.join("backups");
    fs::create_dir_all(&backup_dir)?;
    let db = data_dir.join("tidbit.db");
    let destination = backup_dir.join(format!(
        "{}{}{}",
        AUTO_PREFIX,
        chrono::Local::now().format("%Y-%m-%d_%H%M%S_%3f"),
        BACKUP_SUFFIX
    ));
    create_snapshot(&db, &destination, key)?;
    prune_auto_snapshots(&backup_dir, retention_count)?;
    Ok(destination)
}

pub fn prune_auto_snapshots(backup_dir: &Path, retention_count: usize) -> Result<(), AppError> {
    let mut files = fs::read_dir(backup_dir)?
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with(AUTO_PREFIX) && name.ends_with(BACKUP_SUFFIX))
        })
        .collect::<Vec<_>>();
    files.sort_by(|left, right| right.file_name().cmp(&left.file_name()));
    for path in files.into_iter().skip(retention_count.clamp(1, 10)) {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn start(app: AppHandle) {
    let data_dir = app.state::<DataDirectory>().0.clone();
    let initial = load_settings(&data_dir);
    let (tx, mut rx) = watch::channel(initial);
    app.manage(BackupScheduler { tx });
    tauri::async_runtime::spawn(async move {
        loop {
            let settings = *rx.borrow();
            let duration = std::time::Duration::from_secs_f64(settings.interval_hours * 3600.0);
            tokio::select! {
                _ = tokio::time::sleep(duration) => {
                    let key = app.state::<BackupKey>().0;
                    let data_dir = app.state::<DataDirectory>().0.clone();
                    let retention = settings.retention_count;
                    let _ = tokio::task::spawn_blocking(move || create_auto_snapshot(&data_dir, &key, retention)).await;
                }
                changed = rx.changed() => {
                    if changed.is_err() { break; }
                }
            }
        }
    });
}
