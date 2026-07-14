use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

use crate::ipc::window::show_main_window;
use crate::window::edge_dock::DockRuntimeState;
use crate::error::AppError;

fn locale() -> String {
    std::env::var("LANG")
        .or_else(|_| std::env::var("LC_ALL"))
        .unwrap_or_default()
        .to_ascii_lowercase()
}

pub fn build_tray<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let english = locale().starts_with("en");
    let show = MenuItem::with_id(app, "show", if english { "Show tidbit" } else { "显示 APP" }, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", if english { "Quit" } else { "退出" }, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?;
    let builder = TrayIconBuilder::<R>::with_id("main-tray").menu(&menu).icon(tray_icon);
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

#[tauri::command]
pub fn tray_set_language(app: tauri::AppHandle, locale: String) -> Result<(), AppError> {
    let english = locale.starts_with("en");
    let show = MenuItem::with_id(&app, "show", if english { "Show tidbit" } else { "显示 APP" }, true, None::<&str>)?;
    let quit = MenuItem::with_id(&app, "quit", if english { "Quit" } else { "退出" }, true, None::<&str>)?;
    let menu = Menu::with_items(&app, &[&show, &quit])?;
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}
