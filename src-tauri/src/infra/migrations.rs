use crate::error::AppError;
use crate::infra::db::Pool;
use rusqlite::params;

const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_init", include_str!("../../migrations/0001_init.sql")),
    ("0002_note_fts", include_str!("../../migrations/0002_note_fts.sql")),
    ("0003_fts_triggers", include_str!("../../migrations/0003_fts_triggers.sql")),
    ("0004_note_color", include_str!("../../migrations/0004_note_color.sql")),
];

/// Run all pending migrations in order. Already-applied migrations are skipped.
pub fn run(pool: &Pool) -> Result<(), AppError> {
    let conn = pool.get()?;

    // Create the _migrations tracking table if it does not exist.
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);",
    )?;

    for (name, sql) in MIGRATIONS {
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM _migrations WHERE name = ?1)",
            params![name],
            |r| r.get(0),
        )?;
        if !exists {
            conn.execute_batch(sql)
                .map_err(|e| AppError::Migration(format!("{name}: {e}")))?;
            conn.execute(
                "INSERT INTO _migrations(name, applied_at) VALUES (?1, strftime('%s','now')*1000)",
                params![name],
            )?;
        }
    }
    Ok(())
}
