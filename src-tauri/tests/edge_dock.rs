use tidbit_lib::window::edge_dock::{detect_dock, Rect};

#[test]
fn snaps_when_within_threshold() {
    let mon = Rect { x: 0, y: 0, w: 1920, h: 1080 };
    let near_left = Rect { x: 6, y: 100, w: 280, h: 360 };
    assert_eq!(
        detect_dock(mon, near_left),
        Some(tidbit_lib::domain::EdgeDock::Left)
    );
}

#[test]
fn no_snap_far_from_edges() {
    let mon = Rect { x: 0, y: 0, w: 1920, h: 1080 };
    let centered = Rect { x: 800, y: 400, w: 280, h: 360 };
    assert_eq!(detect_dock(mon, centered), None);
}
