import { useState } from "react";
import { useNotes } from "./useNotes";
import { NoteCard } from "./NoteCard";
import { NoteEditor } from "./NoteEditor";
import { buildCommandRegistry } from "./noteCommands";
import type { Note } from "../../ipc/types";

// Use the command registry at module level (palette UI comes in T25)
void buildCommandRegistry(() => {});

export function NotesGrid({ groupId }: { groupId: number | null }) {
  const { notes, create } = useNotes(groupId);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  return (
    <>
      {editingNote && (
        <NoteEditor
          noteId={editingNote.id}
          initialMd={editingNote.content_md}
          onClose={() => setEditingNote(null)}
        />
      )}
      <section>
        <button onClick={() => create("新便签")}>+ 新便签</button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, padding: 12 }}>
          {notes.map(n => (
            <div key={n.id} onClick={() => setEditingNote(n)}>
              <NoteCard note={n} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
