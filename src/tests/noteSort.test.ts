import { expect, it, vi } from "vitest";
import type { Note } from "../ipc/types";
import { defaultNoteSort, loadNoteSortPreference, saveNoteSortPreference, sortNotes } from "../features/notes/noteSort";

function note(id: number, overrides: Partial<Note> = {}): Note {
  return {
    id,
    group_id: null,
    title: `Note ${id}`,
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
    created_at: id * 10,
    updated_at: id * 100,
    color: null,
    sort_order: id * 1000,
    ...overrides,
  };
}

it("defaults to updated time descending while keeping pinned notes first and archived notes last", () => {
  const notes = [
    note(1, { updated_at: 100 }),
    note(2, { updated_at: 300 }),
    note(3, { updated_at: 50, is_pinned: true }),
    note(4, { updated_at: 500, is_archived: true }),
  ];
  expect(sortNotes(notes, defaultNoteSort).map((item) => item.id)).toEqual([3, 2, 1, 4]);
});

it("sorts by creation time, title, and saved manual order", () => {
  const notes = [
    note(1, { title: "Beta", created_at: 300, sort_order: 2000 }),
    note(2, { title: "Alpha", created_at: 100, sort_order: 3000 }),
    note(3, { title: "Gamma", created_at: 200, sort_order: 1000 }),
  ];
  expect(sortNotes(notes, { field: "created_at", direction: "asc" }).map((item) => item.id)).toEqual([2, 3, 1]);
  expect(sortNotes(notes, { field: "title", direction: "asc" }).map((item) => item.id)).toEqual([2, 1, 3]);
  expect(sortNotes(notes, { field: "manual", direction: "desc" }).map((item) => item.id)).toEqual([3, 1, 2]);
});

it("persists one global preference and rejects invalid stored values", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
  saveNoteSortPreference({ field: "title", direction: "desc" }, storage);
  expect(loadNoteSortPreference(storage)).toEqual({ field: "title", direction: "desc" });
  values.set("note-sort-preference", "{broken");
  expect(loadNoteSortPreference(storage)).toEqual(defaultNoteSort);
});
