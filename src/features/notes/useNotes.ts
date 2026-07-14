import { useCallback, useEffect, useState } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";
import { useI18n } from "../../i18n";

export function useNotes(groupId: number | null, includeArchived = false) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setNotes(await client.notes.list(groupId, includeArchived));
    } catch {
      setError(t("notes.readError"));
    } finally {
      setLoading(false);
    }
  }, [groupId, includeArchived, t]);

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
