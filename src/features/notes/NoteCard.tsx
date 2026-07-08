import { useEffect, useRef } from "react";
import type { Note } from "../../ipc/types";
import { useEdgeDock } from "../edge-docking/useEdgeDock";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";

export function NoteCard({ note }: { note: Note }) {
  const ref = useRef<HTMLDivElement>(null);
  const { dock, report } = useEdgeDock(note.id);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onUp = async () => {
      const mon = await currentMonitor();
      if (!mon) return;
      const wp = await getCurrentWindow().outerPosition();
      const ws = await getCurrentWindow().outerSize();
      await report({
        mon: { x: mon.position.x, y: mon.position.y, w: mon.size.width, h: mon.size.height },
        win: { x: wp.x, y: wp.y, w: ws.width, h: ws.height },
      });
    };

    el.addEventListener("mouseup", onUp);
    return () => el.removeEventListener("mouseup", onUp);
  }, [note.id, report]);

  return (
    <article
      ref={ref}
      data-dock={dock ?? "none"}
      style={{ background: "var(--note-bg, #fff7c2)", borderRadius: 8, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,.1)" }}
    >
      <header style={{ display: "flex", alignItems: "center", cursor: "move" }}>
        <strong>{note.title ?? "Untitled"}</strong>
      </header>
      <p>{note.content_md.slice(0, 120)}</p>
      <footer style={{ fontSize: 11, opacity: 0.7 }}>{note.word_count} words · #{note.id}</footer>
    </article>
  );
}
