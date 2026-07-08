use crate::error::AppError;
use crate::security::cipher::{open, seal};
use std::fs;
use std::path::Path;

const MAGIC: &[u8; 4] = b"TID1";

pub fn create_snapshot(src_db: &Path, out: &Path, key: &[u8; 32]) -> Result<(), AppError> {
    let plain = fs::read(src_db)?;
    let (ct, nonce) = seal(key, &plain);
    let mut blob = Vec::with_capacity(4 + 16 + 12 + ct.len());
    blob.extend_from_slice(MAGIC);
    blob.extend_from_slice(&[0u8; 16]); // Salt stored separately (vault salt)
    blob.extend_from_slice(&nonce);
    blob.extend_from_slice(&ct);
    fs::write(out, blob)?;
    Ok(())
}

pub fn restore_snapshot(blob_path: &Path, staging_dir: &Path, key: &[u8; 32]) -> Result<(), AppError> {
    let blob = fs::read(blob_path)?;
    if &blob[0..4] != MAGIC {
        return Err(AppError::Lock);
    }
    let nonce: [u8; 12] = blob[20..32].try_into().map_err(|_| AppError::Lock)?;
    let ct = &blob[32..];
    let plain = open(key, &nonce, ct)?;
    fs::create_dir_all(staging_dir)?;
    fs::write(staging_dir.join("tidbit.db"), plain)?;
    Ok(())
}
