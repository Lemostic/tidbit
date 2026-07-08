import { invoke } from "@tauri-apps/api/core";
import { noteSchema, groupSchema } from "./schema";
import type { Note, Group } from "./types";

export const client = {
  notes: {
    list: (group_id: number | null) =>
      invoke<Note[]>("notes_list", { groupId: group_id }).then(arr =>
        arr.map(n => noteSchema.parse(n))
      ),
    get: (id: number) =>
      invoke<Note>("notes_get", { id }).then(n => noteSchema.parse(n)),
    create: (group_id: number | null, title: string) =>
      invoke<Note>("notes_create", { groupId: group_id, title }).then(n =>
        noteSchema.parse(n)
      ),
    updateContent: (id: number, md: string, html: string, words: number) =>
      invoke<Note>("notes_update_content", { id, md, html, words }).then(n =>
        noteSchema.parse(n)
      ),
    setGeometry: (id: number, x: number, y: number, w: number, h: number) =>
      invoke<void>("notes_set_geometry", { id, x, y, w, h }),
    setEdgeDock: (id: number, edge: string) =>
      invoke<void>("notes_set_edge_dock", { id, edge }),
    trash: (id: number) => invoke<void>("notes_trash", { id }),
    restore: (id: number) => invoke<void>("notes_restore", { id }),
  },
  groups: {
    list: () =>
      invoke<Group[]>("groups_list").then(arr =>
        arr.map(g => groupSchema.parse(g))
      ),
    create: (name: string) =>
      invoke<Group>("groups_create", { name }).then(g => groupSchema.parse(g)),
  },
};
