import type { Note } from "../../ipc/types";
export function NoteCard({ note }: { note: Note }) {
  return (
    <article style={{ background: "var(--note-bg, #fff7c2)", borderRadius: 8, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,.1)" }}>
      <header style={{ display: "flex", alignItems: "center", cursor: "move" }}>
        <strong>{note.title ?? "Untitled"}</strong>
      </header>
      <p>{note.content_md.slice(0, 120)}</p>
      <footer style={{ fontSize: 11, opacity: .7 }}>{note.word_count} words · #{note.id}</footer>
    </article>
  );
}
