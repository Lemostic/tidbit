import { useState } from "react";
import { useGroups } from "./useGroups";
import { GroupItem } from "./GroupItem";

export function GroupsSidebar({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number | null) => void }) {
  const { groups, create } = useGroups();
  const [name, setName] = useState("");
  return (
    <aside style={{ width: 260, borderRight: "1px solid #ddd", padding: 8 }}>
      <ul>
        <li><button onClick={() => onSelect(null)}>☆ 全部便签</button></li>
        {groups.map(g => <li key={g.id}><GroupItem group={g} selected={selectedId === g.id} onClick={() => onSelect(g.id)} /></li>)}
      </ul>
      <form onSubmit={async (e) => { e.preventDefault(); if (!name) return; await create(name); setName(""); }}>
        <input value={name} placeholder="新分组名" onChange={(e) => setName(e.target.value)} />
        <button type="submit">+</button>
      </form>
    </aside>
  );
}
