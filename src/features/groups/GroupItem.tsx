import type { Group } from "../../ipc/types";

export function GroupItem({ group, selected, onClick }: { group: Group; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-selected={selected}
      style={{ background: selected ? "#def" : "transparent", padding: "6px 8px", borderRadius: 6, width: "100%", textAlign: "left" }}>
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: group.color ?? "#888", marginRight: 6 }} />
      {group.name}
    </button>
  );
}
