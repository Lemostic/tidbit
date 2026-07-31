mod common;
use tidbit_lib::repo::{attachment_repo::AttachmentRepo, note_repo::NoteRepo};

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
            "data:image/png;base64,eA==",
        )
        .unwrap();
    assert_eq!(attachment.note_id, note.id);
    assert_eq!(attachment.size, 128);
}
