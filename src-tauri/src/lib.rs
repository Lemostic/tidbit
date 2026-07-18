use tauri::Manager;

pub mod autostart;
pub mod data_directory;
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
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_filter(|label| label == "main")
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let default_dir = app.path().app_data_dir().expect("appdata");
            let dir = data_directory::resolve(&default_dir)?;
            std::fs::create_dir_all(&dir)?;
            std::fs::create_dir_all(dir.join("backups"))?;
            let db_path = dir.join("tidbit.db");
            let pending_restore = dir.join("restore.pending.db");
            if pending_restore.exists() {
                let previous = dir.join("tidbit.before-restore.db");
                if db_path.exists() {
                    let _ = std::fs::copy(&db_path, previous);
                }
                std::fs::copy(&pending_restore, &db_path)?;
                std::fs::remove_file(pending_restore)?;
            }
            let pool = infra::db::open(&db_path, "devkey")?;
            infra::migrations::run(&pool)?;
            let state = state::AppState::new(pool.clone());
            app.manage(state);
            app.manage(data_directory::DataDirectory(dir.clone()));
            app.manage(window::edge_dock::DockRuntimeState::default());
            // BackupKey: v1 uses a zeroed key (M5 will wire from UI PIN)
            app.manage(state::BackupKey([0u8; 32]));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.center();
                let _ = window.show();
            }
            tray::build_tray(app)?;
            hotkey::register(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::notes::notes_list,
            ipc::notes::notes_get,
            ipc::notes::notes_create,
            ipc::notes::notes_update_content,
            ipc::notes::notes_update_title,
            ipc::notes::notes_set_pinned,
            ipc::notes::notes_set_archived,
            ipc::notes::notes_set_content_hidden,
            ipc::notes::notes_set_color,
            ipc::notes::notes_move_group,
            ipc::notes::notes_reorder,
            ipc::notes::notes_set_geometry,
            ipc::notes::notes_set_edge_dock,
            ipc::notes::notes_trash,
            ipc::notes::notes_restore,
            ipc::groups::groups_list,
            ipc::groups::groups_create,
            ipc::groups::groups_update,
            ipc::groups::groups_delete,
            ipc::window::app_quit,
            ipc::window::window_hide_to_tray,
            ipc::window::window_undock,
            ipc::window::window_set_geometry,
            ipc::window::window_apply_edge_dock,
            ipc::window::window_hide_now,
            ipc::window::window_show_all_hidden,
            ipc::window::window_arm_autohide,
            ipc::window::window_cancel_autohide,
            ipc::window::window_reveal_from_edge,
            ipc::wander::wander_open,
            ipc::wander::wander_ready,
            ipc::wander::wander_close,
            ipc::wander::wander_list,
            ipc::wander::wander_editor_open,
            ipc::wander::wander_editor_close,
            ipc::wander::wander_set_opacity,
            ipc::backup::backup_snapshot_now,
            ipc::backup::backup_restore,
            ipc::backup::backup_list,
            ipc::backup::backup_open_dir,
            ipc::settings::data_directory_get,
            ipc::settings::data_directory_pick,
            ipc::settings::data_directory_set,
            ipc::settings::autostart_get,
            ipc::settings::autostart_set,
            ipc::settings::system_fonts_list,
            ipc::search::search_query,
        ])
        .on_window_event(|win, ev| {
            if matches!(ev, tauri::WindowEvent::Moved { .. }) {
                ipc::wander::schedule_wander_snap(win);
            }
            window_state::install_close_to_tray(win.app_handle(), ev);
        })
        .run(tauri::generate_context!())
        .expect("failed to start tidbit");
}
