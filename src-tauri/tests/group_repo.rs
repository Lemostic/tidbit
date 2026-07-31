use tidbit_lib::infra::db::Pool;
use tidbit_lib::repo::group_repo::GroupRepo;

mod common;

fn pool() -> Pool {
    common::pool()
}

#[test]
fn create_list_round_trip() {
    let r = GroupRepo::new(pool());
    let g = r.create("Inbox").unwrap();
    assert_eq!(g.name, "Inbox");
    assert_eq!(g.color, g.background_color);
    let all = r.list().unwrap();
    assert_eq!(all.len(), 1);
}

#[test]
fn update_name_and_color() {
    let r = GroupRepo::new(pool());
    let group = r.create("Inbox").unwrap();
    let updated = r
        .update(group.id, "Work", Some("#d75555"), Some("#4c9a73"))
        .unwrap();
    assert_eq!(updated.name, "Work");
    assert_eq!(updated.color.as_deref(), Some("#d75555"));
    assert_eq!(updated.background_color.as_deref(), Some("#4c9a73"));
}
