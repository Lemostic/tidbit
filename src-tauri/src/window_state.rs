use tauri::{Manager, WindowEvent};

pub fn install_close_to_tray<R: tauri::Runtime>(app: &tauri::AppHandle<R>, ev: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = ev {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.hide();
        }
        api.prevent_close();
    }
}
