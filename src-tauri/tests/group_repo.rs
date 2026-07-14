use r2d2_sqlite::SqliteConnectionManager;
use tempfile::tempdir;
use tidbit_lib::infra::db::Pool;
use tidbit_lib::repo::group_repo::GroupRepo;
use tidbit_lib::repo::group_repo::GROUP_COLOR_PALETTE;

fn pool() -> Pool {
    let dir = tempdir().unwrap();
    let p = dir.path().join("g.db");
    let m = SqliteConnectionManager::file(p).with_init(|c| c.execute_batch("PRAGMA key='x';"));
    let pool = Pool::builder().max_size(2).build(m).unwrap();
    // Run only the migrations needed for group CRUD. Full migration suite (including FTS5
    // unicode61 tokenizer) may not be available in all rusqlite builds.
    let conn = pool.get().unwrap();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL); \
         CREATE TABLE IF NOT EXISTS `group` ( \
           id            INTEGER PRIMARY KEY, \
           name          TEXT NOT NULL, \
           color         TEXT, \
           background_color TEXT, \
           icon          TEXT, \
           sort_order    INTEGER NOT NULL DEFAULT 0, \
           pinned        INTEGER NOT NULL DEFAULT 0, \
           collapsed     INTEGER NOT NULL DEFAULT 0, \
           created_at    INTEGER NOT NULL, \
           updated_at    INTEGER NOT NULL \
         ); \
         INSERT OR IGNORE INTO _migrations VALUES ('0001_init', 0);"
    ).unwrap();
    pool
}

#[test]
fn create_list_round_trip() {
    let r = GroupRepo::new(pool());
    let g = r.create("Inbox").unwrap();
    assert_eq!(g.name, "Inbox");
    assert_eq!(g.color, g.background_color);
    let all = r.list().unwrap();
    assert_eq!(all.len(), 1);
}

#[test]
fn consecutive_groups_use_distinct_palette_colors() {
    let r = GroupRepo::new(pool());
    let mut previous = None;
    for index in 0..32 {
        let group = r.create(&format!("Group {index}")).unwrap();
        let color = group.background_color.as_deref().unwrap();
        assert!(GROUP_COLOR_PALETTE.contains(&color));
        assert_ne!(Some(color), previous.as_deref());
        previous = group.background_color;
    }
}

#[test]
fn update_name_and_color() {
    let r = GroupRepo::new(pool());
    let group = r.create("Inbox").unwrap();
    let updated = r
        .update(group.id, "Work", Some("#d75555"), Some("#4c9a73"))
        .unwrap();
    assert_eq!(updated.name, "Work");
    assert_eq!(updated.color.as_deref(), Some("#d75555"));
    assert_eq!(updated.background_color.as_deref(), Some("#4c9a73"));
}
