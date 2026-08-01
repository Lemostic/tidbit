use crate::infra::db::Pool;
use tauri::AppHandle;

pub fn start(_app: AppHandle, _pool: Pool, _key: [u8; 32]) {
    // Scheduling will be wired in later; this defines the interface stub
}

pub async fn run_daily_snapshot(_pool: Pool, _key: [u8; 32]) -> anyhow::Result<()> {
    // TODO: Implement daily snapshot logic
    Ok(())
}

pub async fn run_wal_archive(_pool: Pool) -> anyhow::Result<()> {
    // TODO: Implement WAL archive logic
    Ok(())
}
