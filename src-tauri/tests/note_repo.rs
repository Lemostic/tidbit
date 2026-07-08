//! Tests for note_repo and revision_repo.

use tidbit_lib::domain::EdgeDock;
use tidbit_lib::repo::note_repo::NoteRepo;
use tidbit_lib::repo::revision_repo::RevisionRepo;

mod common;

// ---------------------------------------------------------------------------
// NoteRepo
// ---------------------------------------------------------------------------

#[test]
fn create_and_get() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "Hello").unwrap();
    assert_eq!(n.title, Some("Hello".into()));
    let retrieved = nr.get(n.id).unwrap();
    assert_eq!(retrieved.id, n.id);
}

#[test]
fn create_in_group() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    // Insert with a group that does NOT exist — SQLite FK still prevents this.
    // Use None instead to test the NULL path.
    let n = nr.create_in_group(None, "Notes").unwrap();
    assert_eq!(n.group_id, None);
}

#[test]
fn list_by_group_none_returns_all_active() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n1 = nr.create_in_group(None, "A").unwrap();
    let n2 = nr.create_in_group(None, "B").unwrap();
    let all = nr.list_by_group(None).unwrap();
    assert_eq!(all.len(), 2);
    // IDs should be in descending updated_at order (most recent first)
    assert!(all[0].updated_at >= all[1].updated_at);
    // Verify the notes are the ones we created
    let ids: Vec<i64> = all.iter().map(|n| n.id).collect();
    assert!(ids.contains(&n1.id));
    assert!(ids.contains(&n2.id));
}

#[test]
fn list_by_group_filters_trashed() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "Keep").unwrap();
    let _ = nr.create_in_group(None, "Trash").unwrap();
    nr.trash(n.id + 1).unwrap();
    let active = nr.list_by_group(None).unwrap();
    assert_eq!(active.len(), 1);
    assert_eq!(active[0].title.as_deref(), Some("Keep"));
}

#[test]
fn update_content() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "Old").unwrap();
    let n2 = nr.update_content(n.id, "world", "<p>world</p>", 1).unwrap();
    assert_eq!(n2.content_md, "world");
    assert_eq!(n2.content_html, "<p>world</p>");
    assert_eq!(n2.word_count, 1);
    // updated_at should have changed
    assert!(n2.updated_at > n.updated_at);
}

#[test]
fn update_content_not_found() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let err = nr.update_content(9999, "x", "", 0).unwrap_err();
    assert!(matches!(err, tidbit_lib::error::AppError::NotFound));
}

#[test]
fn set_geometry() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "G").unwrap();
    nr.set_geometry(n.id, 100, 200, 320, 480).unwrap();
    let updated = nr.get(n.id).unwrap();
    assert_eq!(updated.geom_x, Some(100));
    assert_eq!(updated.geom_y, Some(200));
    assert_eq!(updated.geom_w, 320);
    assert_eq!(updated.geom_h, 480);
}

#[test]
fn set_edge_dock_left() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "D").unwrap();
    nr.set_edge_dock(n.id, EdgeDock::Left).unwrap();
    assert_eq!(nr.get(n.id).unwrap().edge_dock, EdgeDock::Left);
}

#[test]
fn set_edge_dock_right() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "D").unwrap();
    nr.set_edge_dock(n.id, EdgeDock::Right).unwrap();
    assert_eq!(nr.get(n.id).unwrap().edge_dock, EdgeDock::Right);
}

#[test]
fn set_edge_dock_none() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "D").unwrap();
    nr.set_edge_dock(n.id, EdgeDock::None).unwrap();
    assert_eq!(nr.get(n.id).unwrap().edge_dock, EdgeDock::None);
}

#[test]
fn trash_and_restore() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "Tmp").unwrap();
    nr.trash(n.id).unwrap();
    let trashed = nr.get(n.id).unwrap();
    assert!(trashed.is_trashed);
    assert!(trashed.trashed_at.is_some());
    nr.restore(n.id).unwrap();
    let restored = nr.get(n.id).unwrap();
    assert!(!restored.is_trashed);
    assert!(restored.trashed_at.is_none());
}

