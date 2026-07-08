use tauri::Manager;

pub mod hotkey;
pub mod tray;
pub mod window_state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            tray::build_tray(app)?;
            hotkey::register(&app.handle())?;
            Ok(())
        })
        .on_window_event(|win, ev| window_state::install_close_to_tray(win.app_handle(), ev))
        .run(tauri::generate_context!())
        .expect("failed to start tidbit");
}
