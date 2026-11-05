import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { CoatHanger, GearSix, MagnifyingGlass, Minus, Square, X } from "@phosphor-icons/react";
import { useRef } from "react";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

interface TitlebarProps {
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onDragStart?: () => void;
  clotheslineOpen?: boolean;
  onToggleClothesline?: () => void;
}

export function Titlebar({ onOpenPalette, onOpenSettings, onDragStart, clotheslineOpen = false, onToggleClothesline }: TitlebarProps) {
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
      <strong className="titlebar__brand">
        <span className="titlebar__brand-mark" aria-hidden="true">T</span>
        <span className="titlebar__wordmark">tidbit</span>
        <span className="titlebar__brand-subtitle" aria-hidden="true">纸本工作台</span>
      </strong>
      <button
        onClick={onOpenPalette}
        className="titlebar__search"
        title="搜索 (Ctrl+K)"
      >
        <MagnifyingGlass size={13} aria-hidden="true" />
        <span>搜索</span>
        <span className="titlebar__kbd">Ctrl K</span>
      </button>
      <div className="titlebar__spacer" />
      <div className="titlebar__actions">
        <ThemeSwitcher />
        {onToggleClothesline && (
          <button
            className={`btn-icon${clotheslineOpen ? " is-active" : ""}`}
            aria-label="切换晾衣绳"
            aria-pressed={clotheslineOpen}
            title={clotheslineOpen ? "关闭晾衣绳" : "打开晾衣绳"}
            onClick={onToggleClothesline}
          ><CoatHanger size={15} weight={clotheslineOpen ? "fill" : "regular"} /></button>
        )}
        <button className="btn-icon" aria-label="设置" title="设置" onClick={onOpenSettings}>
          <GearSix size={15} weight="duotone" />
        </button>
        <span className="titlebar__rule" aria-hidden="true" />
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
