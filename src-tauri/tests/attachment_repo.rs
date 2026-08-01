mod common;
use tidbit_lib::repo::{attachment_repo::AttachmentRepo, note_repo::NoteRepo};

use tidbit_lib::infra::migrations::migrate_attachment_protocol_urls;

#[test]
fn creates_attachment_metadata_for_note() {
    let pool = common::pool();
    pool.get().unwrap().execute_batch("CREATE TABLE note_attachment(id INTEGER PRIMARY KEY,note_id INTEGER NOT NULL,file_name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,stored_name TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL);").unwrap();
    let note = NoteRepo::new(pool.clone())
        .create_in_group(None, "Image")
        .unwrap();
    let attachment = AttachmentRepo::new(pool)
        .create(
            note.id,
            "diagram.png",
            "image/png",
            128,
            "safe.png",
            &format!("tidbit-img://{}/safe.png", note.id),
        )
        .unwrap();
    assert_eq!(attachment.note_id, note.id);
    assert_eq!(attachment.size, 128);
    assert_eq!(attachment.url, format!("tidbit-img://{}/safe.png", note.id));
}

#[test]
fn migration_rewrites_legacy_data_urls_to_protocol_urls() {
    let pool = common::pool();
    pool.get()
        .unwrap()
        .execute_batch(
            "CREATE TABLE note_attachment(
               id INTEGER PRIMARY KEY,
               note_id INTEGER NOT NULL,
               file_name TEXT NOT NULL,
               mime TEXT NOT NULL,
               size INTEGER NOT NULL,
               stored_name TEXT NOT NULL UNIQUE,
               created_at INTEGER NOT NULL,
               url TEXT NOT NULL DEFAULT ''
             );",
        )
        .unwrap();
    let note = NoteRepo::new(pool.clone())
        .create_in_group(None, "Legacy image")
        .unwrap();
    let data_url = "data:image/png;base64,eA==";
    pool.get()
        .unwrap()
        .execute(
            "INSERT INTO note_attachment(note_id,file_name,mime,size,stored_name,created_at,url)
             VALUES(?1,'shot.png','image/png',4,'abc-123.png',0,?2)",
            rusqlite::params![note.id, data_url],
        )
        .unwrap();
    pool.get()
        .unwrap()
        .execute(
            "UPDATE note SET content_md=?1, content_html=?2 WHERE id=?3",
            rusqlite::params![
                format!("![截图]({data_url})"),
                format!("<p><img src=\"{data_url}\" alt=\"截图\"></p>"),
                note.id,
            ],
        )
        .unwrap();

    migrate_attachment_protocol_urls(&pool).unwrap();

    let updated = NoteRepo::new(pool.clone()).get(note.id).unwrap();
    let expected = format!("tidbit-img://{}/abc-123.png", note.id);
    assert_eq!(updated.content_md, format!("![截图]({expected})"));
    assert_eq!(
        updated.content_html,
        format!("<p><img src=\"{expected}\" alt=\"截图\"></p>")
    );
    let stored_url: String = pool
        .get()
        .unwrap()
        .query_row(
            "SELECT url FROM note_attachment WHERE note_id=?1",
            [note.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(stored_url, expected);
}
