import { Titlebar } from "./app/Titlebar";
import { GroupsSidebar } from "./features/groups/GroupsSidebar";
import { useState } from "react";

export default function App() {
  const [groupId, setGroupId] = useState<number | null>(null);
  return (
    <>
      <Titlebar />
      <div style={{ display: "flex" }}>
        <GroupsSidebar selectedId={groupId} onSelect={setGroupId} />
        <main style={{ flex: 1, padding: 16 }}>group: {groupId ?? "all"}</main>
      </div>
    </>
  );
}
