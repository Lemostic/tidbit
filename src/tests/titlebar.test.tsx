import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Tauri window API before importing Titlebar
const { startDragging } = vi.hoisted(() => ({ startDragging: vi.fn(async () => undefined) }));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
    startDragging,
  }),
}));

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn(async () => undefined) }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { Titlebar } from "../app/Titlebar";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

test("renders window controls", () => {
  render(<Titlebar />);
  expect(screen.getByRole("button", { name: "置顶窗口" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "最小化" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "最大化" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
});

test("toggles native always-on-top and remembers the preference", async () => {
  invoke.mockResolvedValue(undefined);
  render(<Titlebar />);
  invoke.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "置顶窗口" }));

  expect(invoke).toHaveBeenCalledWith("window_set_always_on_top", { pinned: true });
  expect(await screen.findByRole("button", { name: "取消置顶" })).toHaveAttribute("aria-pressed", "true");
  expect(localStorage.getItem("window-always-on-top")).toBe("true");
});

test("close button quits the app instead of triggering close-to-tray", () => {
  render(<Titlebar />);
  fireEvent.click(screen.getByRole("button", { name: "关闭" }));
  expect(invoke).toHaveBeenCalledWith("app_quit");
});

test("minimize button hides the window to the system tray", () => {
  render(<Titlebar />);
  fireEvent.click(screen.getByRole("button", { name: "最小化" }));
  expect(invoke).toHaveBeenCalledWith("window_hide_to_tray");
});

test("uses programmatic dragging instead of broad native drag attributes", () => {
  const { container } = render(<Titlebar />);
  expect(container.querySelector(".titlebar")).not.toHaveAttribute("data-tauri-drag-region");
  expect(container.querySelector(".titlebar__brand")).not.toHaveAttribute("data-tauri-drag-region");
  expect(container.querySelector(".titlebar__spacer")).not.toHaveAttribute("data-tauri-drag-region");
});

test("starts native window dragging from titlebar whitespace", () => {
  const onDragStart = vi.fn();
  const { container } = render(<Titlebar onDragStart={onDragStart} />);
  fireEvent.pointerDown(container.querySelector(".titlebar__spacer")!, { button: 0 });
  expect(onDragStart).toHaveBeenCalledOnce();
  expect(startDragging).toHaveBeenCalledOnce();
});

test("does not treat titlebar buttons as window drags", () => {
  const onOpenSettings = vi.fn();
  const onDragStart = vi.fn();
  render(<Titlebar onOpenSettings={onOpenSettings} onDragStart={onDragStart} />);
  const settings = screen.getByRole("button", { name: "设置" });
  fireEvent.pointerDown(settings, { button: 0 });
  fireEvent.pointerUp(settings);
  fireEvent.click(settings);
  expect(onOpenSettings).toHaveBeenCalledOnce();
  expect(onDragStart).not.toHaveBeenCalled();
});
