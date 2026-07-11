import { renderHook, act } from "@testing-library/react";
import { useGroups } from "../features/groups/useGroups";
import { describe, it, expect, vi } from "vitest";

const mockGroups = [
  {
    id: 1,
    name: "Inbox",
    color: null,
    icon: null,
    sort_order: 0,
    pinned: false,
    collapsed: false,
    created_at: 0,
    updated_at: 0,
  },
  {
    id: 2,
    name: "Work",
    color: null,
    icon: null,
    sort_order: 1,
    pinned: false,
    collapsed: false,
    created_at: 0,
    updated_at: 0,
  },
];

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, _args?: Record<string, unknown>) => {
    if (cmd === "groups_list") {
      return [...mockGroups];
    }
    if (cmd === "groups_create") {
      const newGroup = {
        id: 3,
        name: "NewGroup",
        color: null,
        icon: null,
        sort_order: 2,
        pinned: false,
        collapsed: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockGroups.push(newGroup);
      return newGroup;
    }
    if (cmd === "groups_delete") {
      const id = (_args as { id: number }).id;
      const idx = mockGroups.findIndex((g) => g.id === id);
      if (idx >= 0) mockGroups.splice(idx, 1);
      return undefined;
    }
    throw new Error(`Unexpected invoke: ${cmd}`);
  }),
}));

describe("useGroups", () => {
  it("lists groups", async () => {
    const { result } = renderHook(() => useGroups());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.groups.length).toBe(2);
    expect(result.current.groups[0].name).toBe("Inbox");
  });

  it("creates a group and refreshes", async () => {
    const { result } = renderHook(() => useGroups());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.groups.length).toBe(2);
    await act(async () => { await result.current.create("NewGroup"); });
    expect(result.current.groups.length).toBe(3);
  });

  it("removes a group and refreshes", async () => {
    const { result } = renderHook(() => useGroups());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    const before = result.current.groups.length;
    const targetId = result.current.groups[0]!.id;
    await act(async () => { await result.current.remove(targetId); });
    expect(result.current.groups.length).toBe(before - 1);
    expect(result.current.groups.some((g) => g.id === targetId)).toBe(false);
  });
});
