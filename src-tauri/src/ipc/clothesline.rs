use crate::error::AppError;
use crate::repo::note_repo::NoteRepo;
use crate::state::AppState;
use crate::window::edge_dock::{cursor_inside_window, Rect};
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};

pub const CLOTHESLINE_LABEL: &str = "clothesline";
/// Default rope length when the monitor is unknown (cold start). Once we
/// query the monitor, the rope fills the screen minus a small margin.
pub const CLOTHESLINE_WIDTH: f64 = 1180.0;
pub const CLOTHESLINE_HEIGHT: f64 = 360.0;
/// Side margin kept on each edge of the screen so the rope nails never
/// touch the monitor border.
pub const CLOTHESLINE_EDGE_MARGIN: f64 = 22.0;
pub const CLOTHESLINE_PEEK_WIDTH: f64 = 248.0;
pub const CLOTHESLINE_PEEK_HEIGHT: f64 = 36.0;
pub const CLOTHESLINE_TOP_GAP: f64 = 6.0;
const HIDE_DELAY: Duration = Duration::from_millis(520);
const INITIAL_HIDE_DELAY: Duration = Duration::from_millis(1_600);
const ANIMATION_MS: u64 = 260;
const PEEK_POLL_MS: u64 = 80;

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

#[derive(Default)]
struct ClotheslineStatus {
    hidden: bool,
    revealing: bool,
}

static BOARD_STATUS: Lazy<Mutex<ClotheslineStatus>> =
    Lazy::new(|| Mutex::new(ClotheslineStatus::default()));
static BOARD_GENERATION: AtomicU64 = AtomicU64::new(0);

fn is_current(generation: u64) -> bool {
    BOARD_GENERATION.load(Ordering::SeqCst) == generation
}

fn arm_hide() -> Option<u64> {
    let status = BOARD_STATUS.lock().expect("clothesline status poisoned");
    if status.hidden || status.revealing {
        return None;
    }
    Some(BOARD_GENERATION.fetch_add(1, Ordering::SeqCst) + 1)
}

fn begin_hide(generation: u64) -> bool {
    if !is_current(generation) {
        return false;
    }
    let mut status = BOARD_STATUS.lock().expect("clothesline status poisoned");
    if status.hidden || status.revealing {
        return false;
    }
    status.hidden = true;
    true
}

fn begin_reveal() -> Option<u64> {
    let mut status = BOARD_STATUS.lock().expect("clothesline status poisoned");
    if !status.hidden || status.revealing {
        return None;
    }
    status.revealing = true;
    Some(BOARD_GENERATION.fetch_add(1, Ordering::SeqCst) + 1)
}

fn finish_reveal(generation: u64) -> bool {
    if !is_current(generation) {
        return false;
    }
    let mut status = BOARD_STATUS.lock().expect("clothesline status poisoned");
    status.hidden = false;
    status.revealing = false;
    true
}

fn force_show() {
    BOARD_GENERATION.fetch_add(1, Ordering::SeqCst);
    let mut status = BOARD_STATUS.lock().expect("clothesline status poisoned");
    status.hidden = false;
    status.revealing = false;
}

fn scaled(value: f64, scale_factor: f64) -> i32 {
    (value * scale_factor.max(1.0)).round() as i32
}

/// Visible and peek sizes for the top-centered clothesline window.
pub fn clothesline_sizes(monitor_width: i32, scale_factor: f64) -> ((i32, i32), (i32, i32)) {
    let scale = if scale_factor.is_finite() && scale_factor > 0.0 {
        scale_factor
    } else {
        1.0
    };
    let edge_margin = scaled(CLOTHESLINE_EDGE_MARGIN, scale);
    // Fill the whole monitor width minus a small edge margin so the rope reads
    // as a real clothesline spanning the desktop. Tiny monitors fall back to
    // a 320 px minimum so the rope still has room to render its cards.
    let target = monitor_width - edge_margin * 2;
    let visible_width = target.max(scaled(320.0, scale));
    (
        (visible_width, scaled(CLOTHESLINE_HEIGHT, scale)),
        (
            scaled(CLOTHESLINE_PEEK_WIDTH, scale).min(visible_width),
            scaled(CLOTHESLINE_PEEK_HEIGHT, scale),
        ),
    )
}

