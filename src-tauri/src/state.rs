use crate::infra::db::Pool;
use crate::repo::{
    attachment_repo::AttachmentRepo, group_repo::GroupRepo, note_repo::NoteRepo,
    revision_repo::RevisionRepo, tag_repo::TagRepo,
};
use std::sync::Arc;

pub struct BackupKey(pub [u8; 32]);

pub struct AppState {
    pub pool: Pool,
    pub groups: Arc<GroupRepo>,
    pub notes: Arc<NoteRepo>,
    pub revisions: Arc<RevisionRepo>,
    pub tags: Arc<TagRepo>,
    pub attachments: Arc<AttachmentRepo>,
}

impl AppState {
    pub fn new(pool: Pool) -> Self {
        Self {
            groups: Arc::new(GroupRepo::new(pool.clone())),
            notes: Arc::new(NoteRepo::new(pool.clone())),
            revisions: Arc::new(RevisionRepo::new(pool.clone())),
            tags: Arc::new(TagRepo::new(pool.clone())),
            attachments: Arc::new(AttachmentRepo::new(pool.clone())),
            pool,
        }
    }
}
