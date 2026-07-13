import { renderHook, act } from "@testing-library/react";
import { useNotes } from "../features/notes/useNotes";
import { describe, it, expect, vi } from "vitest";
import type { Note } from "../ipc/types";

const mockNotes: Note[] = [
  {
    id: 1,
    group_id: 1,
    title: "First Note",
    content_md: "This is the first note content.",
    content_html: "<p>This is the first note content.</p>",
    word_count: 5,
    is_pinned: false,
    is_content_hidden: false,
    is_archived: false,
    is_trashed: false,
    trashed_at: null,
    geom_x: null,
    geom_y: null,
    geom_w: 300,
    geom_h: 200,
    edge_dock: "none",
    created_at: 0,
    updated_at: 0,
    color: null,
    sort_order: 0,
  },
  {
    id: 2,
    group_id: 1,
    title: "Second Note",
    content_md: "Another note with more text here.",
    content_html: "<p>Another note with more text here.</p>",
    word_count: 6,
    is_pinned: false,
    is_content_hidden: false,
    is_archived: false,
    is_trashed: false,
    trashed_at: null,
    geom_x: null,
    geom_y: null,
    geom_w: 300,
    geom_h: 200,
    edge_dock: "none",
    created_at: 0,
    updated_at: 0,
    color: null,
    sort_order: 1000,
  },
];

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, _args?: Record<string, unknown>) => {
    if (cmd === "notes_list") {
      return [...mockNotes];
    }
    if (cmd === "notes_create") {
      const newNote: Note = {
        id: 3,
        group_id: (_args?.groupId as number | null | undefined) ?? null,
        title: "New Note",
        content_md: "",
        content_html: "",
        word_count: 0,
        is_pinned: false,
        is_content_hidden: false,
        is_archived: false,
        is_trashed: false,
        trashed_at: null,
        geom_x: null,
        geom_y: null,
        geom_w: 300,
        geom_h: 200,
        edge_dock: "none",
        created_at: Date.now(),
        updated_at: Date.now(),
        color: null,
        sort_order: -1000,
      };
      mockNotes.push(newNote);
      return newNote;
    }
    throw new Error(`Unexpected invoke: ${cmd}`);
  }),
}));

describe("useNotes", () => {
  it("lists notes for a group", async () => {
    const { result } = renderHook(() => useNotes(1));
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.notes.length).toBe(2);
    expect(result.current.notes[0]!.title).toBe("First Note");
  });

  it("requests archived notes only when enabled", async () => {
    const tauri = await import("@tauri-apps/api/core");
    const { rerender } = renderHook(({ include }) => useNotes(1, include), { initialProps: { include: false } });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(vi.mocked(tauri.invoke)).toHaveBeenCalledWith("notes_list", { groupId: 1, includeArchived: false });
    rerender({ include: true });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(vi.mocked(tauri.invoke)).toHaveBeenCalledWith("notes_list", { groupId: 1, includeArchived: true });
  });

  it("creates note and refreshes", async () => {
    const { result } = renderHook(() => useNotes(null));
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.notes.length).toBe(2);
    await act(async () => { await result.current.create("New Note"); });
    expect(result.current.notes.length).toBeGreaterThan(2);
  });
});
