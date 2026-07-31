use tauri::test::{mock_builder, mock_context, noop_assets};
use tidbit_lib::hotkey::register;

#[test]
fn register_does_not_panic() {
    let app = mock_builder()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .build(mock_context(noop_assets()))
        .expect("mock app with global shortcut plugin");
    register(&app.handle()).expect("register");
}
