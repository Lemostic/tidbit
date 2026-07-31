import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NoteEditor } from "../features/notes/NoteEditor";
import type { Note } from "../ipc/types";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
const note: Note = { id: 3, group_id: null, title: "回访", content_md: "", content_html: "", word_count: 0, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false, trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none", created_at: 0, updated_at: 0, color: null, sort_order: 0, reminder: null };
beforeEach(() => { invoke.mockReset(); invoke.mockResolvedValue(note); });
it("sets a reminder from the editor", async () => {
  render(<NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />);
  fireEvent.change(screen.getByLabelText("提醒时间"), { target: { value: "2030-01-02T10:30" } });
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("reminders_set", { id: 3, remindAt: new Date("2030-01-02T10:30").getTime() }));
});
