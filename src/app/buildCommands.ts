import type { Command } from "./CommandPalette";
import { formatShortcut, type DesktopProfile, windowsDesktopProfile } from "../desktop/DesktopProfile";
export function buildCommands(handlers: {
  newNote: () => void; newGroup: () => void; toggleTheme: () => void;
  toggleDocking: () => void; manualBackup: () => void; openBackups: () => void;
  lockNow: () => void; showHidden: () => void; openSettings: () => void;
}, profile: DesktopProfile = windowsDesktopProfile): Command[] {
  const commands: Command[] = [
    { id: "note.new", title: "新建便签", group: "note", shortcut: formatShortcut(profile.shortcutModifier, "N"), run: handlers.newNote },
    { id: "group.new", title: "新建分组", group: "group", shortcut: formatShortcut(profile.shortcutModifier, "N", true), run: handlers.newGroup },
    { id: "app.theme", title: "切换主题", group: "app", run: handlers.toggleTheme },
    { id: "app.backup", title: "立即备份", group: "app", run: handlers.manualBackup },
    { id: "app.backups", title: "打开备份目录", group: "app", run: handlers.openBackups },
    { id: "app.lock", title: "立即锁定", group: "app", run: handlers.lockNow },
    { id: "app.settings", title: "设置", group: "app", run: handlers.openSettings },
  ];
  if (profile.capabilities.edgeAutoHide) {
    commands.splice(commands.length - 1, 0, { id: "app.hidden", title: "显示已隐藏便签", group: "app", run: handlers.showHidden });
  }
  if (profile.capabilities.edgeDock) {
    commands.splice(3, 0, { id: "app.dock", title: "切换吸附", group: "app", run: handlers.toggleDocking });
  }
  return commands;
}
