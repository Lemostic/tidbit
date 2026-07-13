use crate::error::AppError;
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;

pub type Pool = r2d2::Pool<SqliteConnectionManager>;

/// Open a SQLCipher-encrypted SQLite connection pool.
/// The key is passed directly via PRAGMA key (SQLCipher KDF is handled separately in Task 7).
pub fn open<P: AsRef<Path>>(path: P, key: &str) -> Result<Pool, AppError> {
    let path = path.as_ref().to_path_buf();
    // Clone key to give it 'static lifetime for the closure.
    let key_static = key.to_owned();
    let manager = SqliteConnectionManager::file(&path).with_init(move |c| {
        // PRAGMA key applies the encryption key to the connection.
        // cipher_compatibility=4 targets SQLCipher 4.x compatibility mode.
        let sql = format!(
            "PRAGMA key='{}'; PRAGMA cipher_compatibility=4;",
            key_static
        );
        c.execute_batch(&sql)
    });
    let pool = r2d2::Pool::builder().max_size(8).build(manager)?;
    Ok(pool)
}
