import type { Note } from "../../ipc/types";

export type NoteSortField = "updated_at" | "created_at" | "title" | "manual";
export type NoteSortDirection = "asc" | "desc";

export interface NoteSortPreference {
  field: NoteSortField;
  direction: NoteSortDirection;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const storageKey = "note-sort-preference";
export const defaultNoteSort: NoteSortPreference = { field: "updated_at", direction: "desc" };
const fields: NoteSortField[] = ["updated_at", "created_at", "title"];
const directions: NoteSortDirection[] = ["asc", "desc"];
const titleCollator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

export function loadNoteSortPreference(storage: StorageLike = localStorage): NoteSortPreference {
  try {
    const parsed = JSON.parse(storage.getItem(storageKey) ?? "null") as Partial<NoteSortPreference> | null;
    if (parsed && fields.includes(parsed.field as NoteSortField) && directions.includes(parsed.direction as NoteSortDirection)) {
      return { field: parsed.field as NoteSortField, direction: parsed.direction as NoteSortDirection };
    }
  } catch {
    // Invalid or legacy preferences fall back to the documented default.
  }
  return defaultNoteSort;
}

export function saveNoteSortPreference(preference: NoteSortPreference, storage: StorageLike = localStorage) {
  storage.setItem(storageKey, JSON.stringify(preference));
}

function compareLayer(a: Note, b: Note) {
  if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
  return 0;
}

export function sortNotes(notes: Note[], preference: NoteSortPreference): Note[] {
  return [...notes].sort((a, b) => {
    const layer = compareLayer(a, b);
    if (layer !== 0) return layer;

    if (preference.field === "manual") {
      return a.sort_order - b.sort_order || b.updated_at - a.updated_at || a.id - b.id;
    }

    let value = 0;
    if (preference.field === "title") {
      value = titleCollator.compare(a.title?.trim() || "无标题", b.title?.trim() || "无标题");
    } else {
      value = a[preference.field] - b[preference.field];
    }
    if (value === 0) value = a.id - b.id;
    return preference.direction === "asc" ? value : -value;
  });
}
