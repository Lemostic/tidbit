import { useCallback, useEffect, useState } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";

export function useNotes(groupId: number | null, includeArchived = false) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setNotes(await client.notes.list(groupId, includeArchived));
    } catch {
      setError("无法读取便签，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [groupId, includeArchived]);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = async (title: string) => {
    const note = await client.notes.create(groupId, title);
    await refresh();
    return note;
  };

  const trash = async (id: number) => {
    await client.notes.trash(id);
    await refresh();
  };

  return { notes, setNotes, loading, error, refresh, create, trash };
}
