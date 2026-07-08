use tidbit_lib::security::cipher::{open, seal};

#[test]
fn round_trip() {
    let k = [7u8; 32];
    let pt = b"tidbit snapshot";
    let (ct, nonce) = seal(&k, pt);
    let pt2 = open(&k, &nonce, &ct).unwrap();
    assert_eq!(pt2, pt);
}
