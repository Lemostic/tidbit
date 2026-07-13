use crate::domain::EdgeDock;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};

#[derive(Debug, Clone, Copy)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

pub const THRESHOLD_PX: i32 = 24;
pub const EDGE_REVEAL_PX: i32 = 12;
pub const EDGE_ANIMATION_MS: u64 = 500;

#[derive(Default)]
struct DockStatus {
    edge: Option<EdgeDock>,
    hidden: bool,
    revealing: bool,
    pinned: bool,
}

#[derive(Default)]
pub struct DockRuntimeState {
    status: Mutex<DockStatus>,
    generation: AtomicU64,
}

impl DockRuntimeState {
    pub fn set_edge(&self, edge: Option<EdgeDock>) {
        let mut status = self.status.lock().expect("dock state poisoned");
        status.edge = edge;
        status.hidden = false;
        status.revealing = false;
        self.generation.fetch_add(1, Ordering::SeqCst);
    }

    pub fn is_hidden(&self) -> bool {
        self.status.lock().expect("dock state poisoned").hidden
    }

    pub fn edge(&self) -> Option<EdgeDock> {
        self.status.lock().expect("dock state poisoned").edge
    }

    pub fn arm_hide(&self) -> u64 {
        self.generation.fetch_add(1, Ordering::SeqCst) + 1
    }

    pub fn try_arm_hide(&self) -> Option<u64> {
        let status = self.status.lock().expect("dock state poisoned");
        if status.pinned || status.hidden || status.revealing || status.edge.is_none() {
            return None;
        }
        Some(self.generation.fetch_add(1, Ordering::SeqCst) + 1)
    }

    pub fn cancel_pending_hide(&self) {
        let status = self.status.lock().expect("dock state poisoned");
        if !status.hidden && !status.revealing {
            self.generation.fetch_add(1, Ordering::SeqCst);
        }
    }

    pub fn hide_if_current(&self, generation: u64) -> Option<EdgeDock> {
        if self.generation.load(Ordering::SeqCst) != generation {
            return None;
        }
        let mut status = self.status.lock().expect("dock state poisoned");
        if status.pinned {
            return None;
        }
        status.hidden = status.edge.is_some();
        status.revealing = false;
        status.edge
    }

    pub fn begin_reveal(&self) -> Option<(u64, EdgeDock)> {
        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        let mut status = self.status.lock().expect("dock state poisoned");
        if !status.hidden || status.revealing {
            return None;
        }
        let edge = status.edge?;
        status.revealing = true;
        Some((generation, edge))
    }

    pub fn finish_reveal(&self, generation: u64) {
        if self.generation.load(Ordering::SeqCst) != generation {
            return;
        }
        let mut status = self.status.lock().expect("dock state poisoned");
        status.hidden = false;
        status.revealing = false;
    }

    pub fn force_reveal(&self) -> Option<EdgeDock> {
        self.generation.fetch_add(1, Ordering::SeqCst);
        let mut status = self.status.lock().expect("dock state poisoned");
        status.hidden = false;
        status.revealing = false;
        status.edge
    }

    pub fn set_pinned(&self, pinned: bool) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        let mut status = self.status.lock().expect("dock state poisoned");
        status.pinned = pinned;
        status.revealing = false;
    }

    pub fn is_pinned(&self) -> bool {
        self.status.lock().expect("dock state poisoned").pinned
    }

    pub fn undock(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        let mut status = self.status.lock().expect("dock state poisoned");
        status.edge = None;
        status.hidden = false;
        status.revealing = false;
    }

    pub fn is_current(&self, generation: u64) -> bool {
        self.generation.load(Ordering::SeqCst) == generation
    }
}

/// Returns the edge the window is nearest to, within THRESHOLD_PX.
pub fn detect_dock(mon: Rect, win: Rect) -> Option<EdgeDock> {
    if (win.x - mon.x).abs() <= THRESHOLD_PX {
        return Some(EdgeDock::Left);
    }
    if ((win.x + win.w - (mon.x + mon.w)) as i32).abs() <= THRESHOLD_PX {
        return Some(EdgeDock::Right);
    }
    if (win.y - mon.y).abs() <= THRESHOLD_PX {
        return Some(EdgeDock::Top);
    }
    if ((win.y + win.h - (mon.y + mon.h)) as i32).abs() <= THRESHOLD_PX {
        return Some(EdgeDock::Bottom);
    }
    None
}

pub fn snapped_position(mon: Rect, win: Rect, edge: EdgeDock) -> (i32, i32) {
    match edge {
        EdgeDock::Left => (mon.x, win.y),
        EdgeDock::Right => (mon.x + mon.w - win.w, win.y),
        EdgeDock::Top => (win.x, mon.y),
        EdgeDock::Bottom => (win.x, mon.y + mon.h - win.h),
        EdgeDock::None => (win.x, win.y),
    }
}

pub fn hidden_position(mon: Rect, win: Rect, edge: EdgeDock) -> (i32, i32) {
    match edge {
        EdgeDock::Left => (mon.x - win.w + EDGE_REVEAL_PX, win.y),
        EdgeDock::Right => (mon.x + mon.w - EDGE_REVEAL_PX, win.y),
        EdgeDock::Top => (win.x, mon.y - win.h + EDGE_REVEAL_PX),
        EdgeDock::Bottom => (win.x, mon.y + mon.h - EDGE_REVEAL_PX),
        EdgeDock::None => (win.x, win.y),
    }
}

pub fn cursor_hits_reveal_strip(mon: Rect, win: Rect, edge: EdgeDock, x: i32, y: i32) -> bool {
    match edge {
        EdgeDock::Left => x <= mon.x + EDGE_REVEAL_PX && y >= win.y && y <= win.y + win.h,
        EdgeDock::Right => x >= mon.x + mon.w - EDGE_REVEAL_PX && y >= win.y && y <= win.y + win.h,
        EdgeDock::Top => y <= mon.y + EDGE_REVEAL_PX && x >= win.x && x <= win.x + win.w,
        EdgeDock::Bottom => y >= mon.y + mon.h - EDGE_REVEAL_PX && x >= win.x && x <= win.x + win.w,
        EdgeDock::None => false,
    }
}

pub fn cursor_inside_window(win: Rect, x: i32, y: i32) -> bool {
    x >= win.x && x < win.x + win.w && y >= win.y && y < win.y + win.h
}

pub fn animated_position(from: (i32, i32), to: (i32, i32), progress: f64) -> (i32, i32) {
    let t = progress.clamp(0.0, 1.0);
    let eased = if t < 0.5 {
        4.0 * t * t * t
    } else {
        1.0 - (-2.0 * t + 2.0).powi(3) / 2.0
    };
    (
        (from.0 as f64 + (to.0 - from.0) as f64 * eased).round() as i32,
        (from.1 as f64 + (to.1 - from.1) as f64 * eased).round() as i32,
    )
}
