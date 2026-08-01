mod common;
use tidbit_lib::repo::{note_repo::NoteRepo, reminder_repo::ReminderRepo};
#[test]
fn schedules_fires_and_clears_a_reminder() {
    let pool = common::pool();
    pool.get().unwrap().execute_batch("CREATE TABLE note_reminder(note_id INTEGER PRIMARY KEY,remind_at INTEGER NOT NULL,notified INTEGER NOT NULL DEFAULT 0,repeat_rule TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);").unwrap();
    let note = NoteRepo::new(pool.clone())
        .create_in_group(None, "Reminder")
        .unwrap();
    let repo = ReminderRepo::new(pool);
    assert_eq!(
        repo.set(note.id, Some(200), None).unwrap().unwrap().remind_at,
        200
    );
    assert!(repo.due(199).unwrap().is_empty());
    assert_eq!(repo.due(200).unwrap()[0].note_id, note.id);
    repo.mark_notified(note.id).unwrap();
    assert!(repo.due(300).unwrap().is_empty());
    assert!(repo.set(note.id, None, None).unwrap().is_none());
}

#[test]
fn repeating_rule_advances_instead_of_notified() {
    let pool = common::pool();
    pool.get().unwrap().execute_batch("CREATE TABLE note_reminder(note_id INTEGER PRIMARY KEY,remind_at INTEGER NOT NULL,notified INTEGER NOT NULL DEFAULT 0,repeat_rule TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);").unwrap();
    let note = NoteRepo::new(pool.clone())
        .create_in_group(None, "Repeating")
        .unwrap();
    let repo = ReminderRepo::new(pool);
    let rule = r#"{"freq":"daily","interval":1}"#;
    repo.set(note.id, Some(200), Some(rule)).unwrap();

    // Fires at 200, then advances to the next day instead of notified=1.
    repo.mark_notified(note.id).unwrap();
    let next = repo.get(note.id).unwrap().unwrap();
    assert!(!next.notified, "repeat rule should stay armed");
    assert!(next.repeat_rule.is_some());
    assert!(next.remind_at > 200, "next remind_at should advance");

    // Non-repeating reminder still gets notified.
    repo.set(note.id, Some(200), None).unwrap();
    repo.mark_notified(note.id).unwrap();
    let fired = repo.get(note.id).unwrap().unwrap();
    assert!(fired.notified);
}
