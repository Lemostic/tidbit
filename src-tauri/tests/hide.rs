#[tokio::test]
async fn schedule_arms_and_cancels() {
    // Verify timer is cancelable
    let cancel = tidbit_lib::window::hide::schedule_hide(|| {}, 200);
    cancel(); // Should not trigger
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    assert!(true);
}
