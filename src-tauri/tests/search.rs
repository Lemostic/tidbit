mod common;
use tidbit_lib::infra::db::Pool;
use tidbit_lib::ipc::search::search_notes;
use tidbit_lib::repo::note_repo::NoteRepo;
use tidbit_lib::repo::tag_repo::TagRepo;

fn seed(pool: &Pool) {
    let conn = pool.get().unwrap();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS tag (
           id INTEGER PRIMARY KEY,
           name TEXT NOT NULL UNIQUE COLLATE NOCASE,
           created_at INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS note_tag (
           note_id INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
           tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
           created_at INTEGER NOT NULL,
           PRIMARY KEY (note_id, tag_id)
         );",
    )
    .unwrap();
}

#[test]
fn matches_each_keyword_and_ranks_title_hits() {
    let pool = common::pool();
    let repo = NoteRepo::new(pool.clone());
    let a = repo.create_in_group(None, "便签").unwrap();
    let _ = repo.update_content(a.id, "团队周报", "html", 4).unwrap();
    let b = repo.create_in_group(None, "周报汇总").unwrap();
    let _ = repo.update_content(b.id, "需要提交材料", "html", 8).unwrap();
    let c = repo.create_in_group(None, "无关").unwrap();
    let _ = repo.update_content(c.id, "喝水", "html", 2).unwrap();

    // AND semantics: both keywords must appear somewhere in title or body.
    let hits = search_notes(&pool, "周报 团队", None, false).unwrap();
    let ids: Vec<i64> = hits.iter().map(|h| h.id).collect();
    assert_eq!(ids, vec![a.id]);

    // Title hit outranks body-only hit.
    let hits = search_notes(&pool, "周报", None, false).unwrap();
    let ids: Vec<i64> = hits.iter().map(|h| h.id).collect();
    assert!(ids[0] == b.id || ids[0] == a.id, "got {:?}", ids);
    let title_hit = hits.iter().find(|h| h.id == b.id).unwrap();
    let body_hit = hits.iter().find(|h| h.id == a.id).unwrap();
    assert!(title_hit.score > body_hit.score);
}

#[test]
fn excludes_hidden_and_trashed_and_archived_by_default() {
    let pool = common::pool();
    let repo = NoteRepo::new(pool.clone());
    let visible = repo.create_in_group(None, "可见").unwrap();
    let _ = repo.update_content(visible.id, "秘密计划", "html", 4).unwrap();
    let hidden = repo.create_in_group(None, "隐藏").unwrap();
    let _ = repo.update_content(hidden.id, "秘密计划", "html", 4).unwrap();
    let _ = repo.set_content_hidden(hidden.id, true).unwrap();
    let trashed = repo.create_in_group(None, "回收").unwrap();
    let _ = repo.update_content(trashed.id, "秘密计划", "html", 4).unwrap();
    let _ = repo.trash(trashed.id).unwrap();
    let archived = repo.create_in_group(None, "归档").unwrap();
    let _ = repo.update_content(archived.id, "秘密计划", "html", 4).unwrap();
    let _ = repo.set_archived(archived.id, true).unwrap();

    let hits = search_notes(&pool, "秘密计划", None, false).unwrap();
    let ids: Vec<i64> = hits.iter().map(|h| h.id).collect();
    assert_eq!(ids, vec![visible.id]);

    let hits = search_notes(&pool, "秘密计划", None, true).unwrap();
    let ids: Vec<i64> = hits.iter().map(|h| h.id).collect();
    assert!(ids.contains(&archived.id));
    assert!(!ids.contains(&hidden.id));
    assert!(!ids.contains(&trashed.id));
}

#[test]
fn filters_by_tag_and_returns_terms() {
    let pool = common::pool();
    seed(&pool);
    let repo = NoteRepo::new(pool.clone());
    let tags = TagRepo::new(pool.clone());
    let a = repo.create_in_group(None, "A").unwrap();
    let _ = repo.update_content(a.id, "项目 alpha", "html", 3).unwrap();
    let b = repo.create_in_group(None, "B").unwrap();
    let _ = repo.update_content(b.id, "项目 alpha", "html", 3).unwrap();
    let _ = tags.set_for_note(a.id, &["工作".into()]).unwrap();

    let hits = search_notes(&pool, "项目", Some("工作"), false).unwrap();
    let ids: Vec<i64> = hits.iter().map(|h| h.id).collect();
    assert_eq!(ids, vec![a.id]);

    let hit = &hits[0];
    assert_eq!(hit.terms, vec!["项目".to_string()]);
    assert!(hit.score > 0);
    assert!(hit.snippet.contains("项目"));
}

#[test]
fn empty_query_returns_no_hits() {
    let pool = common::pool();
    let repo = NoteRepo::new(pool.clone());
    let _ = repo.create_in_group(None, "任意").unwrap();
    assert!(search_notes(&pool, "   ", None, false).unwrap().is_empty());
}
