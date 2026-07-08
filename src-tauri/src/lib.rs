use tauri::Manager;

pub mod domain;
pub mod error;
pub mod hotkey;
pub mod infra;
pub mod tray;
pub mod window_state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("appdata");
            std::fs::create_dir_all(&dir)?;
            let db_path = dir.join("tidbit.db");
            let pool = infra::db::open(&db_path, "devkey")?;
            infra::migrations::run(&pool)?;
            app.manage(pool);
            tray::build_tray(app)?;
            hotkey::register(&app.handle())?;
            Ok(())
        })
        .on_window_event(|win, ev| window_state::install_close_to_tray(win.app_handle(), ev))
        .run(tauri::generate_context!())
        .expect("failed to start tidbit");
}
