use crate::domain::EdgeDock;
use crate::error::AppError;
use crate::state::AppState;
use crate::window::edge_dock::{detect_dock, Rect};
use tauri::{Manager, State};

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
    let mon = Rect { x: mon_x, y: mon_y, w: mon_w, h: mon_h };
    let win = Rect { x: win_x, y: win_y, w: win_w, h: win_h };
    let dock = detect_dock(mon, win);
    let label = dock.map(|e| {
        match e {
            EdgeDock::Left => "left",
            EdgeDock::Right => "right",
            EdgeDock::Top => "top",
            EdgeDock::Bottom => "bottom",
            EdgeDock::None => "",
        }
        .to_string()
    });
    state
        .notes
        .set_edge_dock(id, dock.unwrap_or(EdgeDock::None))?;
    if let Some(d) = dock {
        if let Some(w) = app.get_webview_window("main") {
            let nx = if matches!(d, EdgeDock::Right) {
                mon_x + mon_w - win_w
            } else {
                win_x
            };
            let _ = w.set_position(tauri::PhysicalPosition::new(nx, win_y));
        }
    }
    Ok(label)
}
