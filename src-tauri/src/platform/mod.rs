use serde::Serialize;
use tauri_plugin_global_shortcut::Modifiers;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DesktopOs {
    Windows,
    Macos,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum WindowChrome {
    Custom,
    Native,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum ShortcutModifier {
    Ctrl,
    Command,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCapabilities {
    pub edge_dock: bool,
    pub edge_auto_hide: bool,
    pub autostart: bool,
    pub directory_picker: bool,
    pub transparent_windows: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProfile {
    pub os: DesktopOs,
    pub window_chrome: WindowChrome,
    pub shortcut_modifier: ShortcutModifier,
    pub capabilities: DesktopCapabilities,
}

pub const fn profile_for(os: DesktopOs) -> DesktopProfile {
    match os {
        DesktopOs::Windows => DesktopProfile {
            os,
            window_chrome: WindowChrome::Custom,
            shortcut_modifier: ShortcutModifier::Ctrl,
            capabilities: DesktopCapabilities {
                edge_dock: true,
                edge_auto_hide: true,
                autostart: true,
                directory_picker: true,
                transparent_windows: true,
            },
        },
        DesktopOs::Macos => DesktopProfile {
            os,
            window_chrome: WindowChrome::Native,
            shortcut_modifier: ShortcutModifier::Command,
            capabilities: DesktopCapabilities {
                edge_dock: false,
                edge_auto_hide: false,
                autostart: true,
                directory_picker: true,
                transparent_windows: true,
            },
        },
    }
}

pub const fn current_os() -> DesktopOs {
    #[cfg(target_os = "windows")]
    return DesktopOs::Windows;

    #[cfg(target_os = "macos")]
    return DesktopOs::Macos;

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    DesktopOs::Windows
}

#[tauri::command]
pub const fn desktop_profile() -> DesktopProfile {
    profile_for(current_os())
}

pub fn should_close_to_tray(label: &str) -> bool {
    label == "main"
}

pub const fn should_show_main_on_reopen(os: DesktopOs) -> bool {
    matches!(os, DesktopOs::Macos)
}

pub const fn shortcut_modifiers_for(os: DesktopOs) -> Modifiers {
    match os {
        DesktopOs::Windows => Modifiers::ALT.union(Modifiers::CONTROL),
        DesktopOs::Macos => Modifiers::ALT.union(Modifiers::SUPER),
    }
}

pub const fn supports_edge_dock() -> bool {
    profile_for(current_os()).capabilities.edge_dock
}

pub const fn supports_edge_auto_hide() -> bool {
    profile_for(current_os()).capabilities.edge_auto_hide
}

pub const fn tray_icon_is_template(os: DesktopOs) -> bool {
    matches!(os, DesktopOs::Macos)
}

pub const fn settings_menu_accelerator_for(os: DesktopOs) -> Option<&'static str> {
    match os {
        DesktopOs::Windows => None,
        DesktopOs::Macos => Some("Command+,"),
    }
}

pub fn initialize<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    install_macos_menu(app)?;

    #[cfg(not(target_os = "macos"))]
    let _ = app;

    Ok(())
}

#[cfg(target_os = "macos")]
fn install_macos_menu<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
    use tauri::{Emitter, Manager};

    const SETTINGS_MENU_ID: &str = "settings";

    let menu = Menu::default(app.handle())?;
    let settings = MenuItem::with_id(
        app,
        SETTINGS_MENU_ID,
        "设置…",
        true,
        settings_menu_accelerator_for(DesktopOs::Macos),
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    if let Some(MenuItemKind::Submenu(application_menu)) = menu.items()?.into_iter().next() {
        application_menu.insert_items(&[&settings, &separator], 2)?;
    }
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id().as_ref() != SETTINGS_MENU_ID {
            return;
        }
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
            let _ = window.emit("tidbit://open-settings", ());
        }
    });
    Ok(())
}

pub fn handle_run_event<R: tauri::Runtime>(app: &tauri::AppHandle<R>, event: tauri::RunEvent) {
    #[cfg(target_os = "macos")]
    if matches!(event, tauri::RunEvent::Reopen { .. }) && should_show_main_on_reopen(current_os()) {
        use tauri::Manager;

        let dock_state = app.state::<crate::window::edge_dock::DockRuntimeState>();
        let _ = crate::ipc::window::show_main_window(app, &dock_state);
    }

    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}
