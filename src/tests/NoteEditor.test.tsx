import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NoteEditor } from "../features/notes/NoteEditor";
import type { Note } from "../ipc/types";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const note: Note = {
  id: 1, group_id: null, title: "测试便签", content_md: "test content", content_html: "<p>test content</p>",
  word_count: 12, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false, trashed_at: null,
  geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none",
  created_at: 0, updated_at: 0, color: null, sort_order: 0,
};

beforeEach(() => invoke.mockReset());

it("renders note title and editor controls", () => {
  const { getByLabelText } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );
  expect(getByLabelText("便签标题")).toHaveValue("测试便签");
  expect(getByLabelText("便签内容")).toBeInTheDocument();
});

it("does not write or reorder a note when closed without changes", () => {
  const { unmount } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );
  unmount();
  expect(invoke).not.toHaveBeenCalledWith("notes_update_content", expect.anything());
});
