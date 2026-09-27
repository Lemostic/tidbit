import {
  Archive,
  Eye,
  Folders,
  GearSix,
  Lock,
  NotePencil,
  Palette,
  SlidersHorizontal,
  ArrowsInLineVertical,
} from "@phosphor-icons/react";
import type { Command } from "./CommandPalette";

/** Each app command carries its own icon. Grouping by `group` alone rendered
 *  six unrelated actions (theme, docking, backup, folder, lock, hidden) as the
 *  same GearSix, which read as a repeated row rather than a command list. */
export function buildCommands(handlers: {
  newNote: () => void; newGroup: () => void; toggleTheme: () => void;
  toggleDocking: () => void; manualBackup: () => void; openBackups: () => void;
  lockNow: () => void; showHidden: () => void; openSettings: () => void;
}): Command[] {
  return [
    { id: "note.new", title: "新建便签", group: "note", icon: NotePencil, shortcut: "Ctrl+N", run: handlers.newNote },
    { id: "group.new", title: "新建分组", group: "group", icon: Folders, shortcut: "Ctrl+Shift+N", run: handlers.newGroup },
    { id: "app.theme", title: "切换主题", group: "app", icon: Palette, run: handlers.toggleTheme },
    { id: "app.dock", title: "切换吸附", group: "app", icon: ArrowsInLineVertical, run: handlers.toggleDocking },
    { id: "app.backup", title: "立即备份", group: "app", icon: Archive, run: handlers.manualBackup },
    { id: "app.backups", title: "打开备份目录", group: "app", icon: GearSix, run: handlers.openBackups },
    { id: "app.lock", title: "立即锁定", group: "app", icon: Lock, run: handlers.lockNow },
    { id: "app.hidden", title: "显示已隐藏便签", group: "app", icon: Eye, run: handlers.showHidden },
    { id: "app.settings", title: "设置", group: "app", icon: SlidersHorizontal, run: handlers.openSettings },
  ];
}
