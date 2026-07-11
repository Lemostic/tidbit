import { render, screen, fireEvent, act } from "@testing-library/react";
import { GroupsSidebar } from "../features/groups/GroupsSidebar";
import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Array<{ id: number; name: string; color: string | null; icon: string | null; sort_order: number; pinned: boolean; collapsed: boolean; created_at: number; updated_at: number }>;

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === "groups_list") return [...store];
    if (cmd === "groups_create") {
      const g = { id: 99, name: String(args?.name), color: null, icon: null, sort_order: 0, pinned: false, collapsed: false, created_at: 0, updated_at: 0 };
      store.push(g);
      return g;
    }
    if (cmd === "groups_delete") {
      store = store.filter((g) => g.id !== (args as { id: number }).id);
      return undefined;
    }
    throw new Error(`Unexpected invoke: ${cmd}`);
  }),
}));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("GroupsSidebar", () => {
  beforeEach(() => {
    store = [
      { id: 1, name: "工作", color: "#f00", icon: null, sort_order: 0, pinned: false, collapsed: false, created_at: 0, updated_at: 0 },
      { id: 2, name: "生活", color: null, icon: null, sort_order: 1, pinned: false, collapsed: false, created_at: 0, updated_at: 0 },
    ];
  });

  it("renders 全部 plus each group tab", async () => {
    render(<GroupsSidebar selectedId={null} onSelect={() => {}} />);
    await flush();
    expect(screen.getByText("全部")).toBeInTheDocument();
    expect(screen.getByText("工作")).toBeInTheDocument();
    expect(screen.getByText("生活")).toBeInTheDocument();
  });

  it("marks the selected group active", async () => {
    render(<GroupsSidebar selectedId={1} onSelect={() => {}} />);
    await flush();
    expect(screen.getByTitle("工作")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTitle("全部便签")).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect with the group id when a tab is clicked", async () => {
    const onSelect = vi.fn();
    render(<GroupsSidebar selectedId={null} onSelect={onSelect} />);
    await flush();
    fireEvent.click(screen.getByTitle("生活"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("deletes a group after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<GroupsSidebar selectedId={null} onSelect={() => {}} />);
    await flush();
    fireEvent.click(screen.getByLabelText("删除分组 工作"));
    await flush();
    expect(screen.queryByText("工作")).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("resets selection to 全部 when the active group is deleted", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onSelect = vi.fn();
    render(<GroupsSidebar selectedId={1} onSelect={onSelect} />);
    await flush();
    fireEvent.click(screen.getByLabelText("删除分组 工作"));
    await flush();
    expect(onSelect).toHaveBeenCalledWith(null);
    confirmSpy.mockRestore();
  });

  it("adds a group via the inline input", async () => {
    render(<GroupsSidebar selectedId={null} onSelect={() => {}} />);
    await flush();
    fireEvent.click(screen.getByLabelText("新增分组"));
    const input = screen.getByLabelText("新分组名");
    fireEvent.change(input, { target: { value: "学习" } });
    fireEvent.submit(input.closest("form")!);
    await flush();
    expect(screen.getByText("学习")).toBeInTheDocument();
  });
});
