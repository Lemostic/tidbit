import { render, screen, fireEvent, act } from "@testing-library/react";
import { GroupsSidebar } from "../features/groups/GroupsSidebar";
import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Array<{ id: number; name: string; color: string | null; background_color: string | null; icon: string | null; sort_order: number; pinned: boolean; collapsed: boolean; created_at: number; updated_at: number }>;

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === "groups_list") return [...store];
    if (cmd === "groups_create") {
      const g = { id: 99, name: String(args?.name), color: "#3478D4", background_color: "#3478D4", icon: null, sort_order: 0, pinned: false, collapsed: false, created_at: 0, updated_at: 0 };
      store.push(g);
      return g;
    }
    if (cmd === "groups_delete") {
      store = store.filter((g) => g.id !== (args as { id: number }).id);
      return undefined;
    }
    if (cmd === "groups_update") {
      const target = store.find((g) => g.id === (args as { id: number }).id)!;
      target.name = String(args?.name);
      target.color = (args?.color as string | null) ?? null;
      target.background_color = (args?.backgroundColor as string | null) ?? null;
      return { ...target };
    }
    throw new Error(`Unexpected invoke: ${cmd}`);
  }),
}));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("GroupsSidebar", () => {
  beforeEach(() => {
    store = [
      { id: 1, name: "工作", color: "#f00", background_color: "#4c9a73", icon: null, sort_order: 0, pinned: false, collapsed: false, created_at: 0, updated_at: 0 },
      { id: 2, name: "生活", color: null, background_color: null, icon: null, sort_order: 1, pinned: false, collapsed: false, created_at: 0, updated_at: 0 },
    ];
  });

  it("renders 全部 plus each group tab", async () => {
    render(<GroupsSidebar selectedId={null} addRequest={0} onSelect={() => {}} onNotice={() => {}} />);
    await flush();
    expect(screen.getByText("全部")).toBeInTheDocument();
    expect(screen.getByText("工作")).toBeInTheDocument();
    expect(screen.getByText("生活")).toBeInTheDocument();
  });

  it("keeps four-character group names available without truncating the text node", async () => {
    store[0]!.name = "项目计划";
    render(<GroupsSidebar selectedId={null} addRequest={0} onSelect={() => {}} onNotice={() => {}} />);
    await flush();
    expect(screen.getByTitle("项目计划")).toHaveTextContent("项目计划");
  });

  it("marks the selected group active", async () => {
    render(<GroupsSidebar selectedId={1} addRequest={0} onSelect={() => {}} onNotice={() => {}} />);
    await flush();
    expect(screen.getByTitle("工作")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTitle("全部便签")).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect with the group id when a tab is clicked", async () => {
    const onSelect = vi.fn();
    render(<GroupsSidebar selectedId={null} addRequest={0} onSelect={onSelect} onNotice={() => {}} />);
    await flush();
    fireEvent.click(screen.getByTitle("生活"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("does not open group editing when the group tab is double-clicked", async () => {
    render(<GroupsSidebar selectedId={null} addRequest={0} onSelect={() => {}} onNotice={() => {}} />);
    await flush();
    fireEvent.doubleClick(screen.getByTitle("工作"));
    expect(screen.queryByRole("button", { name: "保存" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("编辑分组 工作"));
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  it("keeps the edit scrim mounted until the outside click completes", async () => {
    const onSelect = vi.fn();
    const { container } = render(<GroupsSidebar selectedId={null} addRequest={0} onSelect={onSelect} onNotice={() => {}} />);
    await flush();
    fireEvent.click(screen.getByLabelText("编辑分组 工作"));
    const scrim = container.querySelector(".modal-scrim")!;
    fireEvent.mouseDown(scrim);
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    fireEvent.click(scrim);
    expect(screen.queryByRole("button", { name: "保存" })).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("deletes a group after confirmation", async () => {
    render(<GroupsSidebar selectedId={null} addRequest={0} onSelect={() => {}} onNotice={() => {}} />);
    await flush();
    fireEvent.click(screen.getByLabelText("编辑分组 工作"));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除分组" }));
    await flush();
    expect(screen.queryByText("工作")).not.toBeInTheDocument();
  });

  it("resets selection to 全部 when the active group is deleted", async () => {
    const onSelect = vi.fn();
    render(<GroupsSidebar selectedId={1} addRequest={0} onSelect={onSelect} onNotice={() => {}} />);
    await flush();
    fireEvent.click(screen.getByLabelText("编辑分组 工作"));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除分组" }));
    await flush();
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("adds a group via the inline input", async () => {
    render(<GroupsSidebar selectedId={null} addRequest={0} onSelect={() => {}} onNotice={() => {}} />);
    await flush();
    fireEvent.click(screen.getByLabelText("新增分组"));
    const input = screen.getByLabelText("新分组名");
    fireEvent.change(input, { target: { value: "学习" } });
    fireEvent.submit(input.closest("form")!);
    await flush();
    expect(screen.getByText("学习")).toBeInTheDocument();
  });

  it("updates marker and background colors independently", async () => {
    render(<GroupsSidebar selectedId={1} addRequest={0} onSelect={() => {}} onNotice={() => {}} />);
    await flush();
    fireEvent.click(screen.getByLabelText("编辑分组 工作"));
    fireEvent.click(screen.getByLabelText("标记颜色 晴空蓝 #3478D4"));
    fireEvent.click(screen.getByLabelText("背景颜色 日光黄 #E6AE16"));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await flush();
    expect(store[0]!.color).toBe("#3478D4");
    expect(store[0]!.background_color).toBe("#E6AE16");
  });

  it("accepts a dragged note on another group", async () => {
    const onNoteDrop = vi.fn();
    render(<GroupsSidebar selectedId={1} addRequest={0} onSelect={() => {}} onNotice={() => {}} onNoteDrop={onNoteDrop} />);
    await flush();
    const dataTransfer = {
      dropEffect: "none",
      getData: (type: string) => type === "application/x-tidbit-note-id" ? "42" : "",
    };
    const target = screen.getByTitle("生活");
    fireEvent.dragOver(target, { dataTransfer });
    expect(target).toHaveClass("is-drop-target");
    fireEvent.drop(target, { dataTransfer });
    expect(onNoteDrop).toHaveBeenCalledWith(42, 2, "生活");
    expect(target).not.toHaveClass("is-drop-target");
  });
});
