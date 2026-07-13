use tidbit_lib::domain::EdgeDock;
use tidbit_lib::window::edge_dock::{
    animated_position, cursor_hits_reveal_strip, cursor_inside_window, detect_dock,
    hidden_position, snapped_position, DockRuntimeState, Rect, EDGE_ANIMATION_MS, EDGE_REVEAL_PX,
};

#[test]
fn snaps_when_within_threshold() {
    let mon = Rect {
        x: 0,
        y: 0,
        w: 1920,
        h: 1080,
    };
    let near_left = Rect {
        x: 6,
        y: 100,
        w: 280,
        h: 360,
    };
    assert_eq!(
        detect_dock(mon, near_left),
        Some(tidbit_lib::domain::EdgeDock::Left)
    );
}

#[test]
fn no_snap_far_from_edges() {
    let mon = Rect {
        x: 0,
        y: 0,
        w: 1920,
        h: 1080,
    };
    let centered = Rect {
        x: 800,
        y: 400,
        w: 280,
        h: 360,
    };
    assert_eq!(detect_dock(mon, centered), None);
}

#[test]
fn snaps_flush_to_each_screen_edge() {
    let mon = Rect {
        x: 100,
        y: 50,
        w: 1920,
        h: 1080,
    };
    let win = Rect {
        x: 105,
        y: 160,
        w: 360,
        h: 640,
    };
    assert_eq!(snapped_position(mon, win, EdgeDock::Left), (100, 160));
    assert_eq!(snapped_position(mon, win, EdgeDock::Right), (1660, 160));
    assert_eq!(snapped_position(mon, win, EdgeDock::Top), (105, 50));
    assert_eq!(snapped_position(mon, win, EdgeDock::Bottom), (105, 490));
}

#[test]
fn auto_hide_leaves_a_reveal_strip_on_screen() {
    let mon = Rect {
        x: 0,
        y: 0,
        w: 1920,
        h: 1080,
    };
    let win = Rect {
        x: 0,
        y: 120,
        w: 360,
        h: 640,
    };
    assert_eq!(
        hidden_position(mon, win, EdgeDock::Left),
        (-360 + EDGE_REVEAL_PX, 120)
    );
    assert_eq!(
        hidden_position(mon, win, EdgeDock::Right),
        (1920 - EDGE_REVEAL_PX, 120)
    );
    assert!(cursor_hits_reveal_strip(mon, win, EdgeDock::Left, 2, 300));
    assert!(!cursor_hits_reveal_strip(mon, win, EdgeDock::Left, 40, 300));
    assert!(cursor_hits_reveal_strip(
        mon,
        win,
        EdgeDock::Right,
        1918,
        300
    ));
    assert!(cursor_hits_reveal_strip(mon, win, EdgeDock::Top, 120, 2));
    assert!(cursor_hits_reveal_strip(
        mon,
        win,
        EdgeDock::Bottom,
        120,
        1078
    ));
}

#[test]
fn edge_transition_uses_a_half_second_eased_trajectory() {
    assert_eq!(EDGE_ANIMATION_MS, 500);
    assert_eq!(animated_position((0, 100), (-354, 100), 0.0), (0, 100));
    assert_eq!(animated_position((0, 100), (-354, 100), 1.0), (-354, 100));
    let midpoint = animated_position((0, 100), (-354, 100), 0.5);
    assert!(midpoint.0 < -150 && midpoint.0 > -205);
}

#[test]
fn tray_show_cancels_hidden_edge_state() {
    let state = DockRuntimeState::default();
    state.set_edge(Some(EdgeDock::Right));
    let generation = state.arm_hide();
    assert_eq!(state.hide_if_current(generation), Some(EdgeDock::Right));
    assert!(state.is_hidden());

    assert_eq!(state.force_reveal(), Some(EdgeDock::Right));
    assert!(!state.is_hidden());
}

#[test]
fn starting_a_drag_clears_the_previous_edge_and_pending_hide() {
    let state = DockRuntimeState::default();
    state.set_edge(Some(EdgeDock::Left));
    let stale_generation = state.arm_hide();

    state.undock();

    assert_eq!(state.edge(), None);
    assert_eq!(state.hide_if_current(stale_generation), None);
    assert!(!state.is_hidden());
}

#[test]
fn reveal_animation_cannot_rearm_autohide() {
    let state = DockRuntimeState::default();
    state.set_edge(Some(EdgeDock::Left));
    let hide_generation = state.try_arm_hide().unwrap();
    assert_eq!(state.hide_if_current(hide_generation), Some(EdgeDock::Left));
    let (reveal_generation, _) = state.begin_reveal().unwrap();

    assert_eq!(state.try_arm_hide(), None);
    assert!(state.is_current(reveal_generation));
    state.finish_reveal(reveal_generation);
    assert!(!state.is_hidden());
}

#[test]
fn pointer_activity_inside_visible_window_cancels_pending_hide() {
    let state = DockRuntimeState::default();
    state.set_edge(Some(EdgeDock::Right));
    let pending = state.try_arm_hide().unwrap();
    state.cancel_pending_hide();
    assert_eq!(state.hide_if_current(pending), None);

    let window = Rect {
        x: 1400,
        y: 120,
        w: 500,
        h: 780,
    };
    assert!(cursor_inside_window(window, 1600, 400));
    assert!(!cursor_inside_window(window, 1399, 400));
}
