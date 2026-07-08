use tauri::test::mock_app;
use tidbit_lib::tray::build_tray;

#[test]
fn tray_builds_without_panic() {
    let app = mock_app();
    build_tray(&app).expect("tray builds");
}
