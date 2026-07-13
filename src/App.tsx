import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCommands } from "./app/buildCommands";
import { CommandPalette } from "./app/CommandPalette";
import { EdgePresence } from "./app/EdgePresence";
import { Titlebar } from "./app/Titlebar";
import { RestoreWizard } from "./features/backup/RestoreWizard";
import { useBackupStatus } from "./features/backup/useBackupStatus";
import { GroupsSidebar } from "./features/groups/GroupsSidebar";
import { NotesGrid } from "./features/notes/NotesGrid";
import { LockScreen } from "./features/settings/LockScreen";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { applyTheme, type Theme } from "./ui/theme";
import { Toast, type ToastState } from "./ui/Toast";
import { applyFontPreferences, loadFontPreferences, saveFontPreferences } from "./ui/fontPreferences";
import { client } from "./ipc/client";
import { loadGlassEffect, loadGlassOpacity, saveGlassEffect, saveGlassOpacity } from "./ui/glassEffect";
import { broadcastAppearance } from "./ui/appearance";

const themes: Theme[] = ["light", "dark", "sepia"];

interface DataDirectoryInfo {
  default_dir: string;
  active_dir: string;
  pending_dir: string | null;
}

export default function App() {
  const [groupId, setGroupId] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [createNoteRequest, setCreateNoteRequest] = useState(0);
  const [createGroupRequest, setCreateGroupRequest] = useState(0);
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [notesRefreshRequest, setNotesRefreshRequest] = useState(0);
  const [dockingEnabled, setDockingEnabled] = useState(() => localStorage.getItem("docking-enabled") !== "false");
  const [lockPin, setLockPin] = useState(() => localStorage.getItem("privacy-pin") ?? "");
  const [fonts, setFonts] = useState(loadFontPreferences);
  const [wanderOpacity, setWanderOpacity] = useState(() => Number(localStorage.getItem("wander-opacity") ?? "88"));
  const [glassEnabled, setGlassEnabled] = useState(loadGlassEffect);
  const [glassOpacity, setGlassOpacity] = useState(loadGlassOpacity);
  const [dataDirectory, setDataDirectory] = useState("");
  const [defaultDataDirectory, setDefaultDataDirectory] = useState("");
  const [dataDirectoryBusy, setDataDirectoryBusy] = useState(false);
  const [hiddenEdge, setHiddenEdge] = useState<"left" | "right" | "top" | "bottom" | null>(null);
  const backup = useBackupStatus();
  const interactionLocked = settingsOpen || paletteOpen || restoreOpen || locked;

  const openSettings = useCallback(() => {
    setPaletteOpen(false);
    setRestoreOpen(false);
    setSettingsOpen(true);
  }, []);

  const openPalette = useCallback(() => {
    setSettingsOpen(false);
    setRestoreOpen(false);
    setPaletteOpen(true);
  }, []);

  useEffect(() => {
    void invoke<DataDirectoryInfo>("data_directory_get").then((info) => {
      setDefaultDataDirectory(info.default_dir);
      setDataDirectory(info.pending_dir ?? info.active_dir);
    }).catch(() => undefined);
  }, []);

  const notify = useCallback((next: ToastState) => setToast(next), []);
  const requestNote = useCallback(() => setCreateNoteRequest((value) => value + 1), []);
  const requestGroup = useCallback(() => setCreateGroupRequest((value) => value + 1), []);
  const clearOpenNote = useCallback(() => setOpenNoteId(null), []);
  const moveNoteToGroup = useCallback(async (noteId: number, targetGroupId: number | null, groupName: string) => {
    try {
      await client.notes.moveGroup(noteId, targetGroupId);
      setNotesRefreshRequest((value) => value + 1);
      notify({ kind: "success", message: `便签已移动到「${groupName}」` });
    } catch {
      notify({ kind: "error", message: "移动便签失败" });
    }
  }, [notify]);

  useEffect(() => {
    let stopHidden: (() => void) | undefined;
    let stopShown: (() => void) | undefined;
    void listen<string>("tidbit://edge-hidden", (event) => {
      setHiddenEdge(event.payload as "left" | "right" | "top" | "bottom");
    }).then((dispose) => { stopHidden = dispose; });
    void listen("tidbit://edge-shown", () => setHiddenEdge(null)).then((dispose) => { stopShown = dispose; });
    return () => { stopHidden?.(); stopShown?.(); };
  }, []);

  useEffect(() => {
    applyFontPreferences(fonts);
  }, [fonts]);

  useEffect(() => {
    const key = "window-default-size-v3";
    if (localStorage.getItem(key)) return;
    void getCurrentWindow().setSize(new LogicalSize(500, 780)).then(() => {
      localStorage.setItem(key, "applied");
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setDocking = useCallback((enabled: boolean) => {
    setDockingEnabled(enabled);
    localStorage.setItem("docking-enabled", String(enabled));
    notify({ kind: "info", message: enabled ? "边缘吸附已开启" : "边缘吸附已关闭" });
  }, [notify]);

  const saveLockPin = useCallback((pin: string) => {
    setLockPin(pin);
    localStorage.setItem("privacy-pin", pin);
  }, []);

  const updateFonts = useCallback((next: typeof fonts) => {
    setFonts(next);
    saveFontPreferences(next);
  }, []);

  const updateWanderOpacity = useCallback((next: number) => {
    const opacity = Math.min(100, Math.max(45, next));
    setWanderOpacity(opacity);
    localStorage.setItem("wander-opacity", String(opacity));
    void invoke("wander_set_opacity", { opacity });
  }, []);

  const updateGlassEffect = useCallback((enabled: boolean) => {
    setGlassEnabled(enabled);
    saveGlassEffect(enabled);
    void broadcastAppearance().catch(() => undefined);
    notify({ kind: "info", message: enabled ? "液态玻璃已开启" : "液态玻璃已关闭" });
  }, [notify]);

  const updateGlassOpacity = useCallback((next: number) => {
    const opacity = Math.min(100, Math.max(55, next));
    setGlassOpacity(opacity);
    saveGlassOpacity(opacity);
    void broadcastAppearance().catch(() => undefined);
  }, []);

  const pickDataDirectory = useCallback(async () => {
    setDataDirectoryBusy(true);
    try {
      const selected = await invoke<string | null>("data_directory_pick");
      if (selected) setDataDirectory(selected);
    } catch {
      notify({ kind: "error", message: "无法打开目录选择器" });
    } finally {
      setDataDirectoryBusy(false);
    }
  }, [notify]);

  const saveDataDirectory = useCallback(async () => {
    if (!dataDirectory.trim()) {
      notify({ kind: "error", message: "数据目录不能为空" });
      return;
    }
    setDataDirectoryBusy(true);
    try {
      await invoke("data_directory_set", { path: dataDirectory.trim() });
    } catch {
      setDataDirectoryBusy(false);
      notify({ kind: "error", message: "数据目录不可写或迁移失败" });
    }
  }, [dataDirectory, notify]);

  const cycleTheme = useCallback(() => {
    const current = (localStorage.getItem("theme") as Theme) ?? "light";
    const next = themes[(themes.indexOf(current) + 1) % themes.length] ?? "light";
    applyTheme(next);
    localStorage.setItem("theme", next);
    window.dispatchEvent(new Event("tidbit-theme"));
  }, []);

  const snapshotNow = useCallback(async () => {
    setBusy(true);
    try {
      await backup.snapshotNow();
      notify({ kind: "success", message: "加密备份已创建" });
    } catch {
      notify({ kind: "error", message: "备份失败，请检查磁盘空间" });
    } finally { setBusy(false); }
  }, [backup, notify]);

  const openBackups = useCallback(async () => {
    try { await backup.openDirectory(); }
    catch { notify({ kind: "error", message: "无法打开备份目录" }); }
  }, [backup, notify]);

  const showHidden = useCallback(async () => {
    try {
      await invoke("window_show_all_hidden");
      notify({ kind: "success", message: "已显示隐藏窗口" });
    } catch { notify({ kind: "error", message: "显示窗口失败" }); }
  }, [notify]);

  const reportDocking = useCallback(async () => {
    if (!dockingEnabled || interactionLocked) return;
    try {
      const monitor = await currentMonitor();
      if (!monitor) return;
      const win = getCurrentWindow();
      const position = await win.outerPosition();
      const size = await win.outerSize();
      await invoke("window_apply_edge_dock", {
        id: 0,
        monX: monitor.position.x,
        monY: monitor.position.y,
        monW: monitor.size.width,
        monH: monitor.size.height,
        winX: position.x,
        winY: position.y,
        winW: size.width,
        winH: size.height,
      });
    } catch { /* Window metrics are unavailable in browser-based tests. */ }
  }, [dockingEnabled, interactionLocked]);

  const undockForDrag = useCallback(() => {
    if (!dockingEnabled) return;
    setHiddenEdge(null);
    void invoke("window_undock");
  }, [dockingEnabled]);

  useEffect(() => {
    if (!dockingEnabled || interactionLocked) return;
    const win = getCurrentWindow();
    let dispose: (() => void) | undefined;
    let timer: number | undefined;
    void win.onMoved(() => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void reportDocking(), 350);
    }).then((unlisten) => { dispose = unlisten; });
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      dispose?.();
    };
  }, [dockingEnabled, interactionLocked, reportDocking]);

  useEffect(() => {
    if (!dockingEnabled || interactionLocked) {
      if (interactionLocked) void invoke("window_cancel_autohide");
      return;
    }
    const root = document.documentElement;
    const armHide = () => { void invoke("window_arm_autohide"); };
    let lastCancel = 0;
    const cancelHide = () => {
      const now = performance.now();
      if (now - lastCancel < 80) return;
      lastCancel = now;
      void invoke("window_cancel_autohide");
    };
    root.addEventListener("mouseleave", armHide);
    root.addEventListener("mouseenter", cancelHide);
    root.addEventListener("pointermove", cancelHide);
    return () => {
      root.removeEventListener("mouseleave", armHide);
      root.removeEventListener("mouseenter", cancelHide);
      root.removeEventListener("pointermove", cancelHide);
    };
  }, [dockingEnabled, interactionLocked]);

  const commands = useMemo(() => buildCommands({
    newNote: requestNote,
    newGroup: requestGroup,
    toggleTheme: cycleTheme,
    toggleDocking: () => setDocking(!dockingEnabled),
    manualBackup: () => void snapshotNow(),
    openBackups: () => void openBackups(),
    lockNow: () => setLocked(true),
    showHidden: () => void showHidden(),
    openSettings,
  }), [cycleTheme, dockingEnabled, openBackups, openSettings, requestGroup, requestNote, setDocking, showHidden, snapshotNow]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const ctrl = event.ctrlKey || event.metaKey;
      if (!ctrl) return;
      const key = event.key.toLowerCase();
      if (key === "k") openPalette();
      else if (key === "n" && event.shiftKey) requestGroup();
      else if (key === "n") requestNote();
      else if (key === "b" && event.shiftKey) void snapshotNow();
      else if (key === "l") setLocked(true);
      else if (key === ",") openSettings();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    let unlisten: (() => void) | undefined;
    void listen("tidbit://hotkey/new-note", requestNote).then((dispose) => { unlisten = dispose; });
    return () => { window.removeEventListener("keydown", onKey); unlisten?.(); };
  }, [openPalette, openSettings, requestGroup, requestNote, snapshotNow]);

  return (
    <>
      <Titlebar onOpenPalette={openPalette} onOpenSettings={openSettings} onDragStart={undockForDrag} />
      <EdgePresence edge={hiddenEdge} />
      <div className="app-body">
        <GroupsSidebar selectedId={groupId} addRequest={createGroupRequest} onSelect={setGroupId} onNotice={notify} onNoteDrop={(noteId, targetGroupId, groupName) => void moveNoteToGroup(noteId, targetGroupId, groupName)} />
        <main className="app-main">
          <NotesGrid groupId={groupId} createRequest={createNoteRequest} openNoteId={openNoteId} onOpenHandled={clearOpenNote} onNotice={notify} refreshRequest={notesRefreshRequest} />
        </main>
      </div>

      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} onOpenNote={setOpenNoteId} />
      <SettingsPanel
        open={settingsOpen}
        dockingEnabled={dockingEnabled}
        lockPin={lockPin}
        busy={busy}
        fonts={fonts}
        wanderOpacity={wanderOpacity}
        glassEnabled={glassEnabled}
        glassOpacity={glassOpacity}
        onClose={() => setSettingsOpen(false)}
        onDockingChange={setDocking}
        onLockPinChange={saveLockPin}
        onFontsChange={updateFonts}
        onWanderOpacityChange={updateWanderOpacity}
        onGlassChange={updateGlassEffect}
        onGlassOpacityChange={updateGlassOpacity}
        onBackup={() => void snapshotNow()}
        onRestore={() => { setSettingsOpen(false); setRestoreOpen(true); }}
        onOpenBackups={() => void openBackups()}
        onShowHidden={() => void showHidden()}
        dataDirectory={dataDirectory}
        defaultDataDirectory={defaultDataDirectory}
        dataDirectoryBusy={dataDirectoryBusy}
        onDataDirectoryChange={setDataDirectory}
        onPickDataDirectory={() => void pickDataDirectory()}
        onSaveDataDirectory={() => void saveDataDirectory()}
        onResetDataDirectory={() => setDataDirectory(defaultDataDirectory)}
      />
      {restoreOpen && <RestoreWizard onDone={() => setRestoreOpen(false)} onClose={() => setRestoreOpen(false)} />}
      {locked && <LockScreen pin={lockPin} onUnlock={() => setLocked(false)} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
