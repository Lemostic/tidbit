use tidbit_lib::domain::{Group, Note, Revision, EdgeDock};
use chrono::Utc;

#[test]
fn round_trip_group_serializes() {
    let g = Group {
        id: 1,
        name: "Inbox".into(),
        color: Some("#3aa".into()),
        icon: None,
        sort_order: 0,
        pinned: false,
        collapsed: false,
        created_at: Utc::now().timestamp_millis(),
        updated_at: Utc::now().timestamp_millis(),
    };
    let s = serde_json::to_string(&g).unwrap();
    let g2: Group = serde_json::from_str(&s).unwrap();
    assert_eq!(g.name, g2.name);
    assert_eq!(g.color, g2.color);
}

#[test]
fn round_trip_note_serializes() {
    let n = Note {
        id: 1,
        group_id: Some(1),
        title: Some("Test Note".into()),
        content_md: "Hello **world**".into(),
        content_html: "Hello <strong>world</strong>".into(),
        word_count: 2,
        is_pinned: false,
        is_archived: false,
        is_trashed: false,
        trashed_at: None,
        geom_x: Some(100),
        geom_y: Some(200),
        geom_w: 300,
        geom_h: 200,
        edge_dock: EdgeDock::None,
        created_at: Utc::now().timestamp_millis(),
        updated_at: Utc::now().timestamp_millis(),
        color: Some("#ff0000".into()),
    };
    let s = serde_json::to_string(&n).unwrap();
    let n2: Note = serde_json::from_str(&s).unwrap();
    assert_eq!(n.title, n2.title);
    assert_eq!(n.content_md, n2.content_md);
    assert_eq!(n.geom_w, n2.geom_w);
    assert_eq!(n.geom_h, n2.geom_h);
}

#[test]
fn round_trip_revision_serializes() {
    let r = Revision {
        id: 1,
        note_id: 42,
        content_md: "Old content".into(),
        title: Some("Old Title".into()),
        created_at: Utc::now().timestamp_millis(),
    };
    let s = serde_json::to_string(&r).unwrap();
    let r2: Revision = serde_json::from_str(&s).unwrap();
    assert_eq!(r.title, r2.title);
    assert_eq!(r.note_id, r2.note_id);
}

#[test]
fn edge_dock_lowercase_serde() {
    // Test lowercase serialization
    let dock = EdgeDock::Left;
    let s = serde_json::to_string(&dock).unwrap();
    assert_eq!(s, "\"left\"");

    let dock = EdgeDock::Right;
    let s = serde_json::to_string(&dock).unwrap();
    assert_eq!(s, "\"right\"");

    let dock = EdgeDock::Top;
    let s = serde_json::to_string(&dock).unwrap();
    assert_eq!(s, "\"top\"");

    let dock = EdgeDock::Bottom;
    let s = serde_json::to_string(&dock).unwrap();
    assert_eq!(s, "\"bottom\"");

    let dock = EdgeDock::None;
    let s = serde_json::to_string(&dock).unwrap();
    assert_eq!(s, "\"none\"");

    // Test deserialization from lowercase
    let dock: EdgeDock = serde_json::from_str("\"left\"").unwrap();
    assert_eq!(dock, EdgeDock::Left);

    let dock: EdgeDock = serde_json::from_str("\"none\"").unwrap();
    assert_eq!(dock, EdgeDock::None);
}
