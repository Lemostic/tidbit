import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { macDesktopProfile, windowsDesktopProfile } from "../desktop/DesktopProfile";

const { startDragging } = vi.hoisted(() => ({ startDragging: vi.fn(async () => undefined) }));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    startDragging,
    toggleMaximize: vi.fn(),
  }),
}));

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { DesktopTitlebar } from "../app/DesktopTitlebar";

beforeEach(() => {
  vi.clearAllMocks();
});

test("renders the existing custom Windows controls for the Windows profile", () => {
  render(<DesktopTitlebar profile={windowsDesktopProfile} />);
  expect(screen.getByRole("button", { name: "最小化" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "最大化" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
});

test("uses native macOS controls and omits Windows window buttons", () => {
  render(<DesktopTitlebar profile={macDesktopProfile} />);
  expect(screen.queryByRole("button", { name: "最小化" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "最大化" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "关闭" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
});

test("starts dragging from macOS toolbar whitespace", () => {
  const onDragStart = vi.fn();
  const { container } = render(<DesktopTitlebar profile={macDesktopProfile} onDragStart={onDragStart} />);
  fireEvent.pointerDown(container.querySelector(".titlebar__spacer")!, { button: 0 });
  expect(onDragStart).toHaveBeenCalledOnce();
  expect(startDragging).toHaveBeenCalledOnce();
});
