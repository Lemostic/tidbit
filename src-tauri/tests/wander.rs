use tidbit_lib::ipc::wander::wander_position;

#[test]
fn wander_notes_start_one_hundred_pixels_from_the_top_left_and_align() {
    assert_eq!(wander_position(0, 0, 0), (100, 100));
    assert_eq!(wander_position(0, 0, 1), (496, 100));
    assert_eq!(wander_position(120, 40, 2), (1012, 140));
}
