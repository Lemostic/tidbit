use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const CONFIG_FILE: &str = "data-location.json";

#[derive(Debug, Default, Serialize, Deserialize)]
struct LocationConfig {
    active: Option<PathBuf>,
    pending: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DataDirectoryInfo {
    pub default_dir: String,
    pub active_dir: String,
    pub pending_dir: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DataDirectory(pub PathBuf);

fn config_path(default_dir: &Path) -> PathBuf {
    default_dir.join(CONFIG_FILE)
}

fn read_config(default_dir: &Path) -> LocationConfig {
    fs::read(config_path(default_dir))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

fn write_config(default_dir: &Path, config: &LocationConfig) -> Result<(), AppError> {
    fs::create_dir_all(default_dir)?;
    let bytes = serde_json::to_vec_pretty(config)
        .map_err(|error| AppError::Migration(error.to_string()))?;
    fs::write(config_path(default_dir), bytes)?;
    Ok(())
}

fn copy_file_if_present(source: &Path, target: &Path, name: &str) -> Result<(), AppError> {
    let source_file = source.join(name);
    if source_file.exists() {
        fs::copy(source_file, target.join(name))?;
    }
    Ok(())
}

fn copy_directory(source: &Path, target: &Path) -> Result<(), AppError> {
    if !source.exists() {
        return Ok(());
    }
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let destination = target.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_directory(&entry.path(), &destination)?;
        } else {
            fs::copy(entry.path(), destination)?;
        }
    }
    Ok(())
}

fn migrate_data(source: &Path, target: &Path) -> Result<(), AppError> {
    if source == target {
        return Ok(());
    }
    fs::create_dir_all(target)?;
    for name in [
        "tidbit.db",
        "tidbit.db-wal",
        "tidbit.db-shm",
        "restore.pending.db",
        "tidbit.before-restore.db",
    ] {
        copy_file_if_present(source, target, name)?;
    }
    copy_directory(&source.join("backups"), &target.join("backups"))?;
    Ok(())
}

pub fn resolve(default_dir: &Path) -> Result<PathBuf, AppError> {
    fs::create_dir_all(default_dir)?;

    let legacy = default_dir
        .parent()
        .map(|parent| parent.join("dev.tidbit.app"));
    if !default_dir.join("tidbit.db").exists()
        && legacy
            .as_ref()
            .is_some_and(|path| path.join("tidbit.db").exists())
    {
        migrate_data(legacy.as_ref().expect("legacy path checked"), default_dir)?;
    }

    let mut config = read_config(default_dir);
    let mut active = config
        .active
        .clone()
        .unwrap_or_else(|| default_dir.to_path_buf());
    if let Some(pending) = config.pending.take() {
        migrate_data(&active, &pending)?;
        active = pending;
        config.active = Some(active.clone());
        write_config(default_dir, &config)?;
    }
    fs::create_dir_all(active.join("backups"))?;
    Ok(active)
}

pub fn info(default_dir: &Path) -> DataDirectoryInfo {
    let config = read_config(default_dir);
    let active = config.active.unwrap_or_else(|| default_dir.to_path_buf());
    DataDirectoryInfo {
        default_dir: default_dir.to_string_lossy().into_owned(),
        active_dir: active.to_string_lossy().into_owned(),
        pending_dir: config
            .pending
            .map(|path| path.to_string_lossy().into_owned()),
    }
}

pub fn request_change(default_dir: &Path, requested: PathBuf) -> Result<(), AppError> {
    if requested.as_os_str().is_empty() {
        return Err(AppError::Migration("empty data directory".into()));
    }
    fs::create_dir_all(&requested)?;
    let probe = requested.join(".tidbit-write-test");
    fs::write(&probe, b"tidbit")?;
    fs::remove_file(probe)?;

    let mut config = read_config(default_dir);
    let active = config
        .active
        .clone()
        .unwrap_or_else(|| default_dir.to_path_buf());
    config.pending = (requested != active).then_some(requested);
    config.active = Some(active);
    write_config(default_dir, &config)
}
