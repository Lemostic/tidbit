import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { NoteCard } from "../features/notes/NoteCard";
import { NoteEditor } from "../features/notes/NoteEditor";
import type { Note } from "../ipc/types";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
class ResizeObserverMock { observe() {} disconnect() {} }
beforeAll(() => { vi.stubGlobal("ResizeObserver", ResizeObserverMock); });
const note: Note = { id: 1, group_id: null, title: "发布", content_md: "", content_html: "", word_count: 0, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false, trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none", created_at: 0, updated_at: 0, color: null, sort_order: 0, tags: ["工作"] };
beforeEach(() => { invoke.mockReset(); invoke.mockResolvedValue(note); });
it("renders tags on note cards", () => {
  render(<NoteCard note={note} onOpen={() => {}} onTogglePin={() => {}} onToggleVisibility={() => {}} onToggleArchive={() => {}} onWander={() => {}} onTrash={() => {}} />);
  expect(screen.getByText("工作")).toBeInTheDocument();
});
it("adds a tag from the editor", async () => {
  invoke.mockResolvedValueOnce({ ...note, tags: ["工作", "紧急"] });
  render(<NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />);
  fireEvent.change(screen.getByLabelText("添加标签"), { target: { value: "紧急" } });
  fireEvent.keyDown(screen.getByLabelText("添加标签"), { key: "Enter" });
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("notes_set_tags", { id: 1, tags: ["工作", "紧急"] }));
});
