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
const MIN_INTERVAL_HOURS: f64 = 0.5;
const MAX_INTERVAL_HOURS: f64 = 24.0;
const MIN_RETENTION: u32 = 1;
const MAX_RETENTION: u32 = 100;

/// Auto-backup configuration, persisted as `backup-settings.json` in the
/// data directory. Files written before the `enabled` field existed (0.1.x)
/// deserialize with `enabled = true`, matching the shipped default.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupSettings {
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(default = "default_interval_hours", alias = "interval_hours")]
    pub interval_hours: f64,
    #[serde(default = "default_retention_count", alias = "retention_count")]
    pub retention_count: u32,
}

fn default_enabled() -> bool {
    true
}

fn default_interval_hours() -> f64 {
    1.0
}

fn default_retention_count() -> u32 {
    20
}

impl Default for BackupSettings {
    fn default() -> Self {
        Self {
            enabled: default_enabled(),
            interval_hours: default_interval_hours(),
            retention_count: default_retention_count(),
        }
    }
}

impl BackupSettings {
    pub fn normalized(self) -> Self {
        let interval = (self
            .interval_hours
            .clamp(MIN_INTERVAL_HOURS, MAX_INTERVAL_HOURS)
            * 2.0)
            .round()
            / 2.0;
        Self {
            enabled: self.enabled,
            interval_hours: interval,
            retention_count: self.retention_count.clamp(MIN_RETENTION, MAX_RETENTION),
        }
    }
}

/// Hands updated settings to the running scheduler loop; the loop restarts
/// its timer whenever the watch channel reports a change.
pub struct BackupScheduler {
    tx: watch::Sender<BackupSettings>,
}

impl BackupScheduler {
    pub fn update(&self, settings: BackupSettings) -> BackupSettings {
        let normalized = settings.normalized();
        let _ = self.tx.send(normalized);
        normalized
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

pub fn save_settings(
    data_dir: &Path,
    settings: BackupSettings,
) -> Result<BackupSettings, AppError> {
    let settings = settings.normalized();
    let bytes = serde_json::to_vec_pretty(&settings)
        .map_err(|error| AppError::Migration(error.to_string()))?;
    fs::write(settings_path(data_dir), bytes)?;
    Ok(settings)
}

pub fn create_auto_snapshot(
    data_dir: &Path,
    key: &[u8; 32],
    retention_count: u32,
) -> Result<PathBuf, AppError> {
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

/// Removes the oldest auto snapshots beyond the retention limit. Files
/// without the `auto_` prefix (manual backups) are never touched.
pub fn prune_auto_snapshots(backup_dir: &Path, retention_count: u32) -> Result<(), AppError> {
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
    let limit = retention_count.clamp(MIN_RETENTION, MAX_RETENTION) as usize;
    for path in files.into_iter().skip(limit) {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn run_snapshot(app: &AppHandle, settings: BackupSettings) {
    let key = app.state::<BackupKey>().0;
    let data_dir = app.state::<DataDirectory>().0.clone();
    let retention = settings.retention_count;
    tauri::async_runtime::spawn(async move {
        let result =
            tokio::task::spawn_blocking(move || create_auto_snapshot(&data_dir, &key, retention))
                .await;
        match result {
            Ok(Ok(path)) => tracing::info!("auto backup created: {}", path.display()),
            Ok(Err(error)) => tracing::warn!("auto backup failed: {error}"),
            Err(error) => tracing::warn!("auto backup task panicked: {error}"),
        }
    });
}

pub fn start(app: AppHandle) {
    let data_dir = app.state::<DataDirectory>().0.clone();
    let initial = load_settings(&data_dir);
    let (tx, mut rx) = watch::channel(initial);
    app.manage(BackupScheduler { tx });
    tauri::async_runtime::spawn(async move {
        // One snapshot per launch, before entering the interval loop.
        if initial.enabled {
            run_snapshot(&app, initial);
        }
        loop {
            let settings = *rx.borrow();
            if !settings.enabled {
                if rx.changed().await.is_err() {
                    break;
                }
                continue;
            }
            let duration = std::time::Duration::from_secs_f64(settings.interval_hours * 3600.0);
            tokio::select! {
                _ = tokio::time::sleep(duration) => {
                    run_snapshot(&app, settings);
                }
                changed = rx.changed() => {
                    if changed.is_err() { break; }
                }
            }
        }
    });
}
