use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn new_note_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::ALT | Modifiers::CONTROL), Code::KeyN)
}

pub fn register<R: tauri::Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let _ = app.global_shortcut().on_shortcut(new_note_shortcut(), |app, _shortcut, ev| {
        if ev.state == ShortcutState::Pressed {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
                let _ = app.emit("tidbit://hotkey/new-note", ());
            }
        }
    });
    Ok(())
}
