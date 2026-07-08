import { renderHook, act } from "@testing-library/react";
import { useEdgeDock } from "../features/edge-docking/useEdgeDock";
import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args: Record<string, unknown>) => {
    if (cmd === "window_apply_edge_dock") {
      const winX = args.winX as number;
      const monX = args.monX as number;
      const monW = args.monW as number;
      if (winX - monX <= 24) {
        return "left";
      }
      return null;
    }
    throw new Error(`Unexpected invoke: ${cmd}`);
  }),
}));

describe("useEdgeDock", () => {
  it("detects left dock", async () => {
    const { result } = renderHook(() => useEdgeDock(1));
    await act(async () => {
      await result.current.report({
        mon: { x: 0, y: 0, w: 1920, h: 1080 },
        win: { x: 6, y: 100, w: 280, h: 360 },
      });
    });
    expect(result.current.dock).toBe("left");
  });

  it("returns null when far from edges", async () => {
    const { result } = renderHook(() => useEdgeDock(1));
    await act(async () => {
      await result.current.report({
        mon: { x: 0, y: 0, w: 1920, h: 1080 },
        win: { x: 800, y: 400, w: 280, h: 360 },
      });
    });
    expect(result.current.dock).toBe(null);
  });
});
