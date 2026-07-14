import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";
import { NotesGrid } from "../features/notes/NotesGrid";
import type { Note } from "../ipc/types";

const { invoke, notes, setNotes, refresh, create, trash } = vi.hoisted(() => {
  const makeNote = (id: number, title: string, sortOrder: number): Note => ({
    id,
    group_id: null,
    title,
    content_md: title,
    content_html: `<p>${title}</p>`,
    word_count: title.length,
    is_pinned: false,
    is_content_hidden: false,
    is_archived: false,
    is_trashed: false,
    trashed_at: null,
    geom_x: null,
    geom_y: null,
    geom_w: 280,
    geom_h: 360,
    edge_dock: "none",
    created_at: id,
    updated_at: id,
    color: null,
    sort_order: sortOrder,
  });
  return {
    invoke: vi.fn(async (command: string) => command === "wander_list" ? [] : undefined),
    notes: [makeNote(1, "第一条", 0), makeNote(2, "第二条", 1000)],
    setNotes: vi.fn(),
    refresh: vi.fn(async () => undefined),
    create: vi.fn(),
    trash: vi.fn(),
  };
});

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => undefined) }));
vi.mock("../features/notes/useNotes", () => ({
  useNotes: () => ({ notes, setNotes, loading: false, error: "", refresh, create, trash }),
}));
vi.mock("../features/groups/useGroups", () => ({ useGroups: () => ({ groups: [] }) }));

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

it("hides manual sorting and ignores a legacy manual preference", async () => {
  localStorage.setItem("note-sort-preference", JSON.stringify({ field: "manual", direction: "asc" }));
  const { container } = render(<NotesGrid groupId={null} createRequest={0} openNoteId={null} onOpenHandled={() => {}} onNotice={() => {}} refreshRequest={0} />);
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("wander_list"));

  const cards = Array.from(container.querySelectorAll<HTMLElement>(".note-card"));
  expect(cards).toHaveLength(2);
  expect(screen.getByLabelText("排序字段")).toHaveValue("updated_at");
  expect(screen.queryByRole("option", { name: "手动排序" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "拖动排序" })).not.toBeInTheDocument();
  expect(invoke).not.toHaveBeenCalledWith("notes_reorder", expect.anything());
});
