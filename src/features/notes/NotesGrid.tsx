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
      <section className="notes">
        <div className="notes__head">
          <span className="notes__title">便签 <span className="mono">{notes.length}</span></span>
          <button className="btn btn-primary" onClick={() => create("新便签")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            新建
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="notes__empty">
            <div className="notes__empty-glyph">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M14 3v4h4M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="notes__empty-title">这里还没有便签</p>
              <p>点击右上角「新建」，记下第一条想法。</p>
            </div>
          </div>
        ) : (
          <div className="notes__body">
            <div className="notes__list">
              {notes.map((n, i) => (
                <div
                  key={n.id}
                  className="note-card"
                  style={{ "--i": i, "--card-accent": n.color ?? "var(--accent)" } as React.CSSProperties}
                  onClick={() => setEditingNote(n)}
                >
                  <NoteCard note={n} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
