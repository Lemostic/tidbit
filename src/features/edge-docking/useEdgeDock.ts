import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useEdgeDock(noteId: number) {
  const [dock, setDock] = useState<string | null>(null);
  return {
    dock,
    report: async (r: { mon: Rect; win: Rect }) => {
      const label = await invoke<string | null>("window_apply_edge_dock", {
        id: noteId,
        monX: r.mon.x,
        monY: r.mon.y,
        monW: r.mon.w,
        monH: r.mon.h,
        winX: r.win.x,
        winY: r.win.y,
        winW: r.win.w,
        winH: r.win.h,
      });
      setDock(label);
    },
  };
}
