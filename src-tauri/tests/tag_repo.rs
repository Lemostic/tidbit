mod common;

use tidbit_lib::repo::note_repo::NoteRepo;
use tidbit_lib::repo::tag_repo::TagRepo;

#[test]
fn set_and_list_tags_for_note() {
    let pool = common::pool();
    pool.get().unwrap().execute_batch(
        "CREATE TABLE tag (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at INTEGER NOT NULL);
         CREATE TABLE note_tag (note_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(note_id, tag_id));"
    ).unwrap();
    let note = NoteRepo::new(pool.clone())
        .create_in_group(None, "Tagged")
        .unwrap();
    let repo = TagRepo::new(pool);
    repo.set_for_note(note.id, &["Work".into(), "urgent".into(), "Work".into()])
        .unwrap();
    assert_eq!(repo.tags_for_note(note.id).unwrap(), vec!["urgent", "Work"]);
    assert_eq!(
        repo.list().unwrap(),
        vec!["urgent".to_string(), "Work".to_string()]
    );
}
