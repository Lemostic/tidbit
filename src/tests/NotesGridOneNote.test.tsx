import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesGrid } from "../features/notes/NotesGrid";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

const { note, useNotesValue, getNote, setContentHidden } = vi.hoisted(() => {
  const note = {
    id: 42,
    group_id: null,
    title: "最大化计划",
    content_md: "保留列表和编辑器",
    content_html: "<p>保留列表和编辑器</p>",
    word_count: 7,
    is_pinned: false,
    is_content_hidden: false,
    is_archived: false,
    is_trashed: false,
    trashed_at: null,
    geom_x: null,
    geom_y: null,
    geom_w: 280,
    geom_h: 360,
    edge_dock: "none" as const,
    created_at: 0,
    updated_at: 0,
    color: null,
    sort_order: 0,
    clothesline_x: null,
  };
  const secondNote = {
    ...note,
    id: 43,
    title: "第二张便签",
    content_md: "第二张便签的正文",
    content_html: "<p>第二张便签的正文</p>",
    sort_order: 1,
  };
  const getNote = vi.fn(async () => note);
  const setContentHidden = vi.fn(async () => note);
  return {
    note,
    getNote,
    setContentHidden,
    useNotesValue: {
      notes: [note, secondNote],
      setNotes: vi.fn(),
      loading: false,
      error: null,
      create: vi.fn(async () => note),
      trash: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
    },
  };
});

vi.mock("../features/notes/useNotes", () => ({
  useNotes: () => useNotesValue,
}));

vi.mock("../features/groups/useGroups", () => ({
  useGroups: () => ({ groups: [] }),
}));

vi.mock("../features/notes/NoteEditor", () => ({
  NoteEditor: () => <div data-testid="inline-editor" />,
}));

const { invoke, reorder } = vi.hoisted(() => ({
  invoke: vi.fn(),
  reorder: vi.fn(async () => undefined),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => undefined),
}));

vi.mock("../ipc/client", () => ({
  client: {
    notes: {
      get: getNote,
      moveGroup: vi.fn(async () => note),
      reorder,
      setArchived: vi.fn(async () => note),
      setContentHidden,
      setPinned: vi.fn(async () => note),
    },
  },
}));

beforeEach(() => {
  invoke.mockReset();
  reorder.mockClear();
  getNote.mockReset();
  getNote.mockImplementation(async () => note);
  setContentHidden.mockReset();
  setContentHidden.mockImplementation(async () => note);
  useNotesValue.trash.mockClear();
  invoke.mockImplementation(async (command: string) => {
    if (command === "wander_list" || command === "clothesline_list") return [];
    return undefined;
  });
});

