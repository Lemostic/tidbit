use tauri::test::mock_app;
use tidbit_lib::hotkey::register;

#[test]
fn register_does_not_panic() {
    let app = mock_app();
    register(&app.handle()).expect("register");
}
