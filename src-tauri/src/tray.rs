use tauri::{
    menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub fn build_tray<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show tidbit", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .on_menu_event(|app, ev| match ev.id.as_ref() {
            "show" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, ev| if let TrayIconEvent::DoubleClick { .. } = ev {
            if let Some(w) = tray.app_handle().get_webview_window("main") { let _ = w.show(); }
        })
        .build(app)?;
    Ok(())
}
