use pbkdf2::pbkdf2_hmac;
use sha2::Sha512;

/// Generate a new random 16-byte salt.
pub fn new_salt() -> [u8; 16] {
    rand::random()
}

/// Derive a 32-byte key from a PIN and salt using PBKDF2-HMAC-SHA512 (200k iterations).
pub fn derive_key(pin: &str, salt: &[u8; 16]) -> [u8; 32] {
    let mut k = [0u8; 32];
    pbkdf2_hmac::<Sha512>(pin.as_bytes(), salt, 200_000, &mut k);
    k
}
