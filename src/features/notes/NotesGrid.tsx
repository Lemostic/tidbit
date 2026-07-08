import { useNotes } from "./useNotes";
import { NoteCard } from "./NoteCard";
export function NotesGrid({ groupId }: { groupId: number | null }) {
  const { notes, create } = useNotes(groupId);
  return (
    <section>
      <button onClick={() => create("新便签")}>+ 新便签</button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, padding: 12 }}>
        {notes.map(n => <NoteCard key={n.id} note={n} />)}
      </div>
    </section>
  );
}
