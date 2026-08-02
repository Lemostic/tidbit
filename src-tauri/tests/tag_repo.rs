mod common;

use tidbit_lib::repo::note_repo::NoteRepo;
use tidbit_lib::repo::tag_repo::TagRepo;

fn setup(pool: &tidbit_lib::infra::db::Pool) {
    pool.get().unwrap().execute_batch(
        "CREATE TABLE tag (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at INTEGER NOT NULL);
         CREATE TABLE note_tag (note_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(note_id, tag_id));"
    ).unwrap();
}

#[test]
fn set_and_list_tags_for_note() {
    let pool = common::pool();
    setup(&pool);
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

#[test]
fn rename_repoints_every_note_and_drops_old_tag() {
    let pool = common::pool();
    setup(&pool);
    let repo = TagRepo::new(pool.clone());
    let n1 = NoteRepo::new(pool.clone()).create_in_group(None, "n1").unwrap();
    let n2 = NoteRepo::new(pool.clone()).create_in_group(None, "n2").unwrap();
    let n3 = NoteRepo::new(pool.clone()).create_in_group(None, "n3").unwrap();
    repo.set_for_note(n1.id, &["工作".into()]).unwrap();
    repo.set_for_note(n2.id, &["工作".into(), "其他".into()]).unwrap();
    repo.set_for_note(n3.id, &["其他".into()]).unwrap();

    let updated = repo.rename("工作", "工 作").unwrap();
    assert_eq!(updated, 2, "two notes should be repointed");

    assert_eq!(repo.tags_for_note(n1.id).unwrap(), vec!["工 作"]);
    assert_eq!(repo.tags_for_note(n2.id).unwrap(), vec!["其他", "工 作"]);
    assert_eq!(repo.tags_for_note(n3.id).unwrap(), vec!["其他"]);
    assert!(repo.list().unwrap().iter().any(|t| t == "工 作"));
    assert!(!repo.list().unwrap().iter().any(|t| t == "工作"));
}

#[test]
fn rename_dedupes_when_both_names_already_linked() {
    let pool = common::pool();
    setup(&pool);
    let repo = TagRepo::new(pool.clone());
    let note = NoteRepo::new(pool.clone()).create_in_group(None, "n").unwrap();
    repo.set_for_note(note.id, &["a".into(), "b".into()]).unwrap();
    // Both "a" and "b" already on the note — the UPDATE skips the row
    // (NOT EXISTS) and the orphan-delete step drops the remaining "a"
    // link, leaving exactly one "b".
    let updated = repo.rename("a", "b").unwrap();
    assert_eq!(updated, 0);
    assert_eq!(repo.tags_for_note(note.id).unwrap(), vec!["b"]);
}

#[test]
fn delete_removes_tag_from_every_note() {
    let pool = common::pool();
    setup(&pool);
    let repo = TagRepo::new(pool.clone());
    let n1 = NoteRepo::new(pool.clone()).create_in_group(None, "n1").unwrap();
    let n2 = NoteRepo::new(pool.clone()).create_in_group(None, "n2").unwrap();
    repo.set_for_note(n1.id, &["x".into()]).unwrap();
    repo.set_for_note(n2.id, &["x".into(), "y".into()]).unwrap();

    let removed = repo.delete("x").unwrap();
    assert_eq!(removed, 2);
    assert!(repo.tags_for_note(n1.id).unwrap().is_empty());
    assert_eq!(repo.tags_for_note(n2.id).unwrap(), vec!["y"]);
    assert!(!repo.list().unwrap().iter().any(|t| t == "x"));
}

#[test]
fn rename_empty_or_same_is_noop() {
    let pool = common::pool();
    setup(&pool);
    let repo = TagRepo::new(pool);
    assert_eq!(repo.rename("", "x").unwrap(), 0);
    assert_eq!(repo.rename("x", "  ").unwrap(), 0);
    assert_eq!(repo.rename("x", "x").unwrap(), 0);
}
