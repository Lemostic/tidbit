use tempfile::tempdir;
use tidbit_lib::data_directory::{info, request_change, resolve};

#[test]
fn pending_directory_is_migrated_and_activated_on_next_start() {
    let root = tempdir().unwrap();
    let default = root.path().join("tidbit");
    let custom = root.path().join("custom-data");
    std::fs::create_dir_all(default.join("backups")).unwrap();
    std::fs::write(default.join("tidbit.db"), b"database").unwrap();
    std::fs::write(default.join("backups").join("one.tidbit.bak"), b"backup").unwrap();

    request_change(&default, custom.clone()).unwrap();
    assert_eq!(
        info(&default).pending_dir.as_deref(),
        Some(custom.to_string_lossy().as_ref())
    );

    assert_eq!(resolve(&default).unwrap(), custom);
    assert_eq!(
        std::fs::read(custom.join("tidbit.db")).unwrap(),
        b"database"
    );
    assert!(custom.join("backups").join("one.tidbit.bak").exists());
    assert!(info(&default).pending_dir.is_none());
}

#[test]
fn legacy_identifier_directory_is_imported_once() {
    let root = tempdir().unwrap();
    let default = root.path().join("tidbit");
    let legacy = root.path().join("dev.tidbit.app");
    std::fs::create_dir_all(&legacy).unwrap();
    std::fs::write(legacy.join("tidbit.db"), b"legacy").unwrap();

    assert_eq!(resolve(&default).unwrap(), default);
    assert_eq!(std::fs::read(default.join("tidbit.db")).unwrap(), b"legacy");
}
