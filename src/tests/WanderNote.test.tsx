import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { WanderNote } from "../features/notes/WanderNote";

const { invoke, setSize, listeners } = vi.hoisted(() => ({ invoke: vi.fn(), setSize: vi.fn(), listeners: new Map<string, (event: { payload: unknown }) => void>() }));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn(async () => undefined),
  listen: vi.fn(async (event: string, callback: (event: { payload: unknown }) => void) => {
    listeners.set(event, callback);
    return () => listeners.delete(event);
  }),
}));
vi.mock("@tauri-apps/api/window", () => ({
  LogicalSize: class { constructor(public width: number, public height: number) {} },
  getCurrentWindow: () => ({ setSize, outerPosition: vi.fn(async () => ({ x: 100, y: 100 })) }),
}));

beforeEach(() => {
  invoke.mockReset();
  setSize.mockReset();
  listeners.clear();
  localStorage.clear();
  document.documentElement.removeAttribute("data-liquid-glass");
  invoke.mockImplementation(async (command: string) => {
    if (command === "notes_get") return {
      id: 8, group_id: null, title: "桌面计划", content_md: "正文", content_html: "<p>正文</p>", word_count: 2,
      is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false, trashed_at: null,
      geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none", created_at: 0, updated_at: 0,
      color: null, sort_order: 0,
    };
    return undefined;
  });
});

it("follows the main window theme and liquid glass opacity", async () => {
  localStorage.setItem("theme", "dark");
  localStorage.setItem("liquid-glass-enabled", "true");
  localStorage.setItem("liquid-glass-opacity", "78");
  render(<WanderNote noteId={8} initialOpacity={88} />);
  await screen.findByText("桌面计划");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement).toHaveAttribute("data-liquid-glass");
  expect(document.documentElement.style.getPropertyValue("--liquid-glass-opacity")).toBe("78%");

  await waitFor(() => expect(listeners.has("tidbit://appearance-changed")).toBe(true));
  act(() => listeners.get("tidbit://appearance-changed")?.({ payload: { theme: "sepia", glassEnabled: true, glassOpacity: 86 } }));
  expect(document.documentElement.dataset.theme).toBe("sepia");
  expect(document.documentElement.style.getPropertyValue("--liquid-glass-opacity")).toBe("86%");
});

it("renders note content and working collapse and close controls", async () => {
  render(<WanderNote noteId={8} initialOpacity={88} />);
  expect(await screen.findByText("桌面计划")).toBeInTheDocument();
  expect(screen.getByText("正文")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "切换为编辑" }));
  expect(screen.getByRole("dialog", { name: "编辑便签" })).toHaveClass("note-editor--embedded");
  expect(screen.queryByRole("button", { name: "置顶" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "云游便签标题" })).toHaveValue("桌面计划");
  expect(screen.getByRole("button", { name: "切换为只读" })).toBeInTheDocument();
  expect(invoke).not.toHaveBeenCalledWith("wander_editor_open", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "折叠云游便签" }));
  expect(setSize).toHaveBeenCalledWith(expect.objectContaining({ width: 340, height: 62 }));
  fireEvent.click(screen.getByRole("button", { name: "关闭云游便签" }));
  expect(invoke).toHaveBeenCalledWith("wander_close", { noteId: 8 });
});
