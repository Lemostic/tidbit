use crate::infra::db::Pool;
use crate::repo::{group_repo::GroupRepo, note_repo::NoteRepo, revision_repo::RevisionRepo};
use std::sync::Arc;

pub struct BackupKey(pub [u8; 32]);

pub struct AppState {
    pub pool: Pool,
    pub groups: Arc<GroupRepo>,
    pub notes: Arc<NoteRepo>,
    pub revisions: Arc<RevisionRepo>,
}

impl AppState {
    pub fn new(pool: Pool) -> Self {
        Self {
            groups: Arc::new(GroupRepo::new(pool.clone())),
            notes: Arc::new(NoteRepo::new(pool.clone())),
            revisions: Arc::new(RevisionRepo::new(pool.clone())),
            pool,
        }
    }
}
