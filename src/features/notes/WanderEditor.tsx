import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { client } from "../../ipc/client";
import type { Group, Note } from "../../ipc/types";
import { applyFontPreferences, loadFontPreferences } from "../../ui/fontPreferences";
import { appearanceChangedEvent, applyAppearance, loadAppearance, type AppearancePreferences } from "../../ui/appearance";
import { NoteEditor } from "./NoteEditor";

export function WanderEditor({ noteId }: { noteId: number }) {
  const [note, setNote] = useState<Note | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextNote, nextGroups] = await Promise.all([client.notes.get(noteId), client.groups.list()]);
      setNote(nextNote);
      setGroups(nextGroups);
      setError(false);
      await emit("tidbit://note-updated", { id: noteId });
    } catch {
      setError(true);
    }
  }, [noteId]);

  useEffect(() => {
    applyAppearance(loadAppearance());
    applyFontPreferences(loadFontPreferences());
    void refresh();
    let disposeAppearance: (() => void) | undefined;
    void listen<AppearancePreferences>(appearanceChangedEvent, (event) => applyAppearance(event.payload)).then((unlisten) => { disposeAppearance = unlisten; });
    return () => disposeAppearance?.();
  }, [refresh]);

  const close = () => void invoke("wander_editor_close", { noteId });
  if (error) return <main className="wander-editor-state">便签加载失败</main>;
  if (!note) return <main className="wander-editor-state">正在加载</main>;

  return (
    <main className="wander-editor-shell">
      <NoteEditor
        note={note}
        groups={groups}
        onClose={close}
        onChanged={() => void refresh()}
        onTrash={async () => undefined}
        allowTrash={false}
        desktopWindow
      />
    </main>
  );
}
