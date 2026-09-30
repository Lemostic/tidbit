use serde_json::json;
use tauri_plugin_global_shortcut::Modifiers;
use tidbit_lib::platform::{
    profile_for, settings_menu_accelerator_for, shortcut_modifiers_for, should_close_to_tray,
    should_show_main_on_reopen, tray_icon_is_template, DesktopOs,
};

#[cfg(target_os = "macos")]
use tauri::{test::mock_app, Manager};
#[cfg(target_os = "macos")]
use tidbit_lib::{
    domain::EdgeDock, ipc::window::window_undock, window::edge_dock::DockRuntimeState,
};

#[test]
fn windows_profile_keeps_custom_chrome_and_all_capabilities() {
    let profile = serde_json::to_value(profile_for(DesktopOs::Windows)).expect("serialize profile");

    assert_eq!(
        profile,
        json!({
            "os": "windows",
            "windowChrome": "custom",
            "shortcutModifier": "Ctrl",
            "capabilities": {
                "edgeDock": true,
                "edgeAutoHide": true,
                "autostart": true,
                "directoryPicker": true,
                "transparentWindows": true
            }
        })
    );
}

#[test]
fn macos_profile_uses_native_chrome_and_disables_edge_features() {
    let profile = profile_for(DesktopOs::Macos);
    let serialized = serde_json::to_value(profile).expect("serialize profile");

    assert_eq!(serialized["windowChrome"], "native");
    assert_eq!(serialized["shortcutModifier"], "Command");
    assert_eq!(serialized["capabilities"]["edgeDock"], false);
    assert_eq!(serialized["capabilities"]["edgeAutoHide"], false);
    assert_eq!(serialized["capabilities"]["autostart"], true);
    assert_eq!(serialized["capabilities"]["directoryPicker"], true);
    assert_eq!(serialized["capabilities"]["transparentWindows"], true);
}

#[test]
fn only_the_main_window_closes_to_tray() {
    assert!(should_close_to_tray("main"));
    assert!(!should_close_to_tray("wander-42"));
    assert!(!should_close_to_tray("wander-editor-42"));
}

#[test]
fn macos_reopen_shows_the_main_window() {
    assert!(should_show_main_on_reopen(DesktopOs::Macos));
    assert!(!should_show_main_on_reopen(DesktopOs::Windows));
}

#[cfg(target_os = "macos")]
#[test]
fn macos_edge_undock_command_is_a_defensive_noop() {
    let app = mock_app();
    app.manage(DockRuntimeState::default());
    let state = app.state::<DockRuntimeState>();
    state.set_edge(Some(EdgeDock::Left));

    window_undock(state);

    assert_eq!(app.state::<DockRuntimeState>().edge(), Some(EdgeDock::Left));
}

#[test]
fn global_shortcuts_use_the_platform_primary_modifier() {
    assert_eq!(
        shortcut_modifiers_for(DesktopOs::Windows),
        Modifiers::CONTROL | Modifiers::ALT
    );
    assert_eq!(
        shortcut_modifiers_for(DesktopOs::Macos),
        Modifiers::SUPER | Modifiers::ALT
    );
}

#[test]
fn macos_uses_a_template_status_icon_and_standard_settings_shortcut() {
    assert!(!tray_icon_is_template(DesktopOs::Windows));
    assert!(tray_icon_is_template(DesktopOs::Macos));
    assert_eq!(
        settings_menu_accelerator_for(DesktopOs::Macos),
        Some("Command+,")
    );
    assert_eq!(settings_menu_accelerator_for(DesktopOs::Windows), None);
}