pub fn centered_top_position(mon: Rect, width: i32, gap: i32) -> (i32, i32) {
    (mon.x + (mon.w - width).max(0) / 2, mon.y + gap)
}

pub fn cursor_hits_clothesline_peek(
    mon: Rect,
    width: i32,
    height: i32,
    gap: i32,
    x: i32,
    y: i32,
) -> bool {
    let (left, top) = centered_top_position(mon, width, gap);
    cursor_inside_window(
        Rect {
            x: left,
            y: top,
            w: width,
            h: height,
        },
        x,
        y,
    )
}

fn monitor_rect<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> tauri::Result<Option<(Rect, f64)>> {
    let Some(monitor) = window.current_monitor()? else {
        return Ok(None);
    };
    let position = monitor.position();
    let size = monitor.size();
    Ok(Some((
        Rect {
            x: position.x,
            y: position.y,
            w: size.width as i32,
            h: size.height as i32,
        },
        monitor.scale_factor(),
    )))
}

fn main_monitor<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> tauri::Result<Option<(Rect, f64)>> {
    if let Some(main) = app.get_webview_window("main") {
        if let Some(monitor) = monitor_rect(&main)? {
            return Ok(Some(monitor));
        }
    }
    let Some(board) = app.get_webview_window(CLOTHESLINE_LABEL) else {
        return Ok(None);
    };
    monitor_rect(&board)
}

fn ease(progress: f64) -> f64 {
    let t = progress.clamp(0.0, 1.0);
    1.0 - (1.0 - t).powi(3)
}

fn interpolate(from: i32, to: i32, progress: f64) -> i32 {
    (from as f64 + (to - from) as f64 * progress).round() as i32
}

async fn animate_geometry<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
    generation: u64,
    from: (i32, i32, i32, i32),
    to: (i32, i32, i32, i32),
) -> bool {
    let started = Instant::now();
    let duration = Duration::from_millis(ANIMATION_MS);
    loop {
        if !is_current(generation) {
            return false;
        }
        let raw = (started.elapsed().as_secs_f64() / duration.as_secs_f64()).min(1.0);
        let progress = ease(raw);
        let width = interpolate(from.2, to.2, progress).max(1);
        let height = interpolate(from.3, to.3, progress).max(1);
        let x = interpolate(from.0, to.0, progress);
        let y = interpolate(from.1, to.1, progress);
        if window
            .set_size(tauri::PhysicalSize::new(width as u32, height as u32))
            .is_err()
            || window
                .set_position(tauri::PhysicalPosition::new(x, y))
                .is_err()
        {
            return false;
        }
        if raw >= 1.0 {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(16)).await;
    }
}

fn board_target_geometry(
    mon: Rect,
    scale: f64,
) -> ((i32, i32, i32, i32), (i32, i32, i32, i32), i32) {
    let (visible, peek) = clothesline_sizes(mon.w, scale);
    let gap = scaled(CLOTHESLINE_TOP_GAP, scale);
    let visible_pos = centered_top_position(mon, visible.0, gap);
    let peek_pos = centered_top_position(mon, peek.0, gap);
    (
        (visible_pos.0, visible_pos.1, visible.0, visible.1),
        (peek_pos.0, peek_pos.1, peek.0, peek.1),
        gap,
    )
}

fn current_geometry<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> tauri::Result<Option<(i32, i32, i32, i32)>> {
    let position = window.outer_position()?;
    let size = window.outer_size()?;
    Ok(Some((
        position.x,
        position.y,
        size.width as i32,
        size.height as i32,
    )))
}

