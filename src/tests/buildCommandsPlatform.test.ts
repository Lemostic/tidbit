import { describe, expect, it, vi } from "vitest";
import { buildCommands } from "../app/buildCommands";
import { macDesktopProfile, windowsDesktopProfile } from "../desktop/DesktopProfile";

const handlers = {
  newNote: vi.fn(),
  newGroup: vi.fn(),
  toggleTheme: vi.fn(),
  toggleDocking: vi.fn(),
  manualBackup: vi.fn(),
  openBackups: vi.fn(),
  lockNow: vi.fn(),
  showHidden: vi.fn(),
  openSettings: vi.fn(),
};

describe("platform command presentation", () => {
  it("uses Ctrl labels and exposes docking on Windows", () => {
    const commands = buildCommands(handlers, windowsDesktopProfile);
    expect(commands.find((command) => command.id === "note.new")?.shortcut).toBe("Ctrl+N");
    expect(commands.some((command) => command.id === "app.dock")).toBe(true);
  });

  it("uses Command labels and removes unsupported docking on macOS", () => {
    const commands = buildCommands(handlers, macDesktopProfile);
    expect(commands.find((command) => command.id === "note.new")?.shortcut).toBe("⌘N");
    expect(commands.find((command) => command.id === "group.new")?.shortcut).toBe("⌘⇧N");
    expect(commands.some((command) => command.id === "app.dock")).toBe(false);
    expect(commands.some((command) => command.id === "app.hidden")).toBe(false);
  });
});
