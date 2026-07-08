use criterion::{criterion_group, criterion_main, Criterion};
use tempfile::tempdir;
use tidbit_lib::infra::db::open as db_open;
use tidbit_lib::repo::note_repo::NoteRepo;

fn bench_note_create(c: &mut Criterion) {
    // Use a temporary directory so each bench run gets a fresh DB.
    let tmp = tempdir().expect("tempdir");
    let db_path = tmp.path().join("bench.db");

    // Migrations need to run before we can insert.  We open with a known key
    // and then apply the init migration manually (the lib run() helper is not
    // exposed for bench use).
    let pool = db_open(&db_path, "benchkey").expect("db_open");

    // Apply the same DDL that migrations/0001_init.sql sets up so that
    // NoteRepo::create_in_group works without needing the full migration runner.
    {
        let conn = pool.get().expect("get conn");
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS note (
                id              INTEGER PRIMARY KEY,
                group_id        INTEGER REFERENCES note(id) ON DELETE SET NULL,
                title           TEXT,
                content_md      TEXT NOT NULL DEFAULT '',
                content_html    TEXT NOT NULL DEFAULT '',
                word_count      INTEGER NOT NULL DEFAULT 0,
                is_pinned       INTEGER NOT NULL DEFAULT 0,
                is_archived     INTEGER NOT NULL DEFAULT 0,
                is_trashed      INTEGER NOT NULL DEFAULT 0,
                trashed_at      INTEGER,
                geom_x          INTEGER,
                geom_y          INTEGER,
                geom_w          INTEGER NOT NULL DEFAULT 280,
                geom_h          INTEGER NOT NULL DEFAULT 360,
                edge_dock       TEXT,
                created_at      INTEGER NOT NULL,
                updated_at      INTEGER NOT NULL,
                color           TEXT
            );
            "#,
        )
        .expect("ddl");
    }

    let nr = NoteRepo::new(pool);

    c.bench_function("note.create", |b| {
        b.iter(|| {
            // Each iteration gets a fresh DB so we always measure insert latency
            // without index overhead accumulating across iterations.
            let _ = nr.create_in_group(None, "bench note");
        })
    });
}

criterion_group!(benches, bench_note_create);
criterion_main!(benches);
