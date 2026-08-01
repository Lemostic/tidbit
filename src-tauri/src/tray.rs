use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

use crate::ipc::window::show_main_window;
use crate::window::edge_dock::DockRuntimeState;

pub fn build_tray<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示 APP", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let mut builder = TrayIconBuilder::<R>::with_id("main-tray").menu(&menu);
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder
        .tooltip("tidbit")
        .on_menu_event(|app, ev| match ev.id.as_ref() {
            "show" => {
                let state: State<'_, DockRuntimeState> = app.state();
                let _ = show_main_window(app, &state);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, ev| {
            if let TrayIconEvent::DoubleClick { .. } = ev {
                let app = tray.app_handle();
                let state: State<'_, DockRuntimeState> = app.state();
                let _ = show_main_window(app, &state);
            }
        })
        .build(app)?;
    Ok(())
}
