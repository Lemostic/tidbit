use rusqlite::Connection;
use tempfile::tempdir;
use tidbit_lib::backup::snapshot::{create_snapshot, restore_snapshot};
use tidbit_lib::security::kdf::{derive_key, new_salt};

#[test]
fn snapshot_then_restore() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("src.db");
    let dst = dir.path().join("snap.bak");
    let conn = Connection::open(&src).unwrap();
    conn.execute_batch("CREATE TABLE t(c TEXT)").unwrap();
    conn.execute("INSERT INTO t VALUES ('hi')", []).unwrap();
    drop(conn);
    let key = derive_key("pin", &new_salt());
    create_snapshot(&src, &dst, &key).unwrap();
    let staging = dir.path().join("staging");
    restore_snapshot(&dst, &staging, &key).unwrap();
    let conn2 = Connection::open(staging.join("tidbit.db")).unwrap();
    let v: String = conn2
        .query_row("SELECT c FROM t", [], |r| r.get(0))
        .unwrap();
    assert_eq!(v, "hi");
}
