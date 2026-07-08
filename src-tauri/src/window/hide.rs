use std::sync::Arc;
use tokio::sync::Notify;

pub fn schedule_hide<F: FnOnce() + Send + 'static>(f: F, after_ms: u64) -> impl FnOnce() + Send + 'static {
    let cancel = Arc::new(Notify::new());
    let cancel_worker = cancel.clone();
    tokio::spawn(async move {
        tokio::select! {
            _ = tokio::time::sleep(std::time::Duration::from_millis(after_ms)) => { f(); }
            _ = cancel_worker.notified() => {}
        }
    });
    move || { cancel.notify_one(); }
}
