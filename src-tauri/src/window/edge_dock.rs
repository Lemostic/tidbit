use crate::domain::EdgeDock;

#[derive(Debug, Clone, Copy)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

pub const THRESHOLD_PX: i32 = 24;

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
