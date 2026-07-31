import { describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
import {
  formatShortcut,
  isDockingEnabled,
  loadDesktopProfile,
  macDesktopProfile,
  windowsDesktopProfile,
} from "../desktop/DesktopProfile";

describe("desktop profiles", () => {
  it("keeps all Windows desktop capabilities enabled", () => {
    expect(windowsDesktopProfile).toMatchObject({
      os: "windows",
      windowChrome: "custom",
      shortcutModifier: "Ctrl",
      capabilities: {
        edgeDock: true,
        edgeAutoHide: true,
        autostart: true,
        directoryPicker: true,
        transparentWindows: true,
      },
    });
  });

  it("uses native chrome and disables unsafe edge hiding on macOS", () => {
    expect(macDesktopProfile).toMatchObject({
      os: "macos",
      windowChrome: "native",
      shortcutModifier: "Command",
      capabilities: {
        edgeDock: false,
        edgeAutoHide: false,
        autostart: true,
        directoryPicker: true,
        transparentWindows: true,
      },
    });
  });

  it("formats command shortcuts for each desktop modifier", () => {
    expect(formatShortcut("Ctrl", "K")).toBe("Ctrl+K");
    expect(formatShortcut("Command", "K")).toBe("⌘K");
    expect(formatShortcut("Command", "N", true)).toBe("⌘⇧N");
  });

  it("loads the native profile and falls back safely when IPC is unavailable", async () => {
    await expect(loadDesktopProfile(async () => macDesktopProfile)).resolves.toEqual(macDesktopProfile);
    await expect(loadDesktopProfile(async () => { throw new Error("browser"); })).resolves.toEqual(windowsDesktopProfile);
  });

  it("loads the startup profile through the desktop_profile IPC command", async () => {
    invoke.mockResolvedValueOnce(macDesktopProfile);

    await expect(loadDesktopProfile()).resolves.toEqual(macDesktopProfile);
    expect(invoke).toHaveBeenCalledWith("desktop_profile");
  });

  it("never enables docking when the desktop does not support it", () => {
    expect(isDockingEnabled(windowsDesktopProfile, true)).toBe(true);
    expect(isDockingEnabled(windowsDesktopProfile, false)).toBe(false);
    expect(isDockingEnabled(macDesktopProfile, true)).toBe(false);
  });
});
