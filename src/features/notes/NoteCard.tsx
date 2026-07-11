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

  const excerpt = note.content_md.replace(/[#*`>_-]/g, "").trim();

  return (
    <div ref={ref} data-dock={dock ?? "none"}>
      <p className="note-card__title">{note.title ?? "无标题"}</p>
      {excerpt && <p className="note-card__excerpt">{excerpt.slice(0, 160)}</p>}
      <div className="note-card__meta mono">
        <span>{note.word_count} 字</span>
        <span>·</span>
        <span>#{note.id}</span>
      </div>
    </div>
  );
}
