import type { Command } from "./CommandPalette";
import { translate } from "../i18n";
export function buildCommands(handlers: {
  newNote: () => void; newGroup: () => void; toggleTheme: () => void;
  toggleDocking: () => void; manualBackup: () => void; openBackups: () => void;
  lockNow: () => void; showHidden: () => void; openSettings: () => void;
}): Command[] {
  return [
    { id: "note.new", title: translate("commands.newNote"), group: "note", shortcut: "Ctrl+N", run: handlers.newNote },
    { id: "group.new", title: translate("commands.newGroup"), group: "group", shortcut: "Ctrl+Shift+N", run: handlers.newGroup },
    { id: "app.theme", title: translate("commands.theme"), group: "app", run: handlers.toggleTheme },
    { id: "app.dock", title: translate("commands.dock"), group: "app", run: handlers.toggleDocking },
    { id: "app.backup", title: translate("commands.backup"), group: "app", run: handlers.manualBackup },
    { id: "app.backups", title: translate("commands.backups"), group: "app", run: handlers.openBackups },
    { id: "app.lock", title: translate("commands.lock"), group: "app", run: handlers.lockNow },
    { id: "app.hidden", title: translate("commands.hidden"), group: "app", run: handlers.showHidden },
    { id: "app.settings", title: translate("commands.settings"), group: "app", run: handlers.openSettings },
  ];
}