async fn reveal_board<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), AppError> {
    let Some(window) = app.get_webview_window(CLOTHESLINE_LABEL) else {
        return Ok(());
    };
    let Some((mon, scale)) = main_monitor(app)? else {
        return Ok(());
    };
    let (visible, _, _) = board_target_geometry(mon, scale);
    let Some(generation) = begin_reveal() else {
        return Ok(());
    };
    let Some(from) = current_geometry(&window)? else {
        return Ok(());
    };
    let _ = app.emit("tidbit://clothesline-revealing", ());
    window.show()?;
    if animate_geometry(&window, generation, from, visible).await {
        finish_reveal(generation);
        let _ = app.emit("tidbit://clothesline-shown", ());
    }
    Ok(())
}

fn spawn_peek_reveal<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    mon: Rect,
    peek: (i32, i32),
    gap: i32,
    generation: u64,
) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_millis(PEEK_POLL_MS)).await;
            if !is_current(generation) {
                break;
            }
            let hidden = {
                let status = BOARD_STATUS.lock().expect("clothesline status poisoned");
                status.hidden && !status.revealing
            };
            if !hidden {
                break;
            }
            let Some((x, y)) = cursor_position() else {
                continue;
            };
            if cursor_hits_clothesline_peek(mon, peek.0, peek.1, gap, x, y) {
                let _ = reveal_board(&app).await;
                break;
            }
        }
    });
}

fn schedule_board_hide<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    delay: Duration,
) -> Result<(), AppError> {
    let Some(generation) = arm_hide() else {
        return Ok(());
    };
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(delay).await;
        if !is_current(generation) {
            return;
        }
        let Some(window) = app.get_webview_window(CLOTHESLINE_LABEL) else {
            return;
        };
        let Some((mon, scale)) = main_monitor(&app).ok().flatten() else {
            return;
        };
        let (_, peek, gap) = board_target_geometry(mon, scale);
        let Ok(Some(current)) = current_geometry(&window) else {
            return;
        };
        if cursor_position().is_some_and(|(x, y)| {
            cursor_inside_window(
                Rect {
                    x: current.0,
                    y: current.1,
                    w: current.2,
                    h: current.3,
                },
                x,
                y,
            )
        }) {
            return;
        }
        if !begin_hide(generation) {
            return;
        }
        let _ = app.emit("tidbit://clothesline-retracting", ());
        if animate_geometry(&window, generation, current, peek).await {
            let _ = app.emit("tidbit://clothesline-peeked", ());
            spawn_peek_reveal(app, mon, (peek.2, peek.3), gap, generation);
        }
    });
    Ok(())
}

fn show_visible<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    window: &tauri::WebviewWindow<R>,
) -> Result<(), AppError> {
    force_show();
    if let Some((mon, scale)) = main_monitor(app)? {
        let (visible, _, _) = board_target_geometry(mon, scale);
        window.set_size(tauri::PhysicalSize::new(visible.2 as u32, visible.3 as u32))?;
        window.set_position(tauri::PhysicalPosition::new(visible.0, visible.1))?;
    }
    window.show()?;
    let _ = app.emit("tidbit://clothesline-shown", ());
    schedule_board_hide(app.clone(), INITIAL_HIDE_DELAY)?;
    Ok(())
}

fn emit_changed<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let snapshot = HUNG_NOTES
        .lock()
        .map(|list| list.clone())
        .unwrap_or_default();
    let _ = app.emit("tidbit://clothesline-changed", snapshot);
}

/// Persisted ordering of note IDs hung on the clothesline. Frontend is the
/// source of truth (via localStorage); the backend mirrors the value so the
/// clothesline window can re-render immediately after a cold start and so
/// `clothesline_list` returns the latest ordering to the main window.
static HUNG_NOTES: Lazy<Mutex<Vec<i64>>> = Lazy::new(|| Mutex::new(Vec::new()));

