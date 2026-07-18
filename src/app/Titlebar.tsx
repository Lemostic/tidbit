import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { GearSix, MagnifyingGlass, Minus, Square, X } from "@phosphor-icons/react";
import { useRef } from "react";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

interface TitlebarProps {
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onDragStart?: () => void;
}

export function Titlebar({ onOpenPalette, onOpenSettings, onDragStart }: TitlebarProps) {
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
      className="titlebar"
      onPointerDown={(event) => {
        const interactive = (event.target as HTMLElement).closest("button, input, select, textarea, a, [role='button']");
        if (event.button !== 0 || interactive) return;
        event.preventDefault();
        void startWindowDrag();
      }}
    >
      <strong className="titlebar__brand">tidbit</strong>
      <button
        onClick={onOpenPalette}
        className="titlebar__search"
        title="搜索 (Ctrl+K)"
      >
        <MagnifyingGlass size={13} aria-hidden="true" />
        <span>搜索便签与命令</span>
        <span className="titlebar__kbd">Ctrl K</span>
      </button>
      <div className="titlebar__spacer" />
      <div className="titlebar__actions">
        <ThemeSwitcher />
        <button className="btn-icon" aria-label="设置" title="设置" onClick={onOpenSettings}>
          <GearSix size={15} weight="duotone" />
        </button>
        <button className="btn-icon" aria-label="最小化" title="最小化到托盘" onClick={() => void invoke("window_hide_to_tray")}>
          <Minus size={14} weight="bold" />
        </button>
        <button className="btn-icon" aria-label="最大化" title="最大化" onClick={() => win.toggleMaximize()}>
          <Square size={12} weight="bold" />
        </button>
        <button
          className="btn-icon is-danger"
          aria-label="关闭"
          title="退出应用"
          onClick={() => void invoke("app_quit")}
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </header>
  );
}
