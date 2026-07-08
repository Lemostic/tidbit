import { Titlebar } from "./app/Titlebar";
import { GroupsSidebar } from "./features/groups/GroupsSidebar";
import { NotesGrid } from "./features/notes/NotesGrid";
import { RestoreWizard } from "./features/backup/RestoreWizard";
import { useState } from "react";

export default function App() {
  const [groupId, setGroupId] = useState<number | null>(null);
  const [restorePath, setRestorePath] = useState<string | null>(null);
  return (
    <>
      <Titlebar />
      <div style={{ display: "flex" }}>
        <GroupsSidebar selectedId={groupId} onSelect={setGroupId} />
        <NotesGrid groupId={groupId} />
      </div>
      {restorePath && (
        <RestoreWizard
          onDone={(p) => {
            setRestorePath(null);
            location.reload();
          }}
        />
      )}
    </>
  );
}
