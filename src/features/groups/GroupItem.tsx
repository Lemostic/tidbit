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

function readableTextColor(color: string | null) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return "var(--rail-fg)";
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? "#20242a" : "#ffffff";
}

export function GroupItem({ group, selected, onClick, onEdit, onNoteDrop }: GroupItemProps) {
  const [dropActive, setDropActive] = useState(false);
  const backgroundColor = group.background_color ?? group.color ?? "var(--rail-bg)";
  const foregroundColor = readableTextColor(group.background_color ?? group.color);
  return (
    <div className={`group-tab-wrap${selected ? " is-active" : ""}`}>
      <button
        className={`group-tab${selected ? " is-active" : ""}${dropActive ? " is-drop-target" : ""}`}
        style={{ "--group-tab-bg": backgroundColor, "--group-tab-fg": foregroundColor } as CSSProperties}
        aria-selected={selected}
        title={group.name}
        onClick={onClick}
        onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropActive(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDropActive(false);
        }}
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
        <PencilSimple size={10} />
      </button>
    </div>
  );
}
