use tauri::Manager;

pub mod domain;
pub mod error;
pub mod hotkey;
pub mod infra;
pub mod ipc;
pub mod repo;
pub mod security;
pub mod state;
pub mod tray;
pub mod window;
pub mod window_state;

pub mod backup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("appdata");
            std::fs::create_dir_all(&dir)?;
            std::fs::create_dir_all(dir.join("backups"))?;
            let db_path = dir.join("tidbit.db");
            let pool = infra::db::open(&db_path, "devkey")?;
            infra::migrations::run(&pool)?;
            let state = state::AppState::new(pool.clone());
            app.manage(state);
            // BackupKey: v1 uses a zeroed key (M5 will wire from UI PIN)
            app.manage(state::BackupKey([0u8; 32]));
            tray::build_tray(app)?;
            hotkey::register(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::notes::notes_list,
            ipc::notes::notes_get,
            ipc::notes::notes_create,
            ipc::notes::notes_update_content,
            ipc::notes::notes_set_geometry,
            ipc::notes::notes_set_edge_dock,
            ipc::notes::notes_trash,
            ipc::notes::notes_restore,
            ipc::groups::groups_list,
            ipc::groups::groups_create,
            ipc::window::window_set_geometry,
            ipc::window::window_apply_edge_dock,
            ipc::window::window_hide_now,
            ipc::window::window_show_all_hidden,
            ipc::window::window_arm_autohide,
            ipc::backup::backup_snapshot_now,
            ipc::backup::backup_restore,
            ipc::backup::backup_list,
            ipc::search::search_query,
        ])
        .on_window_event(|win, ev| window_state::install_close_to_tray(win.app_handle(), ev))
        .run(tauri::generate_context!())
        .expect("failed to start tidbit");
}
