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
    #[error("tauri: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("lock")]
    Lock,
    #[error("not_found")]
    NotFound,
    /// User-facing search query syntax error; carries a readable message.
    #[error("{0}")]
    QuerySyntax(String),
}

impl From<crate::ipc::query_parser::ParseError> for AppError {
    fn from(e: crate::ipc::query_parser::ParseError) -> Self {
        match e {
            crate::ipc::query_parser::ParseError::Empty => {
                AppError::QuerySyntax("查询语法错误：关键词为空".into())
            }
            crate::ipc::query_parser::ParseError::UnbalancedQuote => {
                AppError::QuerySyntax("查询语法错误：引号未闭合".into())
            }
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&match self {
            AppError::Db(_) => "db",
            AppError::Pool(_) => "pool",
            AppError::Migration(_) => "migration",
            AppError::Io(_) => "io",
            AppError::Tauri(_) => "tauri",
            AppError::Lock => "lock",
            AppError::NotFound => "not_found",
            AppError::QuerySyntax(message) => message,
        })
    }
}
