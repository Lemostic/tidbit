// Shared test helpers.
use r2d2_sqlite::SqliteConnectionManager;
use tempfile::tempdir;
use tidbit_lib::infra::db::Pool;

/// Build an in-memory Pool pre-seeded with all migrations (except FTS5).
/// The FTS trigger path requires unicode61 tokenizer which may not be available
/// in all rusqlite builds; for tests that only need core tables, this pool is
/// sufficient.
pub fn pool() -> Pool {
    let dir = tempdir().unwrap();
    let p = dir.path().join("t.db");
    let m = SqliteConnectionManager::file(p)
        .with_init(|c| c.execute_batch("PRAGMA key='x'; PRAGMA cipher_compatibility=4;"));
    let pool = Pool::builder().max_size(2).build(m).unwrap();

    let conn = pool.get().unwrap();
    // Run only the migrations needed for note/revision CRUD.
    // FTS5 triggers are not required for unit-test isolation.
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
         CREATE TABLE IF NOT EXISTS `group` (
           id            INTEGER PRIMARY KEY,
           name          TEXT NOT NULL,
           color         TEXT,
           background_color TEXT,
           icon          TEXT,
           sort_order    INTEGER NOT NULL DEFAULT 0,
           pinned        INTEGER NOT NULL DEFAULT 0,
           collapsed     INTEGER NOT NULL DEFAULT 0,
           created_at    INTEGER NOT NULL,
           updated_at    INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS note (
           id            INTEGER PRIMARY KEY,
           group_id      INTEGER REFERENCES `group`(id) ON DELETE SET NULL,
           title         TEXT,
           content_md    TEXT NOT NULL DEFAULT '',
           content_html  TEXT NOT NULL DEFAULT '',
           word_count    INTEGER NOT NULL DEFAULT 0,
           is_pinned     INTEGER NOT NULL DEFAULT 0,
           is_content_hidden INTEGER NOT NULL DEFAULT 0,
           is_archived   INTEGER NOT NULL DEFAULT 0,
           is_trashed    INTEGER NOT NULL DEFAULT 0,
           trashed_at    INTEGER,
           geom_x        INTEGER,
           geom_y        INTEGER,
           geom_w        INTEGER NOT NULL DEFAULT 280,
           geom_h        INTEGER NOT NULL DEFAULT 360,
           edge_dock     TEXT,
           created_at    INTEGER NOT NULL,
           updated_at    INTEGER NOT NULL,
           color         TEXT
           ,sort_order   INTEGER NOT NULL DEFAULT 0
         );
         CREATE INDEX IF NOT EXISTS idx_note_group ON note(group_id, updated_at DESC);
         CREATE INDEX IF NOT EXISTS idx_note_updated ON note(updated_at DESC) WHERE is_trashed = 0;
         CREATE TABLE IF NOT EXISTS note_revision (
           id            INTEGER PRIMARY KEY,
           note_id       INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
           content_md    TEXT NOT NULL,
           title         TEXT,
           created_at    INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_rev_note ON note_revision(note_id, created_at DESC);
         CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
         INSERT OR IGNORE INTO _migrations VALUES ('0001_init', 0);",
    )
    .unwrap();

    pool
}
