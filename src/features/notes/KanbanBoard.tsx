import "./KanbanBoard.css";
import { Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { Note } from "../../ipc/types";
import { client } from "../../ipc/client";
import { KanbanCard } from "./KanbanCard";

type KanbanStatus = "todo" | "doing" | "done";

const COLUMNS: { status: KanbanStatus; label: string; hint: string }[] = [
  { status: "todo", label: "待办", hint: "T" },
  { status: "doing", label: "进行中", hint: "D" },
  { status: "done", label: "已完成", hint: "X" },
];

interface KanbanBoardProps {
  notes: Note[];
  onNoteOpen: (note: Note) => void;
  onChanged: () => void;
  onCreateNote: (status: KanbanStatus) => void;
}

export function KanbanBoard({ notes, onNoteOpen, onChanged, onCreateNote }: KanbanBoardProps) {
  const [optimistic, setOptimistic] = useState<Map<number, KanbanStatus>>(new Map());
  const [dragId, setDragId] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<KanbanStatus | null>(null);

  // Sync optimistic map when upstream notes change.
  useEffect(() => {
    setOptimistic((current) => {
      const next = new Map<number, KanbanStatus>();
      notes.forEach((n) => {
        if (current.has(n.id) && current.get(n.id) === n.status) current.delete(n.id);
        if (current.has(n.id)) next.set(n.id, current.get(n.id)!);
      });
      return next;
    });
  }, [notes]);

  const effectiveStatus = (note: Note): KanbanStatus => optimistic.get(note.id) ?? (note.status ?? "todo");

  const grouped = useMemo(() => {
    const buckets: Record<KanbanStatus, Note[]> = { todo: [], doing: [], done: [] };
    notes.forEach((n) => {
      buckets[effectiveStatus(n)].push(n);
    });
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, optimistic]);

  const handleDragStart = (event: React.DragEvent<HTMLElement>, id: number) => {
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-tidbit-note-id", String(id));
  };

  const handleDragEnd = () => {
    setDragId(null);
    setHoverCol(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, status: KanbanStatus) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (hoverCol !== status) setHoverCol(status);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, target: KanbanStatus) => {
    event.preventDefault();
    setHoverCol(null);
    const raw = event.dataTransfer.getData("application/x-tidbit-note-id");
    const id = Number(raw);
    if (!Number.isSafeInteger(id)) return;
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    if (effectiveStatus(note) === target) return;
    setOptimistic((current) => {
      const next = new Map(current);
      next.set(id, target);
      return next;
    });
    try {
      await client.notes.setStatus(id, target);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[kanban] setStatus failed:", msg);
      setOptimistic((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => {
        const list = grouped[col.status];
        const isHover = hoverCol === col.status && dragId !== null;
        return (
          <div
            key={col.status}
            className={`kanban-column${isHover ? " is-drop-target" : ""}`}
            data-status={col.status}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={() => { if (hoverCol === col.status) setHoverCol(null); }}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <header className="kanban-column__head">
              <div className="kanban-column__title">
                <span className={`kanban-column__dot kanban-column__dot--${col.status}`} aria-hidden="true" />
                <span>{col.label}</span>
                <span className="kanban-column__count mono">{list.length}</span>
              </div>
              <button
                type="button"
                className="kanban-column__add"
                aria-label={`在 ${col.label} 新建便签`}
                title={`在 ${col.label} 新建便签`}
                onClick={() => onCreateNote(col.status)}
              ><Plus size={13} weight="bold" /></button>
            </header>
            <div className="kanban-column__list" data-empty={list.length === 0 ? "true" : "false"}>
              {list.length === 0 ? (
                <div className="kanban-column__placeholder">拖到此处</div>
              ) : (
                list.map((note) => (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onDragEnd={handleDragEnd}
                    className="kanban-card-wrap"
                  >
                    <KanbanCard
                      note={note}
                      dragging={dragId === note.id}
                      onClick={onNoteOpen}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
