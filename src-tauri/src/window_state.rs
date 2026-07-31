use tauri::{Manager, WindowEvent};

use crate::platform::should_close_to_tray;

pub fn install_close_to_tray<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    ev: &WindowEvent,
) {
    if !should_close_to_tray(label) {
        return;
    }
    if let WindowEvent::CloseRequested { api, .. } = ev {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.hide();
        }
        api.prevent_close();
    }
}
