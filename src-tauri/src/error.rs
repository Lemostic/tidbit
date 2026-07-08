use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("db: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("pool: {0}")]
    Pool(#[from] r2d2::Error),
    #[error("migration: {0}")]
    Migration(String),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("lock")]
    Lock,
    #[error("not_found")]
    NotFound,
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&match self {
            AppError::Db(_) => "db",
            AppError::Pool(_) => "pool",
            AppError::Migration(_) => "migration",
            AppError::Io(_) => "io",
            AppError::Lock => "lock",
            AppError::NotFound => "not_found",
        })
    }
}
