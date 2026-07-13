import { PencilSimple } from "@phosphor-icons/react";
import { useState, type CSSProperties } from "react";
import type { Group } from "../../ipc/types";

interface GroupItemProps {
  group: Group;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onNoteDrop: (noteId: number, groupId: number) => void;
}

const noteDragType = "application/x-tidbit-note-id";

export function GroupItem({ group, selected, onClick, onEdit, onNoteDrop }: GroupItemProps) {
  const [dropActive, setDropActive] = useState(false);
  const backgroundColor = group.background_color ?? group.color ?? "var(--rail-bg)";
  return (
    <div className={`group-tab-wrap${selected ? " is-active" : ""}`}>
      <button
        className={`group-tab${selected ? " is-active" : ""}${dropActive ? " is-drop-target" : ""}`}
        style={{ "--group-tab-bg": backgroundColor } as CSSProperties}
        aria-selected={selected}
        title={group.name}
        onClick={onClick}
        onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropActive(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDropActive(false);
          const rawId = event.dataTransfer.getData(noteDragType) || event.dataTransfer.getData("text/plain");
          const noteId = Number(rawId);
          if (Number.isSafeInteger(noteId)) onNoteDrop(noteId, group.id);
        }}
      >
        <span className="group-tab__color" style={{ background: group.color ?? "transparent" }} />
        <span className="group-tab__label">{group.name}</span>
      </button>
      <button className="group-tab__edit" onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label={`编辑分组 ${group.name}`} title="编辑分组">
        <PencilSimple size={13} />
      </button>
    </div>
  );
}
