import { useEffect, useState, useCallback } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";

export function useNotes(group_id: number | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const refresh = useCallback(() => client.notes.list(group_id).then(setNotes), [group_id]);
  useEffect(() => { refresh(); }, [refresh]);
  return { notes, refresh, create: (title: string) => client.notes.create(group_id, title).then(refresh) };
}