#[tauri::command]
pub async fn clothesline_open(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window(CLOTHESLINE_LABEL) {
        show_visible(&app, &window)?;
        return Ok(());
    }

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        CLOTHESLINE_LABEL,
        tauri::WebviewUrl::App(std::path::PathBuf::from("index.html")),
    )
    .title("晾衣绳")
    .inner_size(CLOTHESLINE_WIDTH, CLOTHESLINE_HEIGHT)
    .min_inner_size(CLOTHESLINE_PEEK_WIDTH, CLOTHESLINE_PEEK_HEIGHT)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(true)
    .visible(false);

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone())?;
    }

    let window = builder.build()?;
    force_show();
    if let Some((mon, scale)) = main_monitor(&app)? {
        let (visible, _, _) = board_target_geometry(mon, scale);
        window.set_size(tauri::PhysicalSize::new(visible.2 as u32, visible.3 as u32))?;
        window.set_position(tauri::PhysicalPosition::new(visible.0, visible.1))?;
    }
    window.show()?;
    window.set_focus()?;
    emit_changed(&app);
    schedule_board_hide(app, INITIAL_HIDE_DELAY)?;
    Ok(())
}

#[tauri::command]
pub async fn clothesline_board_ready(app: tauri::AppHandle) -> Result<(), AppError> {
    let Some(window) = app.get_webview_window(CLOTHESLINE_LABEL) else {
        return Ok(());
    };
    show_visible(&app, &window)
}

#[tauri::command]
pub async fn clothesline_arm_hide(app: tauri::AppHandle) -> Result<(), AppError> {
    schedule_board_hide(app, HIDE_DELAY)
}

#[tauri::command]
pub async fn clothesline_reveal(app: tauri::AppHandle) -> Result<(), AppError> {
    reveal_board(&app).await
}

#[tauri::command]
pub fn clothesline_close(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window(CLOTHESLINE_LABEL) {
        window.destroy()?;
    }
    force_show();
    emit_changed(&app);
    Ok(())
}

#[tauri::command]
pub async fn clothesline_toggle(app: tauri::AppHandle) -> Result<bool, AppError> {
    if let Some(window) = app.get_webview_window(CLOTHESLINE_LABEL) {
        window.destroy()?;
        force_show();
        emit_changed(&app);
        return Ok(false);
    }
    clothesline_open(app).await?;
    Ok(true)
}

#[tauri::command]
pub fn clothesline_set_notes(app: tauri::AppHandle, note_ids: Vec<i64>) -> Result<(), AppError> {
    if let Ok(mut list) = HUNG_NOTES.lock() {
        *list = note_ids;
    }
    emit_changed(&app);
    Ok(())
}

#[tauri::command]
pub fn clothesline_list() -> Vec<i64> {
    HUNG_NOTES
        .lock()
        .map(|list| list.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn clothesline_is_open(app: tauri::AppHandle) -> bool {
    app.get_webview_window(CLOTHESLINE_LABEL).is_some()
}

/// Durable free horizontal position of one note on the clothesline, in scene
/// px. Kept for database compatibility with builds that allowed dragging.
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug, PartialEq)]
pub struct NotePosition {
    pub id: i64,
    pub x: f64,
}

pub fn sanitize_positions(positions: Vec<NotePosition>) -> Vec<NotePosition> {
    let mut seen = std::collections::HashSet::new();
    positions
        .into_iter()
        .filter(|position| position.id > 0 && position.x.is_finite() && seen.insert(position.id))
        .collect()
}

pub fn write_positions(
    repo: &NoteRepo,
    positions: Vec<NotePosition>,
) -> Result<Vec<NotePosition>, AppError> {
    let sanitized = sanitize_positions(positions);
    let pairs: Vec<(i64, f64)> = sanitized.iter().map(|p| (p.id, p.x)).collect();
    repo.set_clothesline_positions(&pairs)?;
    Ok(sanitized)
}

pub fn read_positions(repo: &NoteRepo) -> Result<Vec<NotePosition>, AppError> {
    Ok(repo
        .list_clothesline_positions()?
        .into_iter()
        .map(|(id, x)| NotePosition { id, x })
        .collect())
}

#[tauri::command]
pub fn clothesline_set_positions(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    positions: Vec<NotePosition>,
) -> Result<(), AppError> {
    let sanitized = write_positions(&state.notes, positions)?;
    let _ = app.emit("tidbit://clothesline-positions-changed", &sanitized);
    Ok(())
}

#[tauri::command]
pub fn clothesline_positions(state: State<'_, AppState>) -> Result<Vec<NotePosition>, AppError> {
    read_positions(&state.notes)
}
