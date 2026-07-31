use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};

use crate::platform::{current_os, shortcut_modifiers_for};

pub fn new_note_shortcut() -> Shortcut {
    Shortcut::new(Some(shortcut_modifiers_for(current_os())), Code::KeyN)
}

pub fn show_shortcut() -> Shortcut {
    Shortcut::new(Some(shortcut_modifiers_for(current_os())), Code::KeyB)
}

pub fn register<R: tauri::Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let _ = app
        .global_shortcut()
        .on_shortcut(new_note_shortcut(), |app, _shortcut, ev| {
            if ev.state == ShortcutState::Pressed {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                    let _ = app.emit("tidbit://hotkey/new-note", ());
                }
            }
        });

    let _ = app
        .global_shortcut()
        .on_shortcut(show_shortcut(), |app, _, ev| {
            if ev.state == ShortcutState::Pressed {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        });

    Ok(())
}
