import { getCurrentWindow } from "@tauri-apps/api/window";
import { GearSix, MagnifyingGlass } from "@phosphor-icons/react";
import { useRef } from "react";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";
import type { DesktopTitlebarProps } from "./WindowsTitlebar";

export function MacToolbar({ onOpenPalette, onOpenSettings, onDragStart }: DesktopTitlebarProps) {
  const win = getCurrentWindow();
  const dragStarted = useRef(false);

  const startWindowDrag = async () => {
    if (dragStarted.current) return;
    dragStarted.current = true;
    onDragStart?.();
    try {
      await win.startDragging();
    } finally {
      dragStarted.current = false;
    }
  };

  return (
    <header
      className="titlebar titlebar--macos"
      onPointerDown={(event) => {
        const interactive = (event.target as HTMLElement).closest("button, input, select, textarea, a, [role='button']");
        if (event.button !== 0 || interactive) return;
        event.preventDefault();
        void startWindowDrag();
      }}
    >
      <strong className="titlebar__brand">tidbit</strong>
      <button onClick={onOpenPalette} className="titlebar__search" title="搜索 (Command+K)">
        <MagnifyingGlass size={13} aria-hidden="true" />
        <span>搜索便签与命令</span>
        <span className="titlebar__kbd">⌘ K</span>
      </button>
      <div className="titlebar__spacer" />
      <div className="titlebar__actions">
        <ThemeSwitcher />
        <button className="btn-icon" aria-label="设置" title="设置" onClick={onOpenSettings}>
          <GearSix size={15} weight="duotone" />
        </button>
      </div>
    </header>
  );
}
