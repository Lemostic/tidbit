import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "../ipc/types";

const setStatus = vi.fn(async () => undefined);

vi.mock("../ipc/client", () => ({
  client: {
    notes: {
      setStatus: (...args: Parameters<typeof setStatus>) => setStatus(...args),
    },
  },
}));

import { KanbanBoard } from "../features/notes/KanbanBoard";
import "../styles/globals.css";

function note(id: number, status: "todo" | "doing" | "done"): Note {
  return {
    id,
    title: `便签${id}`,
    group_id: null,
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
    geom_w: 280,
    geom_h: 360,
    edge_dock: "none",
    created_at: 0,
    updated_at: 0,
    color: null,
    sort_order: id,
    status,
    tags: [],
    reminder: null,
  } as Note;
}

function dragData(id: number) {
  return {
    effectAllowed: "move",
    dropEffect: "move",
    setData: vi.fn(),
    getData: (type: string) => (type === "application/x-tidbit-note-id" ? String(id) : ""),
  };
}

describe("KanbanBoard", () => {
  beforeEach(() => {
    setStatus.mockClear();
  });

  it("moves a card between columns on drop and persists the status", async () => {
    const onChanged = vi.fn();
    render(<KanbanBoard notes={[note(1, "todo"), note(2, "doing")]} onNoteOpen={() => {}} onChanged={onChanged} onCreateNote={() => {}} />);

    const todoColumn = screen.getByText("待办").closest(".kanban-column")!;
    const doingColumn = screen.getByText("进行中").closest(".kanban-column")!;
    const card = todoColumn.querySelector<HTMLElement>(".kanban-card-wrap")!;

    fireEvent.dragStart(card, { dataTransfer: dragData(1) });
    fireEvent.dragOver(doingColumn, { dataTransfer: dragData(1) });
    expect(doingColumn.className).toContain("is-drop-target");

    fireEvent.drop(doingColumn, { dataTransfer: dragData(1) });
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith(1, "doing"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    // Optimistic move: the card renders in the target column immediately.
    expect(doingColumn.querySelectorAll(".kanban-card-wrap")).toHaveLength(2);
  });

  it("ignores drops that do not change the status", async () => {
    render(<KanbanBoard notes={[note(1, "todo")]} onNoteOpen={() => {}} onChanged={() => {}} onCreateNote={() => {}} />);
    const todoColumn = screen.getByText("待办").closest(".kanban-column")!;
    const card = todoColumn.querySelector<HTMLElement>(".kanban-card-wrap")!;

    fireEvent.dragStart(card, { dataTransfer: dragData(1) });
    fireEvent.drop(todoColumn, { dataTransfer: dragData(1) });
    await waitFor(() => expect(todoColumn.querySelectorAll(".kanban-card-wrap")).toHaveLength(1));
    expect(setStatus).not.toHaveBeenCalled();
  });
});
