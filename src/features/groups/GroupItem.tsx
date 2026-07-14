import { PencilSimple } from "@phosphor-icons/react";
import { useState, type CSSProperties } from "react";
import type { Group } from "../../ipc/types";
import { readableTextColor } from "../../ui/colorPalette";
import { useI18n } from "../../i18n";

interface GroupItemProps {
  group: Group;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onNoteDrop: (noteId: number, groupId: number) => void;
}

const noteDragType = "application/x-tidbit-note-id";

export function GroupItem({ group, selected, onClick, onEdit, onNoteDrop }: GroupItemProps) {
  const { t } = useI18n();
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
      <button className="group-tab__edit" onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label={`${t("groups.edit")} ${group.name}`} title={t("groups.edit")}>
        <PencilSimple size={13} />
      </button>
    </div>
  );
}
