import { useState } from "react";
import { useGroups } from "./useGroups";
import { GroupItem } from "./GroupItem";

interface GroupsSidebarProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function GroupsSidebar({ selectedId, onSelect }: GroupsSidebarProps) {
  const { groups, create, remove } = useGroups();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await create(trimmed);
    setName("");
    setAdding(false);
  };

  const onDelete = async (id: number, groupName: string) => {
    if (!window.confirm(`删除分组「${groupName}」？分组内的便签会移动到「全部便签」。`)) return;
    await remove(id);
    if (selectedId === id) onSelect(null);
  };

  return (
    <nav className="groups-rail" aria-label="便签分组">
      <button
        className={`group-tab${selectedId === null ? " is-active" : ""}`}
        aria-selected={selectedId === null}
        title="全部便签"
        onClick={() => onSelect(null)}
      >
        <span className="group-tab__label">全部</span>
      </button>

      {groups.map((g) => (
        <GroupItem
          key={g.id}
          group={g}
          selected={selectedId === g.id}
          onClick={() => onSelect(g.id)}
          onDelete={() => onDelete(g.id, g.name)}
        />
      ))}

      {adding ? (
        <form onSubmit={submit}>
          <input
            className="groups-rail__new"
            autoFocus
            value={name}
            placeholder="名称"
            aria-label="新分组名"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (!name.trim()) setAdding(false); }}
            onKeyDown={(e) => { if (e.key === "Escape") { setName(""); setAdding(false); } }}
          />
        </form>
      ) : (
        <button
          className="groups-rail__add"
          aria-label="新增分组"
          title="新增分组"
          onClick={() => setAdding(true)}
        >
          +
        </button>
      )}
    </nav>
  );
}
