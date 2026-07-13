import { describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(async () => [
    {
      id: 1,
      group_id: null,
      title: "x",
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
      sort_order: 0,
    },
  ]),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { client } from "../ipc/client";

describe("IPC client", () => {
  it("notes.list parses and defaults to hiding archived notes", async () => {
    const notes = await client.notes.list(null);
    expect(notes[0]!.id).toBe(1);
    expect(notes[0]!.group_id).toBe(null);
    expect(invoke).toHaveBeenCalledWith("notes_list", { groupId: null, includeArchived: false });
  });
});
