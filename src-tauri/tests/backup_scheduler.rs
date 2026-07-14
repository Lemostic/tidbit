use std::fs;
use tempfile::tempdir;
use tidbit_lib::backup::scheduler::{
    create_auto_snapshot, load_settings, prune_auto_snapshots, save_settings, BackupSettings,
};

#[test]
fn backup_settings_are_clamped_and_persisted() {
    let dir = tempdir().unwrap();
    let saved = save_settings(
        dir.path(),
        BackupSettings {
            interval_hours: 24.4,
            retention_count: 99,
        },
    )
    .unwrap();
    assert_eq!(saved.interval_hours, 24.0);
    assert_eq!(saved.retention_count, 10);
    assert_eq!(load_settings(dir.path()), saved);
}

#[test]
fn auto_backups_rotate_without_deleting_manual_backups() {
    let dir = tempdir().unwrap();
    let backups = dir.path().join("backups");
    fs::create_dir_all(&backups).unwrap();
    for index in 1..=4 {
        fs::write(
            backups.join(format!("auto_2026-01-01_00000{index}_000.tidbit.bak")),
            b"auto",
        )
        .unwrap();
    }
    fs::write(backups.join("2026-01-01_000000.tidbit.bak"), b"manual").unwrap();
    prune_auto_snapshots(&backups, 2).unwrap();
    let names = fs::read_dir(&backups)
        .unwrap()
        .flatten()
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    assert_eq!(names.iter().filter(|name| name.starts_with("auto_")).count(), 2);
    assert!(names.contains(&"2026-01-01_000000.tidbit.bak".to_string()));
}

#[test]
fn automatic_snapshot_is_created_in_background_format() {
    let dir = tempdir().unwrap();
    fs::write(dir.path().join("tidbit.db"), b"db").unwrap();
    let path = create_auto_snapshot(dir.path(), &[0u8; 32], 1).unwrap();
    assert!(path.exists());
    assert!(path.file_name().unwrap().to_string_lossy().starts_with("auto_"));
}
