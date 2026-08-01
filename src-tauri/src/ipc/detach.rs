use crate::error::AppError;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::{Manager, State};

#[tauri::command]
pub async fn note_detach_open(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    note_id: i64,
) -> Result<(), AppError> {
    let label = format!("detach-{note_id}");
    if let Some(window) = app.get_webview_window(&label) {
        window.show()?;
        window.set_focus()?;
        return Ok(());
    }
    let title = state
        .notes
        .get(note_id)?
        .title
        .unwrap_or_else(|| "无标题".into());
    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App(PathBuf::from("index.html")),
    )
    .title(&title)
    .inner_size(520.0, 680.0)
    .min_inner_size(420.0, 520.0)
    .decorations(true)
    .transparent(false)
    .shadow(true)
    .resizable(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .center();
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone())?;
    }
    builder.build()?;
    Ok(())
}

#[tauri::command]
pub async fn note_detach_close(app: tauri::AppHandle, note_id: i64) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window(&format!("detach-{note_id}")) {
        window.destroy()?;
    }
    Ok(())
}
