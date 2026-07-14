use crate::error::AppError;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager};

const WANDER_WIDTH: i32 = 340;
const WANDER_HEIGHT: i32 = 360;
const WANDER_MARGIN: i32 = 100;
const WANDER_GAP: i32 = 16;
const WANDER_SNAP_DISTANCE: i32 = 14;
const WANDER_SNAP_DELAY: Duration = Duration::from_millis(350);
static WANDER_SNAP_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
static WANDER_MOVE_GENERATIONS: Lazy<Mutex<HashMap<String, u64>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

pub fn wander_position(monitor_x: i32, monitor_y: i32, index: usize) -> (i32, i32) {
    (
        monitor_x + WANDER_MARGIN + index as i32 * (WANDER_WIDTH + WANDER_GAP),
        monitor_y + WANDER_MARGIN,
    )
}

fn is_wander_window(label: &str) -> bool {
    label
        .strip_prefix("wander-")
        .and_then(|id| id.parse::<i64>().ok())
        .is_some()
}

/// Keeps desktop cards aligned while they are dragged. Both outer edges and
/// centers participate, so cards can form clean rows and columns.
pub fn snap_wander_window<R: tauri::Runtime>(window: &tauri::Window<R>) {
    if !is_wander_window(window.label()) || WANDER_SNAP_IN_PROGRESS.swap(true, Ordering::AcqRel) {
        return;
    }

    let result = (|| -> tauri::Result<()> {
        let position = window.outer_position()?;
        let size = window.outer_size()?;
        let width = size.width as i32;
        let height = size.height as i32;
        let mut next_x = position.x;
        let mut next_y = position.y;
        let mut best_x = WANDER_SNAP_DISTANCE + 1;
        let mut best_y = WANDER_SNAP_DISTANCE + 1;

        let mut candidates = Vec::new();
        if let Some(monitor) = window.current_monitor()? {
            let monitor_pos = monitor.position();
            let monitor_size = monitor.size();
            candidates.push((
                monitor_pos.x,
                monitor_pos.y,
                monitor_size.width as i32,
                monitor_size.height as i32,
            ));
        }
        for (label, other) in window.app_handle().webview_windows() {
            if label == window.label() || !is_wander_window(&label) {
                continue;
            }
            let other_pos = match other.outer_position() {
                Ok(value) => value,
                Err(_) => continue,
            };
            let other_size = match other.outer_size() {
                Ok(value) => value,
                Err(_) => continue,
            };
            candidates.push((
                other_pos.x,
                other_pos.y,
                other_size.width as i32,
                other_size.height as i32,
            ));
        }

        for (target_x, target_y, target_width, target_height) in candidates {
            let target_right = target_x + target_width;
            let target_bottom = target_y + target_height;
            let x_options = [
                target_x,
                target_right,
                target_x + (target_width - width) / 2,
                target_right - width,
            ];
            let y_options = [
                target_y,
                target_bottom,
                target_y + (target_height - height) / 2,
                target_bottom - height,
            ];
            for candidate in x_options {
                let distance = (position.x - candidate).abs();
                if distance < best_x {
                    best_x = distance;
                    next_x = candidate;
                }
            }
            for candidate in y_options {
                let distance = (position.y - candidate).abs();
                if distance < best_y {
                    best_y = distance;
                    next_y = candidate;
                }
            }
        }

        if best_x <= WANDER_SNAP_DISTANCE || best_y <= WANDER_SNAP_DISTANCE {
            let x = if best_x <= WANDER_SNAP_DISTANCE {
                next_x
            } else {
                position.x
            };
            let y = if best_y <= WANDER_SNAP_DISTANCE {
                next_y
            } else {
                position.y
            };
            if x != position.x || y != position.y {
                window.set_position(tauri::PhysicalPosition::new(x, y))?;
            }
        }
        Ok(())
    })();

    WANDER_SNAP_IN_PROGRESS.store(false, Ordering::Release);
    let _ = result;
}

