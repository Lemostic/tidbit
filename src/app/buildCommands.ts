import type { Command } from "./CommandPalette";
export function buildCommands(handlers: {
  newNote: () => void; newGroup: () => void; toggleTheme: () => void;
  toggleDocking: () => void; manualBackup: () => void; openBackups: () => void;
  lockNow: () => void; showHidden: () => void; openSettings: () => void;
}): Command[] {
  return [
    { id: "note.new", title: "新建便签", group: "note", shortcut: "Ctrl+N", run: handlers.newNote },
    { id: "group.new", title: "新建分组", group: "group", shortcut: "Ctrl+Shift+N", run: handlers.newGroup },
    { id: "app.theme", title: "切换主题", group: "app", run: handlers.toggleTheme },
    { id: "app.dock", title: "切换吸附", group: "app", run: handlers.toggleDocking },
    { id: "app.backup", title: "立即备份", group: "app", run: handlers.manualBackup },
    { id: "app.lock", title: "立即锁定", group: "app", run: handlers.lockNow },
    { id: "app.hidden", title: "显示已隐藏便签", group: "app", run: handlers.showHidden },
    { id: "app.settings", title: "设置", group: "app", run: handlers.openSettings },
  ];
}
