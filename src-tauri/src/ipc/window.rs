use crate::domain::EdgeDock;
use crate::error::AppError;
use crate::state::AppState;
use crate::window::edge_dock::{
    animated_position, cursor_hits_reveal_strip, cursor_inside_window, detect_dock,
    hidden_position, snapped_position, DockRuntimeState, Rect, EDGE_ANIMATION_MS,
};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};

#[cfg(windows)]
#[repr(C)]
struct CursorPoint {
    x: i32,
    y: i32,
}

#[cfg(windows)]
#[link(name = "user32")]
extern "system" {
    fn GetCursorPos(point: *mut CursorPoint) -> i32;
}

#[cfg(windows)]
fn cursor_position() -> Option<(i32, i32)> {
    let mut point = CursorPoint { x: 0, y: 0 };
    let ok = unsafe { GetCursorPos(&mut point) };
    (ok != 0).then_some((point.x, point.y))
}

#[cfg(not(windows))]
fn cursor_position() -> Option<(i32, i32)> {
    None
}

async fn animate_window_position(
    window: &tauri::WebviewWindow,
    state: &DockRuntimeState,
    generation: u64,
    from: (i32, i32),
    to: (i32, i32),
) -> bool {
    let started = Instant::now();
    let duration = Duration::from_millis(EDGE_ANIMATION_MS);
    loop {
        if !state.is_current(generation) {
            return false;
        }
        let progress = (started.elapsed().as_secs_f64() / duration.as_secs_f64()).min(1.0);
        let (x, y) = animated_position(from, to, progress);
        if window
            .set_position(tauri::PhysicalPosition::new(x, y))
            .is_err()
        {
            return false;
        }
        if progress >= 1.0 {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(16)).await;
    }
}

fn edge_label(edge: EdgeDock) -> String {
    match edge {
        EdgeDock::Left => "left",
        EdgeDock::Right => "right",
        EdgeDock::Top => "top",
        EdgeDock::Bottom => "bottom",
        EdgeDock::None => "",
    }
    .to_string()
}

#[tauri::command]
pub fn app_quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn window_hide_to_tray(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide()?;
    }
    Ok(())
}

#[tauri::command]
pub fn window_set_always_on_top(
    app: tauri::AppHandle,
    dock_state: State<'_, DockRuntimeState>,
    pinned: bool,
) -> Result<(), AppError> {
    dock_state.set_pinned(pinned);
    if pinned && dock_state.is_hidden() {
        show_main_window(&app, &dock_state)?;
    }
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(pinned)?;
    }
    Ok(())
}

#[tauri::command]
pub fn window_undock(dock_state: State<'_, DockRuntimeState>) {
    dock_state.undock();
}

#[tauri::command]
pub fn window_cancel_autohide(
    app: tauri::AppHandle,
    dock_state: State<'_, DockRuntimeState>,
) -> Result<(), AppError> {
    if dock_state.is_hidden() {
        show_main_window(&app, &dock_state)?;
    } else {
        dock_state.cancel_pending_hide();
    }
    Ok(())
}

#[tauri::command]
pub async fn window_set_geometry(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: i64,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
) -> Result<(), AppError> {
    state.notes.set_geometry(id, x, y, w, h)?;
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
        let _ = win.set_size(tauri::PhysicalSize::new(w as u32, h as u32));
    }
    Ok(())
}

#[tauri::command]
pub async fn window_apply_edge_dock(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    dock_state: State<'_, DockRuntimeState>,
    id: i64,
    mon_x: i32,
    mon_y: i32,
    mon_w: i32,
    mon_h: i32,
    win_x: i32,
    win_y: i32,
    win_w: i32,
    win_h: i32,
) -> Result<Option<String>, AppError> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized()? {
            dock_state.set_edge(None);
            return Ok(None);
        }
    }
    if dock_state.is_hidden() {
        return Ok(dock_state.edge().map(edge_label));
    }

    let mon = Rect {
        x: mon_x,
        y: mon_y,
        w: mon_w,
        h: mon_h,
    };
    let win = Rect {
        x: win_x,
        y: win_y,
        w: win_w,
        h: win_h,
    };
    let dock = detect_dock(mon, win);
    dock_state.set_edge(dock);
    let label = dock.map(edge_label);
    state
        .notes
        .set_edge_dock(id, dock.unwrap_or(EdgeDock::None))?;
    if let Some(edge) = dock {
        if let Some(window) = app.get_webview_window("main") {
            let (x, y) = snapped_position(mon, win, edge);
            window.set_position(tauri::PhysicalPosition::new(x, y))?;
        }
    }
    Ok(label)
}

