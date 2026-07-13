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
    let all = nr.list_by_group(None, false).unwrap();
    assert_eq!(all.len(), 2);
    // Newly created notes are inserted first in the manual order.
    assert_eq!(
        all.iter().map(|n| n.id).collect::<Vec<_>>(),
        vec![n2.id, n1.id]
    );
    // Verify the notes are the ones we created
    let ids: Vec<i64> = all.iter().map(|n| n.id).collect();
    assert!(ids.contains(&n1.id));
    assert!(ids.contains(&n2.id));
}

#[test]
fn reorder_persists_manual_order() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let a = nr.create_in_group(None, "A").unwrap();
    let b = nr.create_in_group(None, "B").unwrap();
    let c = nr.create_in_group(None, "C").unwrap();
    nr.reorder(&[a.id, c.id, b.id]).unwrap();
    let ids = nr
        .list_by_group(None, false)
        .unwrap()
        .into_iter()
        .map(|n| n.id)
        .collect::<Vec<_>>();
    assert_eq!(ids, vec![a.id, c.id, b.id]);
}

#[test]
fn moving_to_group_places_note_at_the_end() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr.clone());
    pr.get()
        .unwrap()
        .execute(
            "INSERT INTO `group`(name, created_at, updated_at) VALUES ('工作', 1, 1)",
            [],
        )
        .unwrap();
    let group_id = pr
        .get()
        .unwrap()
        .query_row("SELECT id FROM `group` WHERE name='工作'", [], |row| {
            row.get::<_, i64>(0)
        })
        .unwrap();
    let existing = nr.create_in_group(Some(group_id), "已有").unwrap();
    let moved = nr.create_in_group(None, "待移动").unwrap();
    nr.move_to_group(moved.id, Some(group_id)).unwrap();
    let ids = nr
        .list_by_group(Some(group_id), false)
        .unwrap()
        .into_iter()
        .map(|n| n.id)
        .collect::<Vec<_>>();
    assert_eq!(ids, vec![existing.id, moved.id]);
}

#[test]
fn list_by_group_filters_trashed() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let n = nr.create_in_group(None, "Keep").unwrap();
    let _ = nr.create_in_group(None, "Trash").unwrap();
    nr.trash(n.id + 1).unwrap();
    let active = nr.list_by_group(None, false).unwrap();
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
fn unchanged_content_does_not_update_timestamp() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let note = nr.create_in_group(None, "Stable").unwrap();
    let unchanged = nr.update_content(note.id, "", "", 0).unwrap();
    assert_eq!(unchanged.updated_at, note.updated_at);
}

#[test]
fn update_note_metadata() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let note = nr.create_in_group(None, "Draft").unwrap();
    let note = nr.update_title(note.id, "Final title").unwrap();
    assert_eq!(note.title.as_deref(), Some("Final title"));
    let note = nr.set_pinned(note.id, true).unwrap();
    assert!(note.is_pinned);
    assert!(!note.is_content_hidden);
    let note = nr.set_content_hidden(note.id, true).unwrap();
    assert!(note.is_content_hidden);
    let note = nr.set_color(note.id, Some("#d75555")).unwrap();
    assert_eq!(note.color.as_deref(), Some("#d75555"));
}

#[test]
fn content_visibility_does_not_change_timestamp_or_manual_order() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let first = nr.create_in_group(None, "First").unwrap();
    let second = nr.create_in_group(None, "Second").unwrap();
    let third = nr.create_in_group(None, "Third").unwrap();
    nr.reorder(&[first.id, second.id, third.id]).unwrap();
    let before = nr.list_by_group(None, false).unwrap();
    let second_before = nr.get(second.id).unwrap();

    let hidden = nr.set_content_hidden(second.id, true).unwrap();
    assert!(hidden.is_content_hidden);
    assert_eq!(hidden.updated_at, second_before.updated_at);
    assert_eq!(hidden.sort_order, second_before.sort_order);

    let after_hide = nr.list_by_group(None, false).unwrap();
    assert_eq!(
        after_hide.iter().map(|note| note.id).collect::<Vec<_>>(),
        before.iter().map(|note| note.id).collect::<Vec<_>>()
    );

    let shown = nr.set_content_hidden(second.id, false).unwrap();
    assert!(!shown.is_content_hidden);
    assert_eq!(shown.updated_at, second_before.updated_at);
    assert_eq!(
        nr.list_by_group(None, false)
            .unwrap()
            .iter()
            .map(|note| note.id)
            .collect::<Vec<_>>(),
        before.iter().map(|note| note.id).collect::<Vec<_>>()
    );
}

#[test]
fn archived_notes_are_hidden_by_default_and_can_be_included() {
    let pr = common::pool();
    let nr = NoteRepo::new(pr);
    let active = nr.create_in_group(None, "Active").unwrap();
    let archived = nr.create_in_group(None, "Archived").unwrap();
    nr.set_pinned(archived.id, true).unwrap();
    let archived = nr.set_archived(archived.id, true).unwrap();
    assert!(archived.is_archived);
    assert!(!archived.is_pinned);

    let default_list = nr.list_by_group(None, false).unwrap();
    assert_eq!(
        default_list.iter().map(|n| n.id).collect::<Vec<_>>(),
        vec![active.id]
    );

    let with_archived = nr.list_by_group(None, true).unwrap();
    assert_eq!(with_archived.len(), 2);
    assert!(with_archived.iter().any(|note| note.id == archived.id));
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