/// Defers snapping until native window movement has stopped. Calling
/// `set_position` during the Windows move loop interrupts the mouse drag.
pub fn schedule_wander_snap<R: tauri::Runtime>(window: &tauri::Window<R>) {
    if !is_wander_window(window.label()) {
        return;
    }

    let label = window.label().to_string();
    let window = window.clone();
    let generation = {
        let Ok(mut generations) = WANDER_MOVE_GENERATIONS.lock() else {
            return;
        };
        let generation = generations.entry(label.clone()).or_default();
        *generation = generation.wrapping_add(1);
        *generation
    };

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(WANDER_SNAP_DELAY).await;
        let should_snap = {
            let Ok(mut generations) = WANDER_MOVE_GENERATIONS.lock() else {
                return;
            };
            if generations.get(&label).copied() != Some(generation) {
                false
            } else {
                generations.remove(&label);
                true
            }
        };
        if should_snap {
            snap_wander_window(&window);
        }
    });
}

fn wander_ids<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Vec<i64> {
    let mut ids = app
        .webview_windows()
        .keys()
        .filter_map(|label| label.strip_prefix("wander-")?.parse::<i64>().ok())
        .collect::<Vec<_>>();
    ids.sort_unstable();
    ids
}

#[tauri::command]
pub async fn wander_open(app: tauri::AppHandle, note_id: i64, opacity: u8, locale: Option<String>) -> Result<(), AppError> {
    let label = format!("wander-{note_id}");
    if let Some(window) = app.get_webview_window(&label) {
        window.show()?;
        window.unminimize()?;
        window.set_focus()?;
        return Ok(());
    }

    let _ = opacity.clamp(45, 100);
    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App(PathBuf::from("index.html")),
    )
    .title(if locale.as_deref().is_some_and(|value| value.starts_with("en")) { "Floating note" } else { "云游便签" })
    .inner_size(WANDER_WIDTH as f64, WANDER_HEIGHT as f64)
    .min_inner_size(260.0, 54.0)
    .decorations(false)
    .transparent(true)
    .shadow(true)
    .resizable(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false);
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone())?;
    }
    let window = builder.build()?;
    if let Some(monitor) = window.current_monitor()? {
        let index = wander_ids(&app).len().saturating_sub(1);
        let (x, y) = wander_position(monitor.position().x, monitor.position().y, index);
        window.set_position(tauri::PhysicalPosition::new(x, y))?;
    }
    let _ = app.emit("tidbit://wander-changed", note_id);
    Ok(())
}

#[tauri::command]
pub fn wander_ready(app: tauri::AppHandle, note_id: i64) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window(&format!("wander-{note_id}")) {
        window.show()?;
        window.set_focus()?;
    }
    Ok(())
}

#[tauri::command]
pub fn wander_close(app: tauri::AppHandle, note_id: i64) -> Result<(), AppError> {
    if let Some(editor) = app.get_webview_window(&format!("wander-editor-{note_id}")) {
        editor.destroy()?;
    }
    if let Some(window) = app.get_webview_window(&format!("wander-{note_id}")) {
        window.destroy()?;
    }
    let _ = app.emit("tidbit://wander-changed", note_id);
    Ok(())
}

#[tauri::command]
pub fn wander_list(app: tauri::AppHandle) -> Vec<i64> {
    wander_ids(&app)
}

#[tauri::command]
pub async fn wander_editor_open(
    app: tauri::AppHandle,
    note_id: i64,
    screen_x: i32,
    screen_y: i32,
) -> Result<(), AppError> {
    let label = format!("wander-editor-{note_id}");
    if let Some(window) = app.get_webview_window(&label) {
        window.show()?;
        window.set_focus()?;
        return Ok(());
    }
    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App(PathBuf::from("index.html")),
    )
    .title("编辑云游便签")
    .inner_size(430.0, 620.0)
    .min_inner_size(380.0, 500.0)
    .position(screen_x as f64, screen_y as f64)
    .decorations(false)
    .transparent(true)
    .shadow(true)
    .resizable(true)
    .always_on_top(true)
    .skip_taskbar(true);
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone())?;
    }
    builder.build()?;
    Ok(())
}

#[tauri::command]
pub fn wander_editor_close(app: tauri::AppHandle, note_id: i64) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window(&format!("wander-editor-{note_id}")) {
        window.destroy()?;
    }
    Ok(())
}

#[tauri::command]
pub fn wander_set_opacity(app: tauri::AppHandle, opacity: u8) {
    let _ = app.emit("tidbit://wander-opacity", opacity.clamp(45, 100));
}
