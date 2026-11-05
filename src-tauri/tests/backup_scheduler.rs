use std::fs;
use tempfile::tempdir;
use tidbit_lib::backup::scheduler::{
    create_auto_snapshot, load_settings, prune_auto_snapshots, save_settings, BackupSettings,
};

#[test]
fn defaults_match_the_product_spec() {
    let settings = BackupSettings::default();
    assert!(settings.enabled);
    assert_eq!(settings.interval_hours, 1.0);
    assert_eq!(settings.retention_count, 20);
}

#[test]
fn legacy_settings_file_without_enabled_field_defaults_to_on() {
    let dir = tempdir().unwrap();
    fs::write(
        dir.path().join("backup-settings.json"),
        r#"{ "interval_hours": 2.0, "retention_count": 3 }"#,
    )
    .unwrap();
    let settings = load_settings(dir.path());
    assert!(settings.enabled);
    assert_eq!(settings.interval_hours, 2.0);
    assert_eq!(settings.retention_count, 3);
}

#[test]
fn settings_are_clamped_and_persisted() {
    let dir = tempdir().unwrap();
    let saved = save_settings(
        dir.path(),
        BackupSettings {
            enabled: false,
            interval_hours: 24.4,
            retention_count: 99,
        },
    )
    .unwrap();
    assert!(!saved.enabled);
    assert_eq!(saved.interval_hours, 24.0);
    assert_eq!(saved.retention_count, 99);
    assert_eq!(load_settings(dir.path()), saved);

    let over = save_settings(
        dir.path(),
        BackupSettings {
            enabled: true,
            interval_hours: 0.1,
            retention_count: 0,
        },
    )
    .unwrap();
    assert_eq!(over.interval_hours, 0.5);
    assert_eq!(over.retention_count, 1);
}

#[test]
fn auto_backups_rotate_without_deleting_manual_backups() {
    let dir = tempdir().unwrap();
    let backups = dir.path().join("backups");
    fs::create_dir_all(&backups).unwrap();
    for index in 1..=25 {
        fs::write(
            backups.join(format!("auto_2026-01-01_0000{index:02}_000.tidbit.bak")),
            b"auto",
        )
        .unwrap();
    }
    fs::write(backups.join("2026-01-01_000000.tidbit.bak"), b"manual").unwrap();
    prune_auto_snapshots(&backups, 20).unwrap();
    let names = fs::read_dir(&backups)
        .unwrap()
        .flatten()
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    assert_eq!(
        names
            .iter()
            .filter(|name| name.starts_with("auto_"))
            .count(),
        20
    );
    // The oldest auto snapshot is the one pruned first.
    assert!(!names.contains(&"auto_2026-01-01_000001_000.tidbit.bak".to_string()));
    assert!(names.contains(&"auto_2026-01-01_000025_000.tidbit.bak".to_string()));
    // Manual backups are outside the retention limit.
    assert!(names.contains(&"2026-01-01_000000.tidbit.bak".to_string()));
}

#[test]
fn automatic_snapshot_is_created_in_background_format() {
    let dir = tempdir().unwrap();
    fs::write(dir.path().join("tidbit.db"), b"db").unwrap();
    let path = create_auto_snapshot(dir.path(), &[0u8; 32], 20).unwrap();
    assert!(path.exists());
    assert!(path
        .file_name()
        .unwrap()
        .to_string_lossy()
        .starts_with("auto_"));
}
