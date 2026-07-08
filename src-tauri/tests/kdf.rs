use tidbit_lib::security::kdf::{derive_key, new_salt};

#[test]
fn same_pin_salt_yields_same_key() {
    let s = new_salt();
    let k1 = derive_key("pin", &s);
    let k2 = derive_key("pin", &s);
    assert_eq!(k1, k2);
}

#[test]
fn different_pin_differs() {
    let s = new_salt();
    assert_ne!(derive_key("a", &s), derive_key("b", &s));
}