#[tauri::command]
pub async fn window_hide_now(
    app: tauri::AppHandle,
    _state: State<'_, AppState>,
    _id: i64,
) -> Result<(), AppError> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub async fn window_show_all_hidden(
    app: tauri::AppHandle,
    _state: State<'_, AppState>,
    dock_state: State<'_, DockRuntimeState>,
) -> Result<(), AppError> {
    show_main_window(&app, &dock_state)
}

pub fn show_main_window<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    dock_state: &DockRuntimeState,
) -> Result<(), AppError> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    if let Some(edge) = dock_state.force_reveal() {
        if let Some(monitor) = window.current_monitor()? {
            let position = window.outer_position()?;
            let size = window.outer_size()?;
            let mon = Rect {
                x: monitor.position().x,
                y: monitor.position().y,
                w: monitor.size().width as i32,
                h: monitor.size().height as i32,
            };
            let win = Rect {
                x: position.x,
                y: position.y,
                w: size.width as i32,
                h: size.height as i32,
            };
            let (x, y) = snapped_position(mon, win, edge);
            window.set_position(tauri::PhysicalPosition::new(x, y))?;
        }
    }
    let _ = window.emit("tidbit://edge-shown", ());
    window.show()?;
    window.unminimize()?;
    window.set_focus()?;
    Ok(())
}

#[tauri::command]
pub async fn window_arm_autohide(
    app: tauri::AppHandle,
    dock_state: State<'_, DockRuntimeState>,
) -> Result<(), AppError> {
    if dock_state.is_pinned() || dock_state.edge().is_none() {
        return Ok(());
    }
    let Some(generation) = dock_state.try_arm_hide() else {
        return Ok(());
    };
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(700)).await;
        let state = app.state::<DockRuntimeState>();
        if !state.is_current(generation) {
            return;
        }
        if let Some(window) = app.get_webview_window("main") {
            let geometry = (|| -> Result<_, tauri::Error> {
                let Some(monitor) = window.current_monitor()? else {
                    return Ok(None);
                };
                let position = window.outer_position()?;
                let size = window.outer_size()?;
                let mon = Rect {
                    x: monitor.position().x,
                    y: monitor.position().y,
                    w: monitor.size().width as i32,
                    h: monitor.size().height as i32,
                };
                let win = Rect {
                    x: position.x,
                    y: position.y,
                    w: size.width as i32,
                    h: size.height as i32,
                };
                Ok(Some((mon, win)))
            })();
            if let Ok(Some((mon, win))) = geometry {
                if cursor_position().is_some_and(|(x, y)| cursor_inside_window(win, x, y)) {
                    state.cancel_pending_hide();
                    return;
                }
                if let Some(edge) = state.hide_if_current(generation) {
                    let hidden = hidden_position(mon, win, edge);
                    let _ = window.emit("tidbit://edge-hidden", edge_label(edge));
                    if !animate_window_position(&window, &state, generation, (win.x, win.y), hidden)
                        .await
                    {
                        return;
                    }

                    while state.is_hidden() {
                        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        let Some((cursor_x, cursor_y)) = cursor_position() else {
                            continue;
                        };
                        if cursor_hits_reveal_strip(mon, win, edge, cursor_x, cursor_y) {
                            let Some((reveal_generation, reveal_edge)) = state.begin_reveal()
                            else {
                                break;
                            };
                            let visible = snapped_position(mon, win, reveal_edge);
                            if animate_window_position(
                                &window,
                                &state,
                                reveal_generation,
                                hidden,
                                visible,
                            )
                            .await
                            {
                                state.finish_reveal(reveal_generation);
                                let _ = window.emit("tidbit://edge-shown", ());
                            }
                            break;
                        }
                    }
                }
            }
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn window_reveal_from_edge(
    app: tauri::AppHandle,
    dock_state: State<'_, DockRuntimeState>,
) -> Result<(), AppError> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let Some(monitor) = window.current_monitor()? else {
        return Ok(());
    };
    let position = window.outer_position()?;
    let size = window.outer_size()?;
    let mon = Rect {
        x: monitor.position().x,
        y: monitor.position().y,
        w: monitor.size().width as i32,
        h: monitor.size().height as i32,
    };
    let win = Rect {
        x: position.x,
        y: position.y,
        w: size.width as i32,
        h: size.height as i32,
    };
    let Some((generation, edge)) = dock_state.begin_reveal() else {
        return Ok(());
    };
    window.show()?;
    let visible = snapped_position(mon, win, edge);
    if animate_window_position(&window, &dock_state, generation, (win.x, win.y), visible).await {
        dock_state.finish_reveal(generation);
        let _ = window.emit("tidbit://edge-shown", ());
    }
    Ok(())
}
