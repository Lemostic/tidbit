import { invoke } from "@tauri-apps/api/core";
import { noteSchema, groupSchema } from "./schema";
import type { Note, Group } from "./types";

export const client = {
  notes: {
    list: (group_id: number | null, include_archived = false) =>
      invoke<Note[]>("notes_list", { groupId: group_id, includeArchived: include_archived }).then(arr =>
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
    updateTitle: (id: number, title: string) =>
      invoke<Note>("notes_update_title", { id, title }).then(n => noteSchema.parse(n)),
    setPinned: (id: number, pinned: boolean) =>
      invoke<Note>("notes_set_pinned", { id, pinned }).then(n => noteSchema.parse(n)),
    setArchived: (id: number, archived: boolean) =>
      invoke<Note>("notes_set_archived", { id, archived }).then(n => noteSchema.parse(n)),
    setContentHidden: (id: number, hidden: boolean) =>
      invoke<Note>("notes_set_content_hidden", { id, hidden }).then(n => noteSchema.parse(n)),
    setColor: (id: number, color: string | null) =>
      invoke<Note>("notes_set_color", { id, color }).then(n => noteSchema.parse(n)),
    moveGroup: (id: number, group_id: number | null) =>
      invoke<Note>("notes_move_group", { id, groupId: group_id }).then(n => noteSchema.parse(n)),
    reorder: (ids: number[]) => invoke<void>("notes_reorder", { ids }),
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
    update: (id: number, name: string, color: string | null, background_color: string | null) =>
      invoke<Group>("groups_update", { id, name, color, backgroundColor: background_color }).then(g => groupSchema.parse(g)),
    delete: (id: number) => invoke<void>("groups_delete", { id }),
  },
};
