import type { Group } from "../../ipc/types";

interface GroupItemProps {
  group: Group;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function GroupItem({ group, selected, onClick, onDelete }: GroupItemProps) {
  return (
    <button
      className={`group-tab${selected ? " is-active" : ""}`}
      aria-selected={selected}
      title={group.name}
      onClick={onClick}
    >
      <span className="group-tab__color" style={{ background: group.color ?? "transparent" }} />
      <span className="group-tab__label">{group.name}</span>
      <span
        role="button"
        aria-label={`删除分组 ${group.name}`}
        className="group-tab__delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        ×
      </span>
    </button>
  );
}
