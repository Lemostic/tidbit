import { describe, expect, it } from "vitest";
import { defaultNoteSort, loadNoteSortPreference, saveNoteSortPreference, sortNotes, type NoteSortPreference } from "../features/notes/noteSort";
import type { Note } from "../ipc/types";

const note = (id: number, title: string, created_at: number, updated_at: number, extra: Partial<Note> = {}): Note => ({
  id, group_id: null, title, content_md: "", content_html: "", word_count: 0, is_pinned: false,
  is_archived: false, is_trashed: false, trashed_at: null, is_content_hidden: false, geom_x: null, geom_y: null,
  geom_w: 280, geom_h: 360, edge_dock: "none", created_at, updated_at, color: null, sort_order: 0,
  ...extra,
});

describe("note sorting", () => {
  const notes = [
    note(1, "Beta", 100, 300),
    note(2, "Alpha", 300, 100),
    note(3, "", 200, 200),
  ];

  it("defaults to update time descending", () => {
    expect(sortNotes(notes, defaultNoteSort).map((item) => item.id)).toEqual([1, 3, 2]);
  });

  it("supports creation time and title sorting", () => {
    expect(sortNotes(notes, { field: "created_at", direction: "desc" }).map((item) => item.id)).toEqual([2, 3, 1]);
    expect(sortNotes(notes, { field: "title", direction: "asc" }).map((item) => item.id)).toEqual([2, 1, 3]);
    expect(sortNotes(notes, { field: "title", direction: "desc" }).map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("keeps pinned notes first and archived notes last", () => {
    const mixed = [note(1, "A", 1, 1, { is_archived: true }), note(2, "B", 2, 2, { is_pinned: true }), note(3, "C", 3, 3)];
    expect(sortNotes(mixed, defaultNoteSort).map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it("persists a valid preference and ignores malformed values", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const preference: NoteSortPreference = { field: "title", direction: "desc" };
    saveNoteSortPreference(preference, storage);
    expect(loadNoteSortPreference(storage)).toEqual(preference);
    values.set("note-sort-preference", "not-json");
    expect(loadNoteSortPreference(storage)).toEqual(defaultNoteSort);
  });
});
