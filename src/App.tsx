import { Titlebar } from "./app/Titlebar";
import { GroupsSidebar } from "./features/groups/GroupsSidebar";
import { NotesGrid } from "./features/notes/NotesGrid";
import { RestoreWizard } from "./features/backup/RestoreWizard";
import { CommandPalette } from "./app/CommandPalette";
import { buildCommands } from "./app/buildCommands";
import { useState, useEffect } from "react";

export default function App() {
  const [groupId, setGroupId] = useState<number | null>(null);
  const [restorePath, setRestorePath] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const commands = buildCommands({
    newNote: () => { /* wired via NotesGrid */ },
    newGroup: () => { /* wired via GroupsSidebar */ },
    toggleTheme: () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; },
    toggleDocking: () => { /* TBD */ },
    manualBackup: () => { /* TBD */ },
    openBackups: () => { setRestorePath(""); },
    lockNow: () => { /* TBD */ },
    showHidden: () => { /* TBD */ },
    openSettings: () => { /* TBD */ },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        setPaletteOpen(true);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Titlebar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="app-body">
        <GroupsSidebar selectedId={groupId} onSelect={setGroupId} />
        <div className="app-main">
          <NotesGrid groupId={groupId} />
        </div>
      </div>
      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />
      {restorePath !== null && (
        <RestoreWizard
          onDone={() => {
            setRestorePath(null);
            location.reload();
          }}
        />
      )}
    </>
  );
}