describe("OneNote workspace", () => {
  it("keeps the note list visible while editing in the right pane", () => {
    render(
      <NotesGrid
        groupId={null}
        createRequest={0}
        openNoteId={null}
        onOpenHandled={vi.fn()}
        onNotice={vi.fn()}
        refreshRequest={0}
        oneNoteMode
      />,
    );

    expect(screen.getByText("选择一条便签")).toBeInTheDocument();
    expect(document.querySelector(".notes-workspace.is-one-note")).toBeInTheDocument();
    expect(document.querySelector(".notes--one-note-list")).toBeInTheDocument();

    fireEvent.click(screen.getByText("最大化计划"));

    expect(screen.getByTestId("inline-editor")).toBeInTheDocument();
    expect(screen.getByText("最大化计划")).toBeInTheDocument();
    expect(document.querySelector(".one-note-pane")).toBeInTheDocument();
  });

  it("renders a semantic list with the action rail and drag reorder wiring", async () => {
    render(
      <NotesGrid
        groupId={null}
        createRequest={0}
        openNoteId={null}
        onOpenHandled={vi.fn()}
        onNotice={vi.fn()}
        refreshRequest={0}
        oneNoteMode
      />,
    );

    const list = document.querySelector("ul.notes__list--one-note");
    expect(list).not.toBeNull();
    expect(list?.tagName).toBe("UL");

    const items = Array.from(list?.children ?? []) as HTMLLIElement[];
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.tagName === "LI")).toBe(true);

    const first = items[0];
    const second = items[1];
    if (!first || !second) throw new Error("expected two OneNote list items");

    for (const name of ["晾到绳上", "云游便签", "隐藏内容", "置顶", "归档便签", "删除便签"]) {
      expect(within(first).getByRole("button", { name })).toBeInTheDocument();
    }

    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      setData(type: string, value: string) { data.set(type, value); },
      getData(type: string) { return data.get(type) ?? ""; },
    };

    fireEvent.dragStart(first, { dataTransfer });
    expect(data.get("application/x-tidbit-note-id")).toBe("42");
    expect(data.get("text/plain")).toBe("42");

    fireEvent.click(within(first).getByText("最大化计划"));
    expect(screen.queryByTestId("inline-editor")).not.toBeInTheDocument();

    fireEvent.dragOver(second, { dataTransfer, clientY: 10 });
    fireEvent.drop(second, { dataTransfer, clientY: 10 });

    await waitFor(() => expect(reorder).toHaveBeenCalledWith([43, 42]));
    fireEvent.dragEnd(first, { dataTransfer });
  });

  it("refuses a hidden note opened through the command route", async () => {
    getNote.mockResolvedValueOnce({ ...note, is_content_hidden: true });
    const onNotice = vi.fn();

    render(
      <NotesGrid
        groupId={null}
        createRequest={0}
        openNoteId={42}
        onOpenHandled={vi.fn()}
        onNotice={onNotice}
        refreshRequest={0}
        oneNoteMode
      />,
    );

    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith({ kind: "info", message: "内容已隐藏，请先显示后再打开" }),
    );
    expect(screen.queryByTestId("inline-editor")).not.toBeInTheDocument();
  });

  it("closes the pane when the selected note is hidden", async () => {
    render(
      <NotesGrid
        groupId={null}
        createRequest={0}
        openNoteId={null}
        onOpenHandled={vi.fn()}
        onNotice={vi.fn()}
        refreshRequest={0}
        oneNoteMode
      />,
    );

    fireEvent.click(screen.getByText("最大化计划"));
    expect(screen.getByTestId("inline-editor")).toBeInTheDocument();

    const first = document.querySelector(".note-list-item") as HTMLElement;
    setContentHidden.mockResolvedValueOnce({ ...note, is_content_hidden: true });
    fireEvent.click(within(first).getByRole("button", { name: "隐藏内容" }));

    await waitFor(() => expect(screen.queryByTestId("inline-editor")).not.toBeInTheDocument());
  });

  it("closes the pane when the selected note starts wandering", async () => {
    let wandered = false;
    invoke.mockImplementation(async (command: string) => {
      if (command === "wander_open") {
        wandered = true;
        return undefined;
      }
      if (command === "wander_list") return wandered ? [42] : [];
      if (command === "clothesline_list") return [];
      return undefined;
    });

    render(
      <NotesGrid
        groupId={null}
        createRequest={0}
        openNoteId={null}
        onOpenHandled={vi.fn()}
        onNotice={vi.fn()}
        refreshRequest={0}
        oneNoteMode
      />,
    );

    fireEvent.click(screen.getByText("最大化计划"));
    expect(screen.getByTestId("inline-editor")).toBeInTheDocument();

    const first = document.querySelector(".note-list-item") as HTMLElement;
    fireEvent.click(within(first).getByRole("button", { name: "云游便签" }));

    await waitFor(() => expect(screen.queryByTestId("inline-editor")).not.toBeInTheDocument());
  });

  it("closes the pane after the selected note is deleted", async () => {
    render(
      <NotesGrid
        groupId={null}
        createRequest={0}
        openNoteId={null}
        onOpenHandled={vi.fn()}
        onNotice={vi.fn()}
        refreshRequest={0}
        oneNoteMode
      />,
    );

    fireEvent.click(screen.getByText("最大化计划"));
    expect(screen.getByTestId("inline-editor")).toBeInTheDocument();

    const first = document.querySelector(".note-list-item") as HTMLElement;
    fireEvent.click(within(first).getByRole("button", { name: "删除便签" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除便签" }));

    await waitFor(() => expect(screen.queryByTestId("inline-editor")).not.toBeInTheDocument());
    expect(useNotesValue.trash).toHaveBeenCalledWith(42);
  });

  it("does not reveal a hidden note title in the delete confirmation", () => {
    const originalNotes = useNotesValue.notes;
    useNotesValue.notes = [{ ...note, title: "机密计划", is_content_hidden: true }];

    try {
      render(
        <NotesGrid
          groupId={null}
          createRequest={0}
          openNoteId={null}
          onOpenHandled={vi.fn()}
          onNotice={vi.fn()}
          refreshRequest={0}
          oneNoteMode
        />,
      );

      const first = document.querySelector(".note-list-item") as HTMLElement;
      fireEvent.click(within(first).getByRole("button", { name: "删除便签" }));

      expect(screen.getByText("这条隐私便签将被移到回收站，可以稍后恢复。")).toBeInTheDocument();
      expect(screen.queryByText(/机密计划/)).not.toBeInTheDocument();
    } finally {
      useNotesValue.notes = originalNotes;
    }
  });
});
