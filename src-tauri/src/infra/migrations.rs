use crate::error::AppError;
use crate::infra::db::Pool;
use rusqlite::params;

const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_init", include_str!("../../migrations/0001_init.sql")),
    (
        "0002_note_fts",
        include_str!("../../migrations/0002_note_fts.sql"),
    ),
    (
        "0003_fts_triggers",
        include_str!("../../migrations/0003_fts_triggers.sql"),
    ),
    (
        "0004_note_color",
        include_str!("../../migrations/0004_note_color.sql"),
    ),
    (
        "0005_note_content_hidden",
        include_str!("../../migrations/0005_note_content_hidden.sql"),
    ),
    (
        "0006_group_background_color",
        include_str!("../../migrations/0006_group_background_color.sql"),
    ),
    (
        "0007_note_sort_order",
        include_str!("../../migrations/0007_note_sort_order.sql"),
    ),
    ("0008_tags", include_str!("../../migrations/0008_tags.sql")),
    (
        "0009_note_attachment",
        include_str!("../../migrations/0009_note_attachment.sql"),
    ),
    (
        "0010_note_reminder",
        include_str!("../../migrations/0010_note_reminder.sql"),
    ),
];

/// Rewrites legacy `data:image/...;base64,...` URLs stored in note content
/// and attachment metadata to the disk-backed `tidbit-img://` protocol.
///
/// This runs after SQL migrations so notes created by the 0.2.0 release can
/// keep rendering without carrying multi-megabyte base64 payloads in every
/// save.
pub fn migrate_attachment_protocol_urls(pool: &Pool) -> Result<(), AppError> {
    struct Legacy {
        note_id: i64,
        stored_name: String,
        old_url: String,
    }
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT note_id, stored_name, url FROM note_attachment WHERE url LIKE 'data:image/%'",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Legacy {
                note_id: row.get(0)?,
                stored_name: row.get(1)?,
                old_url: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<Legacy>, _>>()?;
    for legacy in rows {
        let protocol_url = format!("tidbit-img://{}/{}", legacy.note_id, legacy.stored_name);
        let mut update = conn.prepare(
            "UPDATE note SET content_md = replace(content_md, ?1, ?2),
             content_html = replace(content_html, ?1, ?2) WHERE id = ?3",
        )?;
        update.execute(params![legacy.old_url, protocol_url, legacy.note_id])?;
        conn.execute(
            "UPDATE note_attachment SET url = ?1 WHERE note_id = ?2 AND stored_name = ?3",
            params![protocol_url, legacy.note_id, legacy.stored_name],
        )?;
    }
    Ok(())
}

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
