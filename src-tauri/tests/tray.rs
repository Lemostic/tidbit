use tauri::test::mock_app;
use tidbit_lib::tray::build_tray;

#[test]
#[cfg_attr(
    target_os = "macos",
    ignore = "the native macOS menu backend requires the process main thread"
)]
fn tray_builds_without_panic() {
    let app = mock_app();
    build_tray(&app).expect("tray builds");
}