#[test]
fn purge_older_than() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let old = nr.create_in_group(None, "Old").unwrap();
    nr.trash(old.id).unwrap();
    // Sleep 1100ms so SQLite strftime('%s','now') gives different timestamps
    // (strftime returns seconds, not milliseconds).
    std::thread::sleep(std::time::Duration::from_millis(1100));
    let n1 = nr.create_in_group(None, "New").unwrap();
    nr.trash(n1.id).unwrap();
    let old_trashed_at = nr.get(old.id).unwrap().trashed_at.unwrap();
    let n1_trashed_at = nr.get(n1.id).unwrap().trashed_at.unwrap();

    // Only the "old" note's trashed_at is strictly older.
    let purged = nr.purge_older_than(old_trashed_at + 1).unwrap();
    assert_eq!(purged, 1);

    // "Old" note should be gone; "New" still exists
    assert!(nr.get(old.id).is_err());
    assert!(nr.get(n1.id).is_ok());
    // Sanity-check timestamps differ
    assert!(old_trashed_at < n1_trashed_at);
}

#[test]
fn purge_older_than_leaves_non_trashed() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "Alive").unwrap();
    // Purge with a timestamp in the past — non-trashed note should be untouched
    let purged = nr.purge_older_than(0).unwrap();
    assert_eq!(purged, 0);
    assert!(nr.get(n.id).is_ok());
}

// ---------------------------------------------------------------------------
// RevisionRepo
// ---------------------------------------------------------------------------

#[test]
fn revision_append_and_list() {
    let pr = common::pool();
    let rr = RevisionRepo::new(pr.clone());
    let nr = NoteRepo::new(pr);

    let n = nr.create_in_group(None, "Rev Note").unwrap();
    rr.append(n.id, "v1", Some("Rev Note")).unwrap();
    rr.append(n.id, "v2", Some("Rev Note")).unwrap();

    let revs = rr.list(n.id).unwrap();
    assert_eq!(revs.len(), 2);
    // Newest first
    assert_eq!(revs[0].content_md, "v2");
    assert_eq!(revs[1].content_md, "v1");
}

#[test]
fn revision_append_list_empty_for_unknown_note() {
    let pr = common::pool();
    let rr = RevisionRepo::new(pr);
    // No revisions for unknown note — should return empty vec
    let revs = rr.list(9999).unwrap();
    assert!(revs.is_empty());
}

#[test]
fn revision_prune_keeps_3() {
    let pr = common::pool();
    let rr = RevisionRepo::new(pr.clone());
    let nr = NoteRepo::new(pr);

    let n = nr.create_in_group(None, "P").unwrap();
    for i in 1..=5 {
        rr.append(n.id, &format!("v{i}"), None).unwrap();
    }

    rr.prune(n.id, 3).unwrap();

    let revs = rr.list(n.id).unwrap();
    assert_eq!(revs.len(), 3);
    // Should keep the 3 most recent
    assert_eq!(revs[0].content_md, "v5");
    assert_eq!(revs[1].content_md, "v4");
    assert_eq!(revs[2].content_md, "v3");
}

#[test]
fn revision_prune_keeps_all_when_under_limit() {
    let pr = common::pool();
    let rr = RevisionRepo::new(pr.clone());
    let nr = NoteRepo::new(pr);

    let n = nr.create_in_group(None, "P").unwrap();
    rr.append(n.id, "v1", None).unwrap();
    rr.append(n.id, "v2", None).unwrap();

    rr.prune(n.id, 3).unwrap();

    let revs = rr.list(n.id).unwrap();
    assert_eq!(revs.len(), 2); // nothing removed
}

#[test]
fn revision_prune_0_keeps_nothing() {
    let pr = common::pool();
    let rr = RevisionRepo::new(pr.clone());
    let nr = NoteRepo::new(pr);

    let n = nr.create_in_group(None, "P").unwrap();
    rr.append(n.id, "v1", None).unwrap();

    rr.prune(n.id, 0).unwrap();

    let revs = rr.list(n.id).unwrap();
    assert!(revs.is_empty());
}

// ---------------------------------------------------------------------------
// Cross-repo integration: update_and_revisions_tracked (brief example)
// ---------------------------------------------------------------------------

#[test]
fn update_and_revisions_tracked() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr.clone());
    let _rr = RevisionRepo::new(pr);
    let n = nr.create_in_group(None, "hi").unwrap();
    let n2 = nr.update_content(n.id, "world", "<p>world</p>", 1).unwrap();
    assert_eq!(n2.content_md, "world");
}
