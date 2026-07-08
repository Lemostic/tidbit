// Test for SQLCipher round-trip: write encrypted data and verify ciphertext
// is not plaintext.
use rusqlite;
use tempfile::tempdir;

#[test]
fn sqlcipher_round_trips_ciphertext() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("t.db");
    let conn = rusqlite::Connection::open(&path).unwrap();
    conn.execute_batch("PRAGMA key='x'; PRAGMA cipher_compatibility=4;")
        .unwrap();
    conn.execute_batch("CREATE TABLE t(c TEXT);").unwrap();
    conn.execute("INSERT INTO t VALUES ('hello')", []).unwrap();
    drop(conn);
    let raw = std::fs::read(&path).unwrap();
    assert!(
        !raw.windows(5).any(|w| w == b"hello"),
        "plaintext 'hello' found in encrypted file"
    );
}
