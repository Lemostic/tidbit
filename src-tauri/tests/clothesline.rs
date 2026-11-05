use tidbit_lib::ipc::clothesline::{
    centered_top_position, clothesline_sizes, cursor_hits_clothesline_peek, read_positions,
    sanitize_positions, write_positions, NotePosition, CLOTHESLINE_EDGE_MARGIN,
    CLOTHESLINE_HEIGHT, CLOTHESLINE_PEEK_HEIGHT, CLOTHESLINE_PEEK_WIDTH, CLOTHESLINE_TOP_GAP,
};
use tidbit_lib::repo::note_repo::NoteRepo;
use tidbit_lib::window::edge_dock::Rect;

mod common;

fn monitor(width: i32) -> Rect {
    Rect {
        x: 0,
        y: 0,
        w: width,
        h: 1080,
    }
}

#[test]
fn clothesline_is_centered_at_the_top_with_a_small_peek() {
    let (visible, peek) = clothesline_sizes(1920, 1.0);
    // The rope now spans the whole monitor minus a small edge margin so it
    // reads as a real clothesline going across the screen.
    let expected_visible = 1920 - (CLOTHESLINE_EDGE_MARGIN as i32) * 2;
    assert_eq!(visible, (expected_visible, CLOTHESLINE_HEIGHT as i32));
    assert_eq!(
        peek,
        (
            CLOTHESLINE_PEEK_WIDTH as i32,
            CLOTHESLINE_PEEK_HEIGHT as i32
        )
    );
    assert_eq!(
        centered_top_position(monitor(1920), visible.0, CLOTHESLINE_TOP_GAP as i32),
        ((1920 - expected_visible) / 2, 6)
    );
    assert_eq!(
        centered_top_position(monitor(1920), peek.0, CLOTHESLINE_TOP_GAP as i32),
        (836, 6)
    );
}

#[test]
fn clothesline_width_stays_inside_small_monitors() {
    let (visible, peek) = clothesline_sizes(800, 1.0);
    // A small monitor still gets a full-width rope (minus the edge margin),
    // so the rope reads as wide as the screen even on tight displays.
    assert_eq!(visible.0, 800 - (CLOTHESLINE_EDGE_MARGIN as i32) * 2);
    assert!(peek.0 <= visible.0);
}

#[test]
fn only_the_centered_peek_area_reveals_the_board() {
    assert!(cursor_hits_clothesline_peek(
        monitor(1920),
        CLOTHESLINE_PEEK_WIDTH as i32,
        CLOTHESLINE_PEEK_HEIGHT as i32,
        CLOTHESLINE_TOP_GAP as i32,
        960,
        12
    ));
    assert!(!cursor_hits_clothesline_peek(
        monitor(1920),
        CLOTHESLINE_PEEK_WIDTH as i32,
        CLOTHESLINE_PEEK_HEIGHT as i32,
        CLOTHESLINE_TOP_GAP as i32,
        500,
        12
    ));
    assert!(!cursor_hits_clothesline_peek(
        monitor(1920),
        CLOTHESLINE_PEEK_WIDTH as i32,
        CLOTHESLINE_PEEK_HEIGHT as i32,
        CLOTHESLINE_TOP_GAP as i32,
        960,
        60
    ));
}

#[test]
fn native_clothesline_window_is_fixed_and_not_draggable() {
    let source = include_str!("../src/ipc/clothesline.rs");
    assert!(source.contains(".resizable(false)"));
    assert!(source.contains(".maximizable(false)"));
    assert!(source.contains(".minimizable(false)"));
    assert!(!source.contains("start_dragging"));
}

#[test]
fn sanitize_positions_drops_bad_ids_and_duplicates() {
    let cleaned = sanitize_positions(vec![
        NotePosition { id: 3, x: 120.0 },
        NotePosition { id: 3, x: 999.0 },
        NotePosition { id: 0, x: 40.0 },
        NotePosition { id: -7, x: 40.0 },
        NotePosition { id: 4, x: 300.5 },
    ]);
    assert_eq!(
        cleaned,
        vec![
            NotePosition { id: 3, x: 120.0 },
            NotePosition { id: 4, x: 300.5 },
        ]
    );
}

#[test]
fn legacy_positions_still_round_trip_through_the_database() {
    let repo = NoteRepo::new(common::pool());
    let first = repo.create_in_group(None, "First").unwrap();
    let second = repo.create_in_group(None, "Second").unwrap();

    write_positions(
        &repo,
        vec![
            NotePosition {
                id: second.id,
                x: 640.25,
            },
            NotePosition {
                id: first.id,
                x: 118.5,
            },
        ],
    )
    .unwrap();

    assert_eq!(
        read_positions(&repo).unwrap(),
        vec![
            NotePosition {
                id: first.id,
                x: 118.5,
            },
            NotePosition {
                id: second.id,
                x: 640.25,
            },
        ]
    );
}
